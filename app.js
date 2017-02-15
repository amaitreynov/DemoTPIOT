'use strict';

var express = require('express');
var app = express();
var swig = require('swig');

var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;
var IotHub = require('azure-iothub');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var parser = require('body-parser');
var http1 = require('request');

var connectionString = 'HostName=ynovIotHubTonio.azure-devices.net;DeviceId=new-device_01;SharedAccessKey=iaINBHMPhghQzyCEn5+RauTbJniCDl5fp7qGsB+9NeU=';
var connectionStringIotHub = 'HostName=ynovIotHubTonio.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=tn+b+mToX2wTSZNXenQzG5seBnPadl7ABmJMVrcOd64=';

var registry = IotHub.Registry.fromConnectionString(connectionStringIotHub);
var deviceId = ConnectionString.parse(connectionString).DeviceId;




// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
// var connectionString = 'HostName=agirtest4389e.azure-devices.net;DeviceId=Ubuntu01;SharedAccessKey=jJkGh1Jzd3eSMj/JqeURKw==';
// var connectionString = 'HostName=HubDemo.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=PYTJXWo07Ih9140NA++Sh6YjDb+POJLgnXWoL/nl0U0=';
/**
 * Antoine's hub
 * @type {string}
 * HostName=ynovIpiIot.azure-devices.net;SharedAccessKeyName=iothubowner;SharedAccessKey=NfD1qL4F+51zr8HUcTtqGku7gW8Dl8o8XF0myBw4fIk=
 */

/**
 * Sylvain's device
 * @type {string}
 */
// var connectionString = 'HostName=HubDemo.azure-devices.net;DeviceId=custom_new_device_01;SharedAccessKey=dXtd8bUjJzJnXMoxRb3mcFKpu+pS4neoCoSiUtVHFig=';

/**
 * Antoine's device
 * HostName=ynovIpiIot.azure-devices.net;DeviceId=new_device_01;SharedAccessKey=DXSkfz78lGjADuuCJ6L2/h8p8rqeewz9/Hx/gKGi9bc=
 */


// Create IoT Hub client
// var client = Client.fromConnectionString(connectionString, Protocol);




//app.use(express.static(__dirname + '/public'));
//app.use(express.static(__dirname + '/socket.io'));

app.get('/', function (req, res) {
    //res.send('Hello World!');
    res.render('index');
});

app.get('/ping/:id', function (req, res, next) {
    registry.list(function (err, devices) {
        console.log('Device To Ping' +req.params.value1);
        //console.log(devices);
        res.render('admin', {devices: devices});
    })
});

app.get('/admin', function (req, res, next) {
    registry.list(function (err, devices) {
        console.log(devices);
        res.render('admin', {devices: devices});
    })
});



io.on('connection', function (socket) {
    socket.on('message', function (data) {
        console.log(data);
        var args = {
            url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages?numberOfLanguagesToDetect=1",
            headers: {
                "Content-Type": "application/json",
                "Host": "westus.api.cognitive.microsoft.com",
                "Ocp-Apim-Subscription-Key": "dc6de77bf54a4569bad188e244567133"
            },
            json: {
                documents: [
                    {
                        id: "toto",
                        text: data
                    }
                ]
            }
        };
        http1.post(args, function (error, response, body) {
            if (error) {
                return console.error('upload failed:', error);
            }
            var data1 = body.documents[0];
            console.log('Upload successful!  Server responded with:', data1);

            socket.send(JSON.stringify({result: "OK, bien reçu, le message était dans la langue : " + data1.detectedLanguages[0].name}));

            // use factory function from AMQP-specific package
            var clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

            // AMQP-specific factory function returns Client object from core package
            var client = clientFromConnectionString(connectionString);

            // use Message object from core package
            var Message = require('azure-iot-device').Message;

            var connectCallback = function (err) {
                if (err) {
                    console.error('Could not connect: ' + err);
                } else {

                    console.log('Client connected');
                    console.log('Data1: ' + JSON.stringify(data1));
                    var dataToSend = {};
                    try {
                        dataToSend = JSON.stringify({deviceId: "new-device_01", data: data1.detectedLanguages[0].name});
                    } catch (e) {
                        console.error(e);
                        throw e;
                    }
                    var msg = new Message(dataToSend);
                    console.log('trying to send msg: ' + JSON.stringify(msg));
                    client.sendEvent(msg, function (err) {
                        if (err) {
                            console.log(err.toString());
                        } else {
                            console.log('Message sent');
                        }
                    });
                }
            };
            client.open(connectCallback);
        });
    });
});

// This is where all the magic happens!
app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/Public');
app.set('view cache', false);
swig.setDefaults({cache: false});

var port = process.env.port || 1337;
http.listen(port, function (err) {
    if (err)
        console.log("Err while starting server:" + err);
    else
        console.log("Server started and listening on port " + port);
});




