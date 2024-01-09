const { Entity} = require('./entity');
const { Bullet} = require('./bullet');
const { Upgrade} = require('./upgrade');
const {playerList, initPack, removePack} = require('./global');

Player = function (param) {
	var self = Entity(param);
	// self.id = param.id;
	self.number = "" + Math.floor(10 * Math.random());
	self.username = param.username;
	self.pressingRight = false;
	self.pressingLeft = false;
	self.pressingUp = false;
	self.pressingDown = false;
	self.pressingAttack = false;
	self.mouseAngle = 0;
	self.maxSpd = 5;
	self.hp = 10;
	self.hpMax = 10;
	self.score = 0;
	self.isHit = false;
	self.socket = param.socket;

	// buff related metrics related metrics
	self.fireRate = 500; // 1000ms = 1 shot/s, 500 = 2 shots/s
	self.nextShotTime = 0;
	self.bulletSpeed = 10;
	self.bulletRadius = 10;
	self.isImmune = false;
	// gun related
	self.isTripleShot = false;
	self.isPhoenixShot = false;
	self.isDoubleRebounder = false;

	var super_update = self.update;
	self.update = function () {
		self.updateSpd();
		super_update();

		if (self.isHit && Date.now() - self.hitTime > 60) self.isHit = false;

		var currentTime = Date.now();
		if (self.pressingAttack && currentTime > self.nextShotTime) {
			if (self.isTripleShot) {
				var angles = [-30, 0, 30];
				for (var i = 0; i < angles.length; i++) {
					self.shootBullet(self.mouseAngle, angles[i]);
				}
			} else {
				self.shootBullet(self.mouseAngle, 0);
			}
			self.nextShotTime = currentTime + self.fireRate; // Update the next shot time after shooting
		}
	}

	self.shootBullet = function (angle, offset) {
		var collisionCap = 1;
		if (self.isDoubleRebounder) collisionCap = 2;
		else if (self.isPhoenixShot) collisionCap = 5;


		var currentTime = Date.now();
		if (currentTime > self.nextShotTime) {
			const barrelLength = 20;
			const barrelThickness = 18;
			var angleInRadians = (angle + offset) * Math.PI / 180;
			// Calculate bullet's starting position at the end of the barrel
			var bulletX = self.x + (barrelLength + barrelThickness / 2) * Math.cos(angleInRadians);
			var bulletY = self.y + (barrelLength + barrelThickness / 2) * Math.sin(angleInRadians);
			Bullet({
				parent: self.id,
				angle: angle + offset,
				x: bulletX,
				y: bulletY,
				bulletSpeed: self.bulletSpeed,
				bulletRadius: self.bulletRadius,
				collisionCap: collisionCap,
			});
		}
	}

	self.updateSpd = function () {
		var dx = 0;
		var dy = 0;

		if (self.pressingRight) dx += 1;
		if (self.pressingLeft) dx -= 1;
		if (self.pressingUp) dy -= 1;
		if (self.pressingDown) dy += 1;

		var length = Math.sqrt(dx * dx + dy * dy);
		if (length > 0) {
			dx /= length;
			dy /= length;
		}

		self.spdX = self.maxSpd * dx;
		self.spdY = self.maxSpd * dy;
	};


	self.getInitPack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			number: self.number,
			hp: self.hp,
			hpMax: self.hpMax,
			score: self.score,
			username: self.username,
			mouseAngle: self.mouseAngle,
			isTripleShot: self.isTripleShot,
			isHit: self.isHit,
			isImmune: self.isImmune,
		};
	}
	self.getUpdatePack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			hp: self.hp,
			score: self.score,
			username: self.username,
			mouseAngle: self.mouseAngle,
			isTripleShot: self.isTripleShot,
			isHit: self.isHit,
			isImmune: self.isImmune,
		}
	}

	// Player.list[self.id] = self;
    playerList[self.id] = self;
	initPack.player.push(self.getInitPack());
	return self;
}

Player.onConnect = function (socket, username) {
	var player = Player({
		username: username,
		id: socket.id,
		socket: socket,
	}); /// here we need to give the username as a param eventrually
	socket.on('keyPress', function (data) {

		if (data.inputId === 'left')
			player.pressingLeft = data.state;
		else if (data.inputId === 'right')
			player.pressingRight = data.state;
		else if (data.inputId === 'up')
			player.pressingUp = data.state;
		else if (data.inputId === 'down')
			player.pressingDown = data.state;
		else if (data.inputId === 'attack')
			player.pressingAttack = data.state;
		else if (data.inputId === 'mouseAngle')
			player.mouseAngle = data.state;

	});

	socket.on('sendMsgToServer', function (data) {
		for (var i in Player.list) {
			Player.list[i].socket.emit('addToChat', player.username + ': ' + data);
		}
	});

	socket.emit('init', {
		selfId: socket.id,
		player: Player.getAllInitPack(),
		bullet: Bullet.getAllInitPack(),
		upgrade: Upgrade.getAllInitPack(),
	})
}

Player.getAllInitPack = function () {
	var players = [];
	for (var i in playerList)
		players.push(playerList[i].getInitPack());
	return players;
}

Player.onDisconnect = function (socket) {
	let player = playerList[socket.id];
	if (!player)
		return;
	delete playerList[socket.id];
	removePack.player.push(socket.id);
}

Player.update = function () {
	var pack = [];
	for (var i in playerList) {
		var player = playerList[i];
		player.update();
		pack.push(
			player.getUpdatePack()
		);
	}
	return pack;
}

module.exports = {
	Player,
};