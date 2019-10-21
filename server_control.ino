#include <DNSServer.h>
#include <ESP8266WiFi.h>
#include "Config.h"

IPAddress accessPointIP(192, 168, 0, 1);
IPAddress netMask(255, 255, 255, 0);
DNSServer dnsServer;

const char HeaderUploadPlot[] PROGMEM = "HTTP/1.1 303 OK\r\nLocation:/plot\r\nCache-Control: no-cache\r\n";
const char UploadPlot[] PROGMEM = R"(<form method="POST" action="/plot" enctype="multipart/form-data">
     <input type="file" name="/wall-plotter.data"><input type="submit" value="Upload"></form>Upload a wall-plott.data)";

void initDNS() {
    Serial.println("Starting DNS-Server.");
    dnsServer.setErrorReplyCode(DNSReplyCode::NoError);
    dnsServer.start(53, "*", accessPointIP);
}

void initAccessPoint() {
    Serial.print("Starting AccessPoint: ");
    static char szSSID[12];
    sprintf(szSSID, "WallPlotter %02d", ESP.getChipId() % 100);
    Serial.println(szSSID);
    WiFi.mode(WIFI_STA);
    WiFi.disconnect();
    delay(100);
    bool exists = true;
    while(exists) {
        int n = WiFi.scanNetworks();
        exists = false;
        for (int i=0; i<n; i++) {
            String ssid = WiFi.SSID(i);
            if(strcmp(szSSID, ssid.c_str())==0)
                exists = true;
        }
        if(exists) {
            char accesPointInUse[50];
            sprintf(accesPointInUse, "AccessPoint '%s' in use, waiting...", szSSID);
            Serial.println(accesPointInUse);
            delay(5000);
        }
    }
    WiFi.mode(WIFI_AP);
    WiFi.softAPConfig(accessPointIP, accessPointIP, netMask);
    WiFi.softAP(szSSID);
    yield();
    WiFi.persistent(false);
    WiFi.begin();
    Serial.print("IP: ");
    Serial.println(WiFi.softAPIP());
}

void initServer() {
    int retries = 0;
    Serial.print("Connecting: ");
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    while ((WiFi.status() != WL_CONNECTED) && (retries < WIFI_INIT_RETRY)) {
        retries++;
        delay(1000);
        Serial.print(".");
    }
    Serial.println(WiFi.status() != WL_CONNECTED ? " failed" : " ok");
    if (WiFi.status() != WL_CONNECTED) {
        initDNS();
        initAccessPoint();
    } else {
        Serial.println(WiFi.localIP());
    }
    server.begin();
}

void getPlot() {
    if (SPIFFS.exists(UPLOAD_PLOT_FILENAME)) {
        File f = SPIFFS.open(UPLOAD_PLOT_FILENAME, "r");
        server.streamFile(f, "application/json");
        f.close();
    } else {
      server.send(404, "text/plain", "NotFound");
    }
}

bool postZoomFactor() {
    StaticJsonDocument<50> zoomJson;
    String body = server.arg("plain");
    if (DeserializationError error = deserializeJson(zoomJson, body)) {
        Serial.println("error parsing json");
        server.send(400);
        return false;
    }
    zoomFactor = zoomJson["zoomFactor"];
    server.send(201, "text/plain", "zoom:" + String(zoomFactor));
    writeConfig();

    return true;
}

bool postWlanSettings() {
    StaticJsonDocument<100> wlanJson;
    String body = server.arg("plain");
    if (DeserializationError error = deserializeJson(wlanJson, body)) {
        Serial.println("error parsing json");
        server.send(400);
        return false;
    }
    ssid = wlanJson["ssid"];
    password = wlanJson["password"];
    server.send(201, "text/plain", "wlan:" + String(ssid));
    writeConfig();
    initServer();

    return true;
}

bool postPlotterConfig() {
    Serial.println("postPlotterConfig");
    StaticJsonDocument<500> plotterConfigJson;
    String body = server.arg("plain");
    Serial.println(body);
    if (DeserializationError error = deserializeJson(plotterConfigJson, body)) {
        Serial.println("error parsing json");
        server.send(400);
        return false;
    }
    canvasWidth = plotterConfigJson["canvasWidth"];
    currentLeft = plotterConfigJson["currentLeft"];
    currentRight = plotterConfigJson["currentRight"];
    zoomFactor = plotterConfigJson["zoomFactor"];
    setOrigo();
    writeConfig();
    server.send(201, "application/json", configJson["plotter"]);

    return true;
}

void postFileUpload(){
    Serial.println("Upload.");
    static File fsUploadFile;
    HTTPUpload& upload = server.upload();
    if (upload.status == UPLOAD_FILE_START) {
        fsUploadFile = SPIFFS.open(UPLOAD_PLOT_FILENAME, "w");
    } else if (upload.status == UPLOAD_FILE_WRITE) {
        printf("Upload Data: %u\n", upload.currentSize);
        if (fsUploadFile)
            fsUploadFile.write(upload.buf, upload.currentSize);
    } else if (upload.status == UPLOAD_FILE_END) {
        if (fsUploadFile)
            fsUploadFile.close();
        printf("Upload Size: %u\n", upload.totalSize);
        server.sendContent(HeaderUploadPlot);
    }
}

void postPlotStop() {
    printing = false;
    server.send(200, "text/plain", "Plot stopped.");
}

void getUpload() {
    server.send(200, "text/html", UploadPlot);
}

void getRoot() {
    server.send(200, "text/html", configJson["plotter"]);
}

void postPlotStart() {
    server.send(200);
    if (!startPlot()) {
        server.send(404, "text/plain", "NotFound");
    }
}

void serverRouting() {
    server.on("/", HTTP_GET, getRoot);
    server.on("/plot", HTTP_POST, []() {}, postFileUpload);
    server.on("/plot", HTTP_GET, getPlot);
    server.on("/stop", HTTP_POST, postPlotStop);
    server.on("/start", HTTP_POST, postPlotStart);
    server.on("/zoomfactor", HTTP_POST, postZoomFactor);
    server.on("/wifi", HTTP_POST, postWlanSettings);
    server.on("/upload", HTTP_GET, getUpload);
    server.on("/config", HTTP_POST, postPlotterConfig);
}

void loop() {
    server.handleClient();
}

