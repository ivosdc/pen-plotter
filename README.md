# ESP-8266 restful 2D pen plotter
![pen-plotter prototype](assets/prototype-2d-penplotter.png "Board")


### Hardware:
- 1 x NodeMCU 12e (ESP8266, I used a mini)
- 2 x step motor 28BYJ-48
- 1 x Servo SG90
- a pen
- rubber band

### Software:
**You need a [rest-api plugin for your browser](https://github.com/RESTEDClient/RESTED) or a tool like [postman](https://www.getpostman.com/)!**
- Arduino IDE
- gimp
- node.js

#### Libraries
- ArduinoJson
- AccelStepper

These are standard libs from Arduino and have just to be added and installed. 

## What happens until now:

### Spawns own WiFi when no WiFi is reachable. 
 - you can enter your own WiFi parameter. Just POST a json  to the server.
 - Default IP from own **Accespoint 192.168.0.1**
 - Your uploaded WiFI credentials are stored in a persistant config.json

### *minimal* CLI tool to convert *gimp*-svg to plotter-data 
See the svg-converter [README.md](svg-converter/README.md):

```
> cd pen-plotter/svg-converter 
> node svg2data.js svg/beetle.svg
```

This will create a `wall-plotter.data` file for upload.


### Upload plots with WiFi 
 - GET `/upload`: Upload a `wall-plotter.data` to ESP8266. A webform for file upload is presented.
 - GET `/plot`: Shows the last stored *wall-plotter.data*
 - POST `/plot`: Handles the file upload *wall-plotter.data*
 
### Set configuration parameter
- POST `/config`: Set canvas width and the position of the wall-plotter. ```{"canvasWidth":"1000","currentLeft":"330","currentRight":"999","zoomFactor":"1"}``` to `/config`.
- POST `/wifi`: Set your WiFi parameter. ``` {"ssid":"MY-SSID","password":"PASSWORD"} ```
- POST `/zoom`: Only change the output size. ``` {"zoomFactor":"1"} ```. 1 (no zoom) is default. 

### Start / Stop the wall-plotter on demand
- POST `/start`: This starts plotting your uploaded *wall-plotter.data*
- POST `/stop`: This will interrupt the running plot, if there is any.


[See all API-endpoints in wall-plotter::serverRouting()](https://github.com/ivosdc/wall-plotter/blob/ec4a6ae48933ddb8831ab3e29a7f0a8e4150781f/server_control.ino#L174)



### Soldering
![wall-plotter board](assets/wall-plotter-board.png "Board")
![wall-plotter labeled](assets/wall-plotter-board-label.png "Sockets for ESP-8266 and stepper-driver.")
