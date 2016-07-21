var isInitiator = false;

var configuration = null;

var Peer = require('simple-peer')
var wrtc = require('wrtc')
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

var app = require('http').createServer(serverCallback);
//var app = require('https').createServer(options, serverCallback);

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

        //socket.broadcast.emit('message-peer', message);
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

    socket.on('message-peer', function(room) {
  //console.log('Client received message ', message);
  console.log('Client-peer received message ', room);
  //socket.emit('create or join', "temproom");

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

    //socket.emit('create or join', "temproom");

// socket.on('message-peer', function(message) {
//   //console.log('Client received message ', message);
//   console.log('Client-peer received message ', message);
// });
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

// var io = require('socket.io');
// var socket = io.connect('https://localhost:8080');
// socket.on('news', function (data) {
//   console.log(data);
//   socket.emit('my other event', { my: 'data' });
// });

// socket.emit('create or join', "temproom");

// socket.on('message-peer', function(message) {
//   //console.log('Client received message ', message);
//   console.log('Client-peer received message ', message);
// });



//var socket = io.connect('https://localhost', {secure: true});
//var socket = io.connect('https://mysecuresite.com',{secure: true, port:6060});
// var socket = require('socket.io-client')('http://localhost:8080');
//   socket.on('connect', function(){});
//   socket.on('event', function(data){});
//   socket.on('disconnect', function(){});
//   socket.emit('create or join', "temproom");
//   socket.on('message-peer', function(message) {
//   //console.log('Client received message ', message);
//   console.log('Client-peer received message ', message);
// });

var socket = require('socket.io-client')('http://localhost:8080');
//var socket = require('socket.io-client')('https://localhost',{secure: true, port:8080});
//var socket = require('socket.io-client')('https://localhost:8080');
  //socket.on('connect', function(){});
  //socket.on('event', function(data){});
  //socket.on('disconnect', function(){});

socket.emit('create or join', 'testroom1');

  socket.on('created', function(room, clientId) {
  isInitiator = true;
  console.log('Created room', room, '- my client ID is', clientId);
  //grabWebCamVideo();
  createPeerConnection(isInitiator, configuration);
  //createSimplePeer(isInitiator, configuration);
});

socket.on('full', function(room) {
  console.log('Message from client: Room ' + room + ' is full :^(');
});

socket.on('ipaddr', function(ipaddr) {
  console.log('Message from client: Server IP address is ' + ipaddr);
});

socket.on('joined', function(room, clientId) {
  isInitiator = false;
  console.log('This peer has joined room', room, 'with client ID', clientId);
  //grabWebCamVideo();
  createPeerConnection(isInitiator, configuration);
  //createSimplePeer(isInitiator, configuration);
});

socket.on('ready', function() {
  console.log('Socket is ready');
  createPeerConnection(isInitiator, configuration);
  //createSimplePeer(isInitiator, configuration);
});

socket.on('message', function(message) {
  //console.log('Client received message ', message);
  console.log('Client received message ', message);
  
  if(!p){
    isInitiator = false;
    createPeerConnection(isInitiator, configuration);
  }
  
  //signalingMessageCallback(message);
  if(message.candidate){

    var candTemp = { candidate : {
      candidate: message.candidate
    }};
    p.signal(candTemp);
  }else{
    p.signal(message);
  }
  
});


//Send message to signaling server

function sendMessage(message) {
  console.log('Client sending message with type ', message.type);
  socket.emit('message', message);
}

  
  

  function createPeerConnection(isInitiator, config) {
    console.log('Creating Peer connection as initiator?', isInitiator, 'config:',
              config);
    //peerConn = new RTCPeerConnection(config);
    if(isInitiator){


    //p = new Peer({ initiator: true, trickle: false });
    p  = new Peer({ initiator: true, wrtc: wrtc })

  }else{
    //p = new Peer({ initiator: false, trickle: false });
    p = new Peer({ wrtc: wrtc })
  }
  // send any ice candidates to the other peer
  // peerConn.onicecandidate = function(event) {
  //   console.log('icecandidate event:', event);
  //   if (event.candidate) {
  //     sendMessage({
  //       type: 'candidate',
  //       label: event.candidate.sdpMLineIndex,
  //       id: event.candidate.sdpMid,
  //       candidate: event.candidate.candidate
  //     });
  //   } else {
  //     console.log('End of candidates.');
  //   }
  // };
  // p.onicecandidate = function(event) {
  //   console.log('icecandidate event:', event);
  //   if (event.candidate) {
  //     sendMessage({
  //       type: 'candidate',
  //       label: event.candidate.sdpMLineIndex,
  //       id: event.candidate.sdpMid,
  //       candidate: event.candidate.candidate
  //     });
  //   } else {
  //     console.log('End of candidates.');
  //   }
  // };

  p.on('signal', function (data) {
    sendMessage(data);
    console.log('SIGNAL', data)
  })

  if (isInitiator) {

    console.log('Creating Data Channel');
    // dataChannel = peerConn.createDataChannel('photos');
    // onDataChannelCreated(dataChannel);

    // console.log('Creating an offer');
    // peerConn.createOffer(onLocalSessionCreated, logError);

    //dataChannel = p.createDataChannel('photos');

    onDataChannelCreated();

    console.log('Creating an offer');
    //p.createOffer(onLocalSessionCreated, logError);
  } else {
    // peerConn.ondatachannel = function(event) {
    //   console.log('ondatachannel:', event.channel);
    //   dataChannel = event.channel;
    //   onDataChannelCreated(dataChannel);
    // };
    //  p.ondatachannel = function(event) {
    //   console.log('ondatachannel:', event.channel);
    //   dataChannel = event.channel;
    //   onDataChannelCreated(dataChannel);
    // };

    onDataChannelCreated();
  }
}

function onDataChannelCreated() {
  //console.log('onDataChannelCreated:', channel);

  // channel.onopen = function() {
  //   console.log('CHANNEL opened!!!');
  // };
  p.on('connect', function () {
    var toSend = Math.random();
    console.log('CONNECT and Send' + toSend);
    p.send('whatever' + toSend);
  })

  //channel.onmessage = (adapter.browserDetails.browser === 'firefox') ?
  //receiveDataFirefoxFactory() : receiveDataChromeFactory();

  p.on('data', function (data) {
    //(adapter.browserDetails.browser === 'firefox') ?
  //receiveDataFirefoxFactory() : receiveDataChromeFactory(data);
    console.log('data: ' + data)
  })
}