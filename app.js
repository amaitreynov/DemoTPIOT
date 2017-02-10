'use strict';

var Protocol = require('azure-iot-device-amqp').Amqp;
var Client = require('azure-iot-device').Client;
var ConnectionString = require('azure-iot-device').ConnectionString;
var Message = require('azure-iot-device').Message;

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
var connectionString = 'HostName=ynovIpiIot.azure-devices.net;DeviceId=new_device_01;SharedAccessKey=DXSkfz78lGjADuuCJ6L2/h8p8rqeewz9/Hx/gKGi9bc=';

var deviceId = ConnectionString.parse(connectionString).DeviceId;

// Create IoT Hub client
// var client = Client.fromConnectionString(connectionString, Protocol);


var express = require('express');
var app = express();
var parser = require('body-parser');
var http1 = require('request');

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/socket.io'));

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function (req, res) {
		res.render('./public/index.html');
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
										var msg = new Message('some data from my device '+ data1);
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


http.listen(3000, function () {
});




