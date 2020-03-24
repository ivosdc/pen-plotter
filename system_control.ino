#include "Config.h"


void initConfig() {
    configJson["server"]["ssid"] = ssid;
    configJson["server"]["password"] = password;
    configJson["plotter"]["zoomFactor"] = zoomFactor;
    serializeJson(configJson, configData);
}

bool setConfig() {
    StaticJsonDocument<1000> newConfigJson;
    char newConfigData[strlen(configData)];
    memcpy(newConfigData,configData, strlen(configData) + 1);
    if (DeserializationError error = deserializeJson(newConfigJson, newConfigData)) {
        Serial.println("error parsing json");
        return false;
    }
    ssid = newConfigJson["server"]["ssid"];
    password = newConfigJson["server"]["password"];
    zoomFactor = newConfigJson["plotter"]["zoomFactor"];
    initConfig();

    return true;
}

void initMotors() {
    motorLeft.setMaxSpeed(MOTOR_MAX_SPEED);
    motorRight.setMaxSpeed(MOTOR_MAX_SPEED);
    plotter.addStepper(motorLeft);
    plotter.addStepper(motorRight);
    servoPen.attach(SERVO_PIN);
    servoPen.write(PEN_UP);
}

void writeConfig() {
    initConfig();
    File f = SPIFFS.open("/config.json", "w");
    int bytesWritten = f.println(configData);
    f.close();
    if (bytesWritten > 0) {
        Serial.println("Config written");
    } else {
        Serial.println("Config write failed");
    }
}

bool handleFileRead(String path){
    Serial.println("handleFileRead: " + path);
    if(path.endsWith("/")) path += "index.html";
    String contentType = getContentType(path);
    String pathWithGz = path + ".gz";
    if(SPIFFS.exists(pathWithGz) || SPIFFS.exists(path)){
        if(SPIFFS.exists(pathWithGz))
            path += ".gz";
        File file = SPIFFS.open(path, "r");
        size_t sent = server.streamFile(file, contentType);
        file.close();
        Serial.println(String("\tSent file: ") + path);

        return true;
    }
    Serial.println(String("\tFile Not Found: ") + path);
  
    return false;
}

String getContentType(String filename){
    if(filename.endsWith(".html")) return "text/html";
        else if(filename.endsWith(".css")) return "text/css";
        else if(filename.endsWith(".js")) return "application/javascript";
        else if(filename.endsWith(".ico")) return "image/x-icon";
        else if(filename.endsWith(".gz")) return "application/x-gzip";
    
    return "text/plain";
}



void initFileSystem() {
    char configFile[1000];
    configFile[0] = 0;
    SPIFFS.begin();
    File f = SPIFFS.open("/config.json", "r");
    if (!f) {
        writeConfig();
    } else {
        f.readStringUntil('\n').toCharArray(configFile, 1000);
        f.close();
        if (strlen(configFile) == 0) {
            Serial.println("writing config.json");
            writeConfig();
        } else {
            Serial.println("config.json found:");
            memcpy(configData,configFile, strlen(configFile) + 1);
            setConfig();
        }
    }
}
