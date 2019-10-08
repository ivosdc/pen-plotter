#include <Servo.h>
#include <ArduinoJson.h>
#include <StepperMotor.h>
#include <ESP8266WebServer.h>


#define SERVO_PIN D9
#define WIFI_INIT_RETRY 10
#define PEN_UP 70
#define PEN_DOWN 25
#define STEPS_PER_TICK 10
#define SPOOL_CIRC 94.2 
#define STEPS_PER_ROTATION 4075.7728395
#define STEPS_PER_MM  (STEPS_PER_ROTATION / SPOOL_CIRC) / STEPS_PER_TICK



const char* ssid  = "SSID";
const char* password = "PASSWORD";
StepperMotor motorL(D1,D2,D3,D4); // IN1, IN2, IN3, IN4
StepperMotor motorR(D5, D6, D7, D8);
ESP8266WebServer server(80);

Servo servoPen;
StaticJsonDocument<10000> doc;
int motorSpeed = 3;
bool printing = true;
long canvasWidth = 1000;
long currentLeft = canvasWidth;
long currentRight = canvasWidth;
float centerX = canvasWidth / 2;;
float centerY = 866; //the height in the triangle
float zoom = 1.0;
static float lastX = 0;
static float lastY = 0;

char plotJson[] = "{\"lines\":[{\"points\":[{\"x\":\"243.98\",\"y\":\"202.51\"},{\"x\":\"6.00\",\"y\":\"-2.00\"},{\"x\":\"5.80\",\"y\":\"-7.39\"},{\"x\":\"-4.52\",\"y\":\"-7.10\"},{\"x\":\"-8.77\",\"y\":\"-3.81\"},{\"x\":\"-26.60\",\"y\":\"-8.78\"},{\"x\":\"-3.10\",\"y\":\"-22.43\"},{\"x\":\"4.09\",\"y\":\"-10.17\"},{\"x\":\"16.57\",\"y\":\"-6.44\"},{\"x\":\"12.55\",\"y\":\"2.22\"},{\"x\":\"2.81\",\"y\":\"0.50\"},{\"x\":\"7.51\",\"y\":\"1.21\"},{\"x\":\"1.66\",\"y\":\"2.24\"},{\"x\":\"1.38\",\"y\":\"1.87\"},{\"x\":\"-0.36\",\"y\":\"5.19\"},{\"x\":\"0.00\",\"y\":\"2.38\"},{\"x\":\"-8.59\",\"y\":\"-3.64\"},{\"x\":\"-10.00\",\"y\":\"-4.57\"},{\"x\":\"-9.41\",\"y\":\"3.47\"},{\"x\":\"-6.16\",\"y\":\"2.27\"},{\"x\":\"-5.21\",\"y\":\"7.11\"},{\"x\":\"4.11\",\"y\":\"6.32\"},{\"x\":\"7.34\",\"y\":\"9.28\"},{\"x\":\"23.81\",\"y\":\"4.64\"},{\"x\":\"6.55\",\"y\":\"7.12\"},{\"x\":\"0.95\",\"y\":\"2.49\"},{\"x\":\"-0.87\",\"y\":\"14.51\"},{\"x\":\"-6.63\",\"y\":\"10.76\"},{\"x\":\"-17.36\",\"y\":\"3.77\"},{\"x\":\"-12.53\",\"y\":\"-0.53\"},{\"x\":\"-3.06\",\"y\":\"-2.62\"},{\"x\":\"-7.11\",\"y\":\"-1.31\"},{\"x\":\"-1.81\",\"y\":\"-2.58\"},{\"x\":\"-1.38\",\"y\":\"-1.96\"},{\"x\":\"0.36\",\"y\":\"-5.08\"},{\"x\":\"0.00\",\"y\":\"-2.45\"},{\"x\":\"10.03\",\"y\":\"4.31\"},{\"x\":\"9.75\",\"y\":\"5.12\"},{\"x\":\"11.22\",\"y\":\"-3.65\"}]},{\"points\":[{\"x\":\"-193.00\",\"y\":\"-64.78\"},{\"x\":\"9.32\",\"y\":\"26.00\"},{\"x\":\"13.68\",\"y\":\"35.00\"},{\"x\":\"15.32\",\"y\":\"-42.00\"},{\"x\":\"1.23\",\"y\":\"-3.32\"},{\"x\":\"4.13\",\"y\":\"-12.19\"},{\"x\":\"2.02\",\"y\":\"-1.89\"},{\"x\":\"2.27\",\"y\":\"-2.14\"},{\"x\":\"5.03\",\"y\":\"0.54\"},{\"x\":\"3.00\",\"y\":\"0.00\"},{\"x\":\"0.00\",\"y\":\"0.00\"},{\"x\":\"-21.19\",\"y\":\"56.00\"},{\"x\":\"0.00\",\"y\":\"0.00\"},{\"x\":\"-2.08\",\"y\":\"5.47\"},{\"x\":\"-1.94\",\"y\":\"10.91\"},{\"x\":\"-6.81\",\"y\":\"0.56\"},{\"x\":\"-9.13\",\"y\":\"0.76\"},{\"x\":\"0.56\",\"y\":\"-4.58\"},{\"x\":\"-4.81\",\"y\":\"-12.12\"},{\"x\":\"-21.60\",\"y\":\"-57.00\"},{\"x\":\"11.00\",\"y\":\"0.00\"}]},{\"points\":[{\"x\":\"70.37\",\"y\":\"0.13\"},{\"x\":\"-0.90\",\"y\":\"1.25\"},{\"x\":\"3.40\",\"y\":\"13.62\"},{\"x\":\"2.52\",\"y\":\"10.08\"},{\"x\":\"5.33\",\"y\":\"27.45\"},{\"x\":\"4.28\",\"y\":\"7.47\"},{\"x\":\"14.00\",\"y\":\"-60.00\"},{\"x\":\"12.00\",\"y\":\"0.00\"},{\"x\":\"7.63\",\"y\":\"32.00\"},{\"x\":\"7.37\",\"y\":\"29.00\"},{\"x\":\"10.13\",\"y\":\"-42.00\"},{\"x\":\"0.77\",\"y\":\"-3.09\"},{\"x\":\"2.71\",\"y\":\"-12.56\"},{\"x\":\"1.53\",\"y\":\"-1.78\"},{\"x\":\"1.86\",\"y\":\"-2.17\"},{\"x\":\"5.31\",\"y\":\"0.60\"},{\"x\":\"2.69\",\"y\":\"0.00\"},{\"x\":\"-18.00\",\"y\":\"73.00\"},{\"x\":\"-13.00\",\"y\":\"0.00\"},{\"x\":\"-14.00\",\"y\":\"-61.00\"},{\"x\":\"-2.00\",\"y\":\"0.00\"},{\"x\":\"-14.00\",\"y\":\"61.00\"},{\"x\":\"-13.00\",\"y\":\"0.00\"},{\"x\":\"-18.00\",\"y\":\"-73.00\"},{\"x\":\"4.00\",\"y\":\"0.00\"}]}]}";

