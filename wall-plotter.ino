#include <ArduinoJson.h>
#include "FS.h"
#include <Servo.h>
#include <AccelStepper.h>
#include <MultiStepper.h>
#include <ESP8266WebServer.h>
#include "Config.h"

ESP8266WebServer server(80);

AccelStepper motorLeft(AccelStepper::HALF4WIRE, MOTOR_LEFT_1, MOTOR_LEFT_3, MOTOR_LEFT_2, MOTOR_LEFT_4);
AccelStepper motorRight(AccelStepper::HALF4WIRE, MOTOR_RIGHT_1, MOTOR_RIGHT_3, MOTOR_RIGHT_2, MOTOR_RIGHT_4);
MultiStepper plotter;
const int motorLeftDirection = 1;
const int motorRightDirection = -1;
const int motorMaxSpeed = 250;

Servo servoPen;
bool printing = true;

StaticJsonDocument<1000> configJson;
const char* ssid  = "SSID";
const char* password = "PASSWORD";
long canvasWidth = 1000;
long currentLeft = canvasWidth;
long currentRight = canvasWidth;
float zoomFactor = 1.0;

static float origoX = canvasWidth / 2;
static float origoY = sqrt(pow(canvasWidth, 2) - pow(origoX, 2));
static float lastX = 0;
static float lastY = 0;
static float homeX = 0;
static float homeY = 0;
char configData[] = "{\"server\":{\"ssid\":\"ssid\",\"password\":\"password\"},\"plotter\":{\"canvasWidth\":\"canvasWidth\",\"currentLeft\":\"currentLeft\",\"currentRight\":\"currentRight\",\"zoomFactor\":\"zoomFactor\"}}";


void setup() {
    Serial.begin(9600);
    Serial.println("Setup");
    initConfig();
    initFileSystem();
    Serial.print("Canvas width:");
    Serial.println(canvasWidth);
    initMotors();
    initServer();
    serverRouting();
    Serial.println("Ready!");
}

void setDirection(long *distL, long *distR, int *directionLeft, int *directionRight, long distanceLeft, long distanceRight){
    if (distanceLeft < 0) {
        *directionLeft = *directionLeft * -1;
        *distL = *distL * -1;
    }
    if (distanceRight < 0) {
        *directionRight = *directionRight * -1;
        *distR = *distR * -1;
    }
}

void setMotorSpeed(long distL, long distR, long directionLeft, long directionRight) {
    int speed = motorMaxSpeed;
    long speedL = speed;
    long speedR = speed;
    if (distL < distR){
        speedL = (distL * speed / distR);
        speedR = speed;
    } else {
        speedR = (distR * speed / distL);
        speedL = speed;
    }
    motorLeft.setSpeed(speedR);
    motorRight.setSpeed(speedL);
}

void moveMotors(long distL, long distR, long directionLeft, long directionRight) {
    Serial.print(distL * STEPS_PER_MM * directionLeft);
    Serial.print(" moveM ");
    Serial.println(distR * STEPS_PER_MM * directionRight);
    long positions[2]; // Array of desired stepper positions
    positions[0] = round(distR * STEPS_PER_MM * directionRight);
    positions[1] = round(distL * STEPS_PER_MM * directionLeft);
    motorLeft.setCurrentPosition(0);
    motorRight.setCurrentPosition(0);
    plotter.moveTo(positions);
    while ((motorLeft.distanceToGo() != 0) || (motorRight.distanceToGo() != 0)) {
        plotter.run();
        yield();
    }
    delay(50);
    Serial.print(motorLeft.currentPosition());
    Serial.print(" currMpos ");
    Serial.println(motorRight.currentPosition());   
}

void drawLine(long distanceLeft, long distanceRight){
    Serial.print(distanceLeft);
    Serial.print(" dist ");
    Serial.println(distanceRight);
    int directionLeft = motorLeftDirection;
    int directionRight = motorRightDirection;
    long distL = distanceLeft;
    long distR = distanceRight;
    setDirection(&distL, &distR, &directionLeft, &directionRight, distanceLeft, distanceRight);
    setMotorSpeed(distL, distR, directionLeft, directionRight);
    moveMotors(distL, distR, directionLeft, directionRight);
}

void getDistance(float x, float y, long *distanceLeft, long *distanceRight) {
    float nextX = x * zoomFactor + lastX;
    float nextY = y * zoomFactor + lastY;
    float leftX = origoX + nextX;
    float rightX = canvasWidth - leftX;
    float yPos  = nextY + origoY;
    long newLeft  = sqrt(pow(leftX, 2) + pow(yPos, 2));
    long newRight = sqrt(pow(rightX, 2) + pow(yPos, 2));
    *distanceLeft  = (newLeft - currentLeft);
    *distanceRight = (newRight - currentRight);
    currentLeft = newLeft;
    currentRight = newRight;
    lastX = nextX;
    lastY = nextY;
}

void goHome() {
    long distanceLeft = 0;
    long distanceRight = 0;
    homeX = homeX * -1;
    homeY = homeY * -1;
    getDistance(homeX,homeY, &distanceLeft, &distanceRight);
    drawLine(distanceLeft, distanceRight);
    homeX = 0;
    homeY = 0;
}

void moveToXY(long x, long y) {
    long distanceLeft = 0;
    long distanceRight = 0;
    homeX = homeX + x;
    homeY = homeY + y;
    getDistance(x,y, &distanceLeft, &distanceRight);
    drawLine(distanceLeft, distanceRight);
}

void plotDone() {
    servoPen.write(PEN_UP);
    Serial.println("Plotting done.");
    printing = false;
    goHome();
}

bool startPlot() {
    int point = 0;
    float x = 0;
    float y = 0;
    char newPlotData[2000];
    printing = true;
    if (SPIFFS.exists(UPLOAD_PLOT_FILENAME)) {
        File f = SPIFFS.open(UPLOAD_PLOT_FILENAME, "r");
        while(f.available()) {
            if (!printing) {
                Serial.println("Plot stopped.");
                break;
            }
            f.readStringUntil('\n').toCharArray(newPlotData, 2000);
            char * pch;
            pch = strtok (newPlotData,",");
            int counter = 0;
            if (String(pch).indexOf("m") != -1) {
                point = 0;
            }
            while (pch != NULL && point > 0) {
                server.handleClient();
                if (!printing) {
                    servoPen.write(PEN_UP);
                    break;
                }
                if (counter % 2 == 0) {
                    if (point < 3) {
                        servoPen.write(PEN_UP);
                    } else {
                        servoPen.write(PEN_DOWN);
                    }
                    yield();
                    moveToXY(x, y);
                    x = atof(pch);
                } else {
                    y = atof(pch);
                }
                pch = strtok (NULL, ",");
                counter++;
            }
            point++;
        }
        f.close();
        plotDone();
        return true;
    }
    return false;
}
