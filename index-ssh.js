var isInitiator = false;

var configuration = null;

var Peer = require('simple-peer')
var p;


var fs = require('fs');

var _static = require('node-static');
var file = new _static.Server('./static', {
    cache: false
});

var options = {
    key: fs.readFileSync('fake-keys/privatekey.pem'),
    cert: fs.readFileSync('fake-keys/certificate.pem')
};

//var app = require('http').createServer(serverCallback);
var app = require('https').createServer(options, serverCallback);

function serverCallback(request, response) {
    request.addListener('end', function () {
        response.setHeader('Access-Control-Allow-Origin', '*');
        response.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
        response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        file.serve(request, response);
    }).resume();
}

var io = require('socket.io').listen(app, {
    log: true,
    origins: '*:*'
});

/*io.set('transports', [
    // 'websocket',
    //'xhr-polling',
    //'jsonp-polling'
    'websocket',
    'polling'
]);*/

var channels = {};

io.sockets.on('connection', function (socket) {
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }

    console.log('Client said: ', 'test');

    socket.on('new-channel', function (data) {
        console.log('Client said: ', 'new-channel request');
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
    });

    socket.on('message', function(message) {
        console.log('Client said: ', message);
        // for a real app, would be room-only (not broadcast)
        socket.broadcast.emit('message', message);

        socket.broadcast.emit('message-peer', message);
    });

    // convenience function to log server messages on the client
    function log() {
        var array = ['Message from server:'];
        array.push.apply(array, arguments);
        socket.emit('log', array);
    }

    socket.on('create or join', function(room) {
        console.log('Received request to create or join room ' + room);

        var numClients = io.sockets.sockets.length;
        console.log('Room ' + room + ' now has ' + numClients + ' client(s)');

        if (numClients === 1) {
          socket.join(room);
          console.log('Client ID ' + socket.id + ' created room ' + room);
          socket.emit('created', room, socket.id);

        } else if (numClients === 2) {
          console.log('Client ID ' + socket.id + ' joined room ' + room);
          io.sockets.in(room).emit('join', room);
          socket.join(room);
          socket.emit('joined', room, socket.id);
          io.sockets.in(room).emit('ready');
        } else if (numClients === 3) {
          console.log('Client ID ' + socket.id + ' joined room ' + room);
          io.sockets.in(room).emit('join', room);
          socket.join(room);
          socket.emit('joined', room, socket.id);
          io.sockets.in(room).emit('ready');
        } else { // max two clients
          socket.emit('full', room);
        }
    });

    socket.on('ipaddr', function() {
        var ifaces = os.networkInterfaces();
        for (var dev in ifaces) {
          ifaces[dev].forEach(function(details) {
            if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
              socket.emit('ipaddr', details.address);
            }
          });
        }
    });

    socket.emit('create or join', "temproom");

socket.on('message-peer', function(message) {
  //console.log('Client received message ', message);
  console.log('Client-peer received message ', message);
});
});

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        var username;
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender) {
                if(!username) username = data.data.sender;
                
                socket.broadcast.emit('message', data.data);
            }
        });
        
        socket.on('disconnect', function() {
            if(username) {
                socket.broadcast.emit('user-left', username);
                username = null;
            }
        });
    });
}

app.listen(8080);

var io = require('socket.io');
var socket = io.connect('https://localhost:8080');
socket.on('news', function (data) {
  console.log(data);
  socket.emit('my other event', { my: 'data' });
});

socket.emit('create or join', "temproom");

socket.on('message-peer', function(message) {
  //console.log('Client received message ', message);
  console.log('Client-peer received message ', message);
});