int initServer() {
    int retries = 0;
    Serial.println("Connecting...");
    WiFi.mode(WIFI_STA);
    WiFi.begin(ssid, password);
    while ((WiFi.status() != WL_CONNECTED) && (retries < WIFI_INIT_RETRY)) {
      retries++;
      delay(1000);
      Serial.print("#");
    }

    server.begin();
    Serial.println(WiFi.localIP());
    serverRouting();

    return WiFi.status();
}

void initMotors() {
    motorL.setStepDuration(motorSpeed);
    motorR.setStepDuration(motorSpeed);

    servoPen.attach(SERVO_PIN);
    servoPen.write(PEN_UP);
}

bool initPlot(String json) {
    if (DeserializationError error = deserializeJson(doc, json)) {
        Serial.println("error parsing json");
        server.send(400);

        return false;
    }
    printing = true;
    server.sendHeader("Location", "/plot/");
    server.send(201);


    return true;
}

void postPlot() {
    String body = server.arg("plain");
    initPlot(body);
}

void serverRouting() {
    server.on("/", HTTP_GET, []() {
        server.send(200, "text/html", "/plot");
    });
    server.on("/plot", HTTP_POST, postPlot);
}

bool getPoint(int line, int point, float *x, float* y)
{
    float newX = doc["lines"][line]["points"][point]["x"];
    float newY = doc["lines"][line]["points"][point]["y"];
    if (doc["lines"][line]["points"][point]["x"] == nullptr && doc["lines"][line]["points"][point]["y"] == nullptr) {

        return false;
    }
    *x = newX * zoom;
    *y = newY * zoom;

    return true;
}

void drawLine(long distanceL, long distanceR){
    int directionL = -1;
    int directionR = 1;
    long distL = distanceL;
    long distR = distanceR;
    if (distanceL < 0) {
        directionL = directionL * -1;
        distL = distL * -1;
    }
    if (distanceR < 0) {
        directionR = directionR * -1;
        distR = distR * -1;
    }
    long ticks = distL * distR;
    for (long i = 1; i <= ticks; i++) {
        if (i % distL == 0) {
            motorL.step(STEPS_PER_TICK * directionR);
        }
        if (i % distR == 0) {
            motorR.step(STEPS_PER_TICK * directionL);
        }
        yield();
    }
}

void getDistance(float x, float y, long *distanceLeft, long *distanceRight) {
    float nextX = x + lastX;
    float nextY = y + lastY;
    float leftX = nextX + centerX;
    float rightX = nextX - centerX;
    float yPos  = nextY + centerY;
    long newLeft  = sqrt(pow(leftX, 2) + pow(yPos, 2));
    long newRight = sqrt(pow(rightX, 2) + pow(yPos, 2));
    *distanceLeft  = (newLeft - currentLeft) * STEPS_PER_MM;
    *distanceRight = (newRight - currentRight) * STEPS_PER_MM;
    currentLeft = newLeft;
    currentRight = newRight;
    lastX = nextX;
    lastY = nextY;
}

void setup()
{
    Serial.begin(9600);
    Serial.println("Setup");
    Serial.print("Canvas width:");
    Serial.println(canvasWidth);

    initMotors();
    Serial.println(initServer());
    Serial.println(initPlot(plotJson));

    delay(5000);
}

void loop() {
    server.handleClient();
    if (printing) {
        for (int line = 0; line < doc["lines"].size(); line++) {
            for (int point = 0; point < doc["lines"][line]["points"].size(); point++) {
                float tmpX = 0;
                float tmpY = 0;
                if(!getPoint(line, point, &tmpX, &tmpY)) {
                    servoPen.write(PEN_UP);
                    Serial.println("Plot error");
                    printing = false;
                    break;
                } else {
                    if (point == 0) {
                        servoPen.write(PEN_UP);
                    } else {
                        servoPen.write(PEN_DOWN);
                    }
                    long distanceLeft = 0;
                    long distanceRight = 0;
                    getDistance(tmpX,tmpY, &distanceLeft, &distanceRight);
                    Serial.print(distanceLeft);
                    Serial.print("   distance   ");
                    Serial.println(distanceRight);
                    drawLine(distanceLeft, distanceRight);
                }
            }
        }
        servoPen.write(PEN_UP);
        Serial.println("Plot error");
        printing = false;
    }
}
