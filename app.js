var express = require('express');
var socketIO = require('socket.io');
var http = require('http');
var app = express();
// var serv = require('http').Server(app);
const serv = http.createServer(app);
// require('./entity');
const { Entity, Player, Bullet } = require('./entity');


app.get('/', function (req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client', express.static(__dirname + '/client'));
serv.listen(2000);
console.log("Server started.");

var SOCKET_LIST = {};
var FPS = 60;
var DEBUG = true;

const io = socketIO(serv, {});
io.sockets.on('connection', function (socket) {
	socket.id = Math.random();
	SOCKET_LIST[socket.id] = socket;

	socket.on('start', function(username){
		Player.onConnect(socket,username);
		socket.emit('startResponse');
	});

	socket.on('disconnect', function () {
		delete SOCKET_LIST[socket.id];
		Player.onDisconnect(socket);
	});
	// socket.on('sendMsgToServer', function (data) {
	// 	var playerName = ("" + socket.id).slice(2, 7);
	// 	for (var i in SOCKET_LIST) {
	// 		SOCKET_LIST[i].emit('addToChat', playerName + ': ' + data);
	// 	}
	// });

	socket.on('evalServer', function (data) {
		if (!DEBUG)
			return;
		var res = eval(data);
		socket.emit('evalAnswer', res);
	});

});

setInterval(function () {
	var packs = Entity.getFrameUpdateData();
	for (var i in SOCKET_LIST) {
		var socket = SOCKET_LIST[i];
		socket.emit('init', packs.initPack);
		socket.emit('update', packs.updatePack);
		socket.emit('remove', packs.removePack);
	}
}, 1000 / FPS);