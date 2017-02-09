'use strict';

//var Protocol = require('/usr/local/lib/node_modules/azure-iot-device-amqp').Amqp;
//var Client = require('/usr/local/lib/node_modules/azure-iot-device').Client;
//var ConnectionString = require('/usr/local/lib/node_modules/azure-iot-device').ConnectionString;
//var Message = require('/usr/local/lib/node_modules/azure-iot-device').Message;

// String containing Hostname, Device Id & Device Key in the following formats:
//  "HostName=<iothub_host_name>;DeviceId=<device_id>;SharedAccessKey=<device_key>"
//var connectionString = 'HostName=agirtest4389e.azure-devices.net;DeviceId=Ubuntu01;SharedAccessKey=jJkGh1Jzd3eSMj/JqeURKw==';
//var deviceId = ConnectionString.parse(connectionString).DeviceId;

// Create IoT Hub client
//var client = Client.fromConnectionString(connectionString, Protocol);


var express = require('express');
var app = express();
var parser = require('body-parser');
var http1 = require('request');

app.use(express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/socket.io'));

var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res){
  res.render('./public/index.html');
});

io.on('connection', function(socket){
  socket.on('message', function(data) {
    console.log(data);
    var args = {
      url: "https://westus.api.cognitive.microsoft.com/text/analytics/v2.0/languages?numberOfLanguagesToDetect=1",
      headers: {  "Content-Type": "application/json",
                  "Host": "westus.api.cognitive.microsoft.com",
                  "Ocp-Apim-Subscription-Key": "dc6de77bf54a4569bad188e244567133"
      },
      json: {
        documents: [
          {
            id : "toto",
            text : data
          }
        ]
        }
    };
    http1.post(args, function(error, response, body) {
      if (error) {
        return console.error('upload failed:', error);
      }
      var data1=body.documents[0];
      console.log('Upload successful!  Server responded with:', data1);
      socket.send(JSON.stringify({ result: "OK, bien reçu, le message était dans la langue : " + data1.detectedLanguages[0].name}));
  });
});
});


http.listen(3000, function(){
});




