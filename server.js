var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var kinesis = require('kinesis');

var kinesisSource = kinesis.stream({name: 'pctest', oldest: false});

kinesisSource.on('data', (data) => {
    console.log('Got some data from K - ' + data.Data);
    try {
        var doc = JSON.parse(data.Data);
        console.log('id is '+ doc.id);

        var marker = {
            id: doc.id,
            pos: {
                lat: doc.lat,
                lng: doc.lng
            }
        };
        io.emit('move pin', marker);
    } catch (e) {
        console.log('Could not parse '+ data.Data);
    }
});

app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

app.get('/map', function(req, res){
    res.sendFile(__dirname + '/map.html');
});

app.get('/map.js', function(req, res){
    res.sendFile(__dirname + '/map.js');
});

app.get('/icon.svg', function(req, res){
    res.sendFile(__dirname + '/img/mobi.svg');
});

io.on('connection', function(socket){
    io.emit('chat message', 'A NEW CHALLENGER');
    console.log('a user connected');

    socket.on('disconnect', function(){
        console.log('user disconnected');
    });

    socket.on('chat message', function(msg){
        console.log('message: ' + msg);
        io.emit('chat message', msg);
    });

    socket.on('new pin', function(marker) {
        var pos = marker.pos;
        console.log('new position marked at (' + pos.lat + ', ' + pos.lng + ') for ' + marker.id);
        socket.broadcast.emit('new pin', marker);
    });

    socket.on('move pin', function(marker) {
        var pos = marker.pos;
        var dt = new Date();
        console.log(marker.id + '	' + pos.lat + '	'+ pos.lng + '	' + dt.toUTCString());
        socket.broadcast.emit('move pin', marker);
    });

});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
