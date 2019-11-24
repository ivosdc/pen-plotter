#include <ArduinoJson.h>
#include "FS.h"
#include <Servo.h>
#include <AccelStepper.h>
#include <MultiStepper.h>
#include <ESP8266WebServer.h>
#include "Config.h"

ESP8266WebServer server(80);
Servo servoPen;
AccelStepper motorLeft(AccelStepper::HALF4WIRE, MOTOR_LEFT_1, MOTOR_LEFT_3, MOTOR_LEFT_2, MOTOR_LEFT_4);
AccelStepper motorRight(AccelStepper::HALF4WIRE, MOTOR_RIGHT_1, MOTOR_RIGHT_3, MOTOR_RIGHT_2, MOTOR_RIGHT_4);
MultiStepper plotter;
bool printing = true;

StaticJsonDocument<1000> configJson;
const char* ssid  = "SSID";
const char* password = "PASSWORD";
float zoomFactor = 1.0;

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
    initMotors();
    initServer();
    serverRouting();
    Serial.println("Ready!");
}

void setMotorSpeed(long distL, long distR, long directionLeft, long directionRight) {
    int speed = MOTOR_MAX_SPEED;
    long speedL = speed;
    long speedR = speed;
    if (distL < distR){
        speedL = 0;
        if (distR != 0) {
            speedL = (distL * speed / distR);
        }
    } else {
        speedR = 0;
        if (distL != 0) {
            speedR = (distR * speed / distL);
        }
    }
    motorLeft.setSpeed(speedR * directionRight);
    motorRight.setSpeed(speedL * directionLeft);
    Serial.print(speedR  * directionRight);
    Serial.print(" speed ");
    Serial.println(speedL  * directionLeft);
}

void moveMotors(float distL, float distR, int directionLeft, int directionRight) {
    Serial.print(distR * STEPS_PER_MM * directionRight);
    Serial.print(" moveTo ");
    Serial.println(distL * STEPS_PER_MM * directionLeft);
    long positions[2]; // Array of desired stepper positions
    positions[0] = distR * STEPS_PER_MM * directionRight;
    positions[1] = distL * STEPS_PER_MM * directionLeft;
    setMotorSpeed(distL, distR, directionLeft, directionRight);
    motorLeft.setCurrentPosition(0);
    motorRight.setCurrentPosition(0);
    plotter.moveTo(positions);
    while ((motorLeft.distanceToGo() != 0) || (motorRight.distanceToGo() != 0)) {
        plotter.run();
        yield();
    }
    delay(50);
    Serial.print(motorLeft.currentPosition());
    Serial.print(" currentPos ");
    Serial.println(motorRight.currentPosition());   
}

void drawLine(float x, float y){
    Serial.print(x);
    Serial.print(" dist ");
    Serial.println(y);
    int directionX = MOTOR_LEFT_DIRECTION;
    int directionY = MOTOR_RIGHT_DIRECTION;
    if (x < 0) {
        x = x * -1;
        directionX = directionX * -1;
    }
    if (y < 0) {
        y = y * -1;
        directionY = directionY * -1;
    }
    moveMotors(x, y, directionX, directionY);
}

void goHome() {
    homeX = homeX * -1;
    homeY = homeY * -1;
    drawLine(homeX, homeY);
    homeX = 0;
    homeY = 0;
}

void moveToXY(float x, float y) {
    homeX = homeX + x;
    homeY = homeY + y;
    drawLine(x, y);
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
