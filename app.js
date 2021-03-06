'use strict';

let express = require('express');
let app = express();
let swig = require('swig');

let Protocol = require('azure-iot-device-amqp').Amqp;
let Client = require('azure-iot-device').Client;
let ConnectionString = require('azure-iot-device').ConnectionString;
let Message = require('azure-iot-device').Message;
let iotHub = require('azure-iothub');
let http = require('http').Server(app);
let io = require('socket.io')(http);
let bodyParser = require('body-parser');
let http1 = require('request');
let IotHub = require('azure-iothub');
let EventHubClient = require('azure-event-hubs').Client;
let once = require('once');
let config = require('./config/config.json');


// This is where all the magic happens!
app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/Public');
app.set('view cache', false);
swig.setDefaults({cache: false});

//DEVICE INFO
let connectionString = null;
let deviceId = null;

//IOT HUB
let connectionStringIotHub = config.connectionStringIotHub;
let registry = IotHub.Registry.fromConnectionString(connectionStringIotHub);

//app.use(express.static(__dirname + '/public'));
//app.use(express.static(__dirname + '/socket.io'));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

// This is where all the magic happens!
app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/Public');
app.set('view cache', false);
swig.setDefaults({cache: false});

app.get('/', function (req, res) {
    res.render('index', {deviceConnected: deviceId});
});

app.get('/admin', function (req, res, next) {
    registry.list(function (err, devices) {
        res.render('admin', {devices: devices, deviceConnected: deviceId});
    })
});

app.get('/selectDevice/:id', function (req, res, next) {
    console.log('Device To select: ' + req.params.id);
    registry.get(req.params.id, function (err, deviceInfo, res) {
        //console.log(deviceInfo.authentication.symmetricKey.primaryKey);
        connectionString = 'HostName=' + config.iotHubUri + ';DeviceId=' + req.params.id + ';SharedAccessKey=' + deviceInfo.authentication.symmetricKey.primaryKey;
        deviceId = ConnectionString.parse(connectionString).DeviceId;
    });

    res.redirect('/admin');
});

app.get('/removeDevice/:id', function (req, res, next) {
    let error, message;
    console.log('Device To remove: ' + req.params.id);
    registry.delete(req.params.id, function (err, deviceInfo, res) {
        if (!err) {
            console.log(JSON.stringify(deviceInfo));
        }
        else {
            error = err;
            console.log('error occured while removing device: ' + error);
        }
    });

    if (!error) {
        //if no error occured, redirecting to admin panel after 1s timeout so we have the time to get the created device
        setTimeout(function () {
            //finally render the admin page
            res.redirect('/admin');
        }, 1000);
    }
});

app.get('/ping/:id', function (req, res, next) {
    let error, message;
    let Client = require('azure-iothub').Client;
    let Message = require('azure-iot-common').Message;
    const targetDevice = req.params.id;

    let serviceClient = Client.fromConnectionString(connectionStringIotHub);

    function printResultFor(op) {
        return function printResult(err, res) {
            if (err) {
                error = err;
                console.log(op + ' error: ' + err.toString());
            }
            if (res) {
                console.log(op + ' status: ' + res.constructor.name);
                message = op + ' status: ' + res.constructor.name;
                // let sock = io();
                // sock.emit('message', msg.getData().toString('utf-8'));
            }
        };
    }

    function receiveFeedback(err, receiver) {
        receiver.on('message', function (msg) {
            console.log('Feedback message:');
            console.log(msg.getData().toString('utf-8'));
        });
    }

    serviceClient.open(function (err) {
        if (err) {
            console.error('Could not connect: ' + err.message);
        } else {
            console.log('Service client connected');
            serviceClient.getFeedbackReceiver(receiveFeedback);
            let message = new Message('Cloud to device message.');
            message.ack = 'full';
            message.messageId = "My Message ID";
            console.log('Sending message: ' + message.getData());
            serviceClient.send(targetDevice, message, printResultFor('send'));
        }
    });

    if (!error) {
        //if no error occured, redirecting to admin panel after 1s timeout so we have the time to get the created device
        setTimeout(function () {
            //finally render the admin page
            // res.render('admin', {message: message});
            res.redirect('/admin');
        }, 1000);
    }
});

