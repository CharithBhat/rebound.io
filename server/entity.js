const {
	TILE_SIZE,
	array2D,
	randomNonWallTile
} = require('./collision-map');

var initPack = {
	player: [],
	bullet: []
};
var removePack = {
	player: [],
	bullet: []
};

var MAP_WIDTH = array2D[0].length * TILE_SIZE;
var MAP_HEIGHT = array2D.length * TILE_SIZE;

Entity = function (param) {
	var spawnTile = randomNonWallTile();

	var self = {
		x: spawnTile.x * TILE_SIZE + TILE_SIZE / 2, // Center of the tile horizontally
		y: spawnTile.y * TILE_SIZE + TILE_SIZE / 2,
		spdX: 0,
		spdY: 0,
		id: "",
	}

	if (param) {
		if (param.x)
			self.x = param.x;
		if (param.y)
			self.y = param.y;
		if (param.id)
			self.id = param.id;
	}

	self.update = function () {
		self.updatePosition();
	}
	self.updatePosition = function () {
		var nextX = self.x + self.spdX;
		var nextY = self.y + self.spdY;

		if (isPositionWall(array2D, nextX, nextY)) return;
		self.x = nextX;
		self.y = nextY;
	}
	self.getDistance = function (pt) { // distance between point and the entity
		return Math.sqrt(Math.pow(self.x - pt.x, 2) + Math.pow(self.y - pt.y, 2));
	}
	return self;
}


Entity.getFrameUpdateData = function () {
	var pack = {
		initPack: {
			player: initPack.player,
			bullet: initPack.bullet,
		},
		removePack: {
			player: removePack.player,
			bullet: removePack.bullet,
		},
		updatePack: {
			player: Player.update(),
			bullet: Bullet.update(),
		}
	};
	initPack.player = [];
	initPack.bullet = [];
	removePack.player = [];
	removePack.bullet = [];
	return pack;
}

isPositionWall = function (grid, pointX, pointY) {
	var gridX = Math.floor(pointX / TILE_SIZE);
	var gridY = Math.floor(pointY / TILE_SIZE);
	return grid[gridY][gridX] != 0;
}


// player 

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
	self.socket = param.socket;

	var super_update = self.update;
	self.update = function () {
		self.updateSpd();
		super_update();

		if (self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}
	self.shootBullet = function (angle) {
		Bullet({
			parent: self.id,
			angle: angle,
			x: self.x,
			y: self.y,
		});
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
		}
	}

	Player.list[self.id] = self;
	initPack.player.push(self.getInitPack());
	return self;
}

Player.list = {};
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
	})
}

Player.getAllInitPack = function () {
	var players = [];
	for (var i in Player.list)
		players.push(Player.list[i].getInitPack());
	return players;
}

Player.onDisconnect = function (socket) {
	let player = Player.list[socket.id];
	if (!player)
		return;
	delete Player.list[socket.id];
	removePack.player.push(socket.id);
}

Player.update = function () {
	var pack = [];
	for (var i in Player.list) {
		var player = Player.list[i];
		player.update();
		pack.push(
			player.getUpdatePack()
		);
	}
	return pack;
}

// bullet 



var Bullet = function (param) {
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle;
	self.spdX = Math.cos(param.angle / 180 * Math.PI) * 10;
	self.spdY = Math.sin(param.angle / 180 * Math.PI) * 10;
	self.parent = param.parent;
	self.collisionCount = 0;
	self.toRemove = false;
	var super_update = self.update;
	self.update = function () {
		nextX = self.x + self.spdX;
		nextY = self.y + self.spdY;
		if (isPositionWall(array2D, nextX, nextY)) {
			if (self.collisionCount == 1) self.toRemove = true;
			else self.ricochet(nextX, nextY);
		}
		super_update();

		for (var i in Player.list) {
			var p = Player.list[i];
			if (self.getDistance(p) < 32 && self.parent !== p.id) {
				p.hp -= 1;

				if (p.hp <= 0) {
					var shooter = Player.list[self.parent];
					if (shooter)
						shooter.score += 1;
					p.hp = p.hpMax;
					p.x = Math.random() * MAP_WIDTH;
					p.y = Math.random() * MAP_HEIGHT;
				}
				self.toRemove = true;
			}
		}
	}

	self.getInitPack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			map: self.map,
		};
	}
	self.getUpdatePack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
		};
	}

	self.ricochet = function (pointX, pointY) {
		self.collisionCount++;
		var gridX = Math.floor(pointX / TILE_SIZE);
		var gridY = Math.floor(pointY / TILE_SIZE);

		var leftEdge = gridX * TILE_SIZE;
		var rightEdge = (gridX + 1) * TILE_SIZE;
		var topEdge = gridY * TILE_SIZE;
		var bottomEdge = (gridY + 1) * TILE_SIZE;

		// Calculate distances to each edge from the point of impact
		var distanceToLeft = Math.abs(pointX - leftEdge);
		var distanceToRight = Math.abs(pointX - rightEdge);
		var distanceToTop = Math.abs(pointY - topEdge);
		var distanceToBottom = Math.abs(pointY - bottomEdge);
	
		// Find the minimum distance
		var minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);
	
		// Determine which edge was hit based on the minimum distance
		if (minDistance === distanceToLeft || minDistance === distanceToRight) {
			self.spdX = -self.spdX; // Bounce off a vertical edge
		} else {
			self.spdY = -self.spdY; // Bounce off a horizontal edge
		}	
	}

	Bullet.list[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}
Bullet.list = {};

Bullet.update = function () {
	var pack = [];
	for (var i in Bullet.list) {
		var bullet = Bullet.list[i];
		bullet.update();
		if (bullet.toRemove) {
			delete Bullet.list[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());
	}
	return pack;
}

Bullet.getAllInitPack = function () {
	var bullets = [];
	for (var i in Bullet.list)
		bullets.push(Bullet.list[i].getInitPack());
	return bullets;
}

module.exports = {
	Entity,
	Player,
	Bullet
};