/*app.get('/admin/create', function (req, res, next) {
 res.render('createDevice');
 });*/

app.post('/admin/create', function (req, res, next) {
    let error;
    const deviceId = req.body.deviceId;
    let device = new iotHub.Device(null);
    device.deviceId = deviceId;
    registry.create(device, function (err, deviceInfo, res) {
        if (err) {
            registry.get(device.deviceId, printDeviceInfo(err, deviceInfo, res));
        }
        if (deviceInfo) {
            //const deviceId = deviceInfo.deviceId;
            //const deviceKey = deviceInfo.authentication.symmetricKey.primaryKey;

            printDeviceInfo(err, deviceInfo, res)
        }
    });

    function printDeviceInfo(err, deviceInfo, res) {
        if (err) {
            error = err;
            res.render('error', {error: err});
        }
        if (deviceInfo) {
            console.log('Device ID: ' + deviceInfo.deviceId);
            console.log('Device key: ' + deviceInfo.authentication.symmetricKey.primaryKey);
        }
    }

    if (!error) {
        //if no error occured, redirecting to admin panel after 1s timeout so we have the time to get the created device
        setTimeout(function () {
            res.redirect('/admin');
        }, 1000);
    }
});


io.on('connection', function (socket) {

    socket.on('message', function (data) {
        //console.log(data);
        const args = {
            url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages?numberOfLanguagesToDetect=1",
            headers: {
                "Content-Type": "application/json",
                "Host": "westus.api.cognitive.microsoft.com",
                "Ocp-Apim-Subscription-Key": config.cognitiveApiKey
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
            let data1 = body.documents[0];
            //console.log('Upload successful!  Server responded with:', data1);

            socket.send(JSON.stringify({result: data1.detectedLanguages[0].name}));

            // use factory function from AMQP-specific package
            const clientFromConnectionString = require('azure-iot-device-amqp').clientFromConnectionString;

            // AMQP-specific factory function returns Client object from core package
            const client = clientFromConnectionString(connectionString);

            // use Message object from core package
            const Message = require('azure-iot-device').Message;

            const connectCallback = function (err) {
                if (err) {
                    console.error('Could not connect: ' + err);
                } else {

                    //console.log('Client connected');
                    //console.log('Data1: ' + JSON.stringify(data1));
                    let dataToSend = {};
                    try {
                        dataToSend = JSON.stringify({deviceId: deviceId, data: data1.detectedLanguages[0].name});
                    } catch (e) {
                        console.error(e);
                        throw e;
                    }
                    let msg = new Message(dataToSend);
                    //console.log('trying to send msg: ' + JSON.stringify(msg));
                    client.sendEvent(msg, function (err) {
                        if (err) {
                            console.log(err.toString());
                        } else {
                            console.log('Message sent');
                        }
                    });

                    let clientHub = EventHubClient.fromConnectionString(connectionStringIotHub);
                    clientHub.open()
                        .then(clientHub.getPartitionIds.bind(clientHub))
                        .then(function (partitionIds) {
                            return partitionIds.map(function (partitionId) {
                                return clientHub.createReceiver('$Default', partitionId, {'startAfterTime': Date.now()}).then(function (receiver) {
                                    //console.log('Created partition receiver: ' + partitionId)
                                    receiver.on('errorReceived', function (err) {
                                        //console.log('error from hub :'+err.message);
                                    });
                                    receiver.on('message', function (message) {
                                        //console.log('messageTosendToMonitor');
                                        socket.on('chat message', function (message) {
                                            io.emit('messageReceived', JSON.stringify({result: message.body}));
                                        });
                                        /*console.log('Message received from device: ');
                                         console.log(JSON.stringify(message.body));
                                         console.log('')*/
                                    });
                                });
                            });
                        })
                        .catch(function (err) {
                            console.log('error from hub :' + err.message);
                        });
                }
            };
            client.open(connectCallback);
        });
    });
});

const port = process.env.port || 1337;
http.listen(port, function (err) {
    if (err)
        console.log("Err while starting server:" + err);
    else
        console.log("Server started and listening on port " + port);
});




