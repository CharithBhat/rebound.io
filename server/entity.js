const {
	TILE_SIZE,
	array2D,
	randomNonWallTile
} = require('./collision-map');

var initPack = {
	player: [],
	bullet: [],
	upgrade: [],
};
var removePack = {
	player: [],
	bullet: [],
	upgrade: [],
};

var MAP_WIDTH = array2D[0].length * TILE_SIZE;
var MAP_HEIGHT = array2D.length * TILE_SIZE;

const BUFF_DURATION = 5000; // 5 seconds

Entity = function (param) {
	var spawnTile = randomNonWallTile();
	var self = {
		x: spawnTile.x * TILE_SIZE + TILE_SIZE / 2, // TILE_SIZE/2 is just to center the player on the tile. so it looks good
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
			upgrade: initPack.upgrade,
			
		},
		removePack: {
			player: removePack.player,
			bullet: removePack.bullet,
			upgrade: removePack.upgrade,
		},
		updatePack: {
			player: Player.update(),
			bullet: Bullet.update(),
			upgrade: Upgrade.update(),
		}
	};
	initPack.player = [];
	initPack.bullet = [];
	initPack.upgrade = [];
	removePack.player = [];
	removePack.bullet = [];
	removePack.upgrade = [];
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

	// buff related metrics related metrics
	self.fireRate = 500;  // 1000ms = 1 shot/s, 500 = 2 shots/s
	self.nextShotTime = 0;
	self.bulletSpeed = 10;
	self.isImmune = false;

	var super_update = self.update;
	self.update = function () {
		self.updateSpd();
		super_update();

		if (self.pressingAttack) {
			self.shootBullet(self.mouseAngle);
		}
	}

	self.shootBullet = function (angle) {
		var currentTime = Date.now();
		if (currentTime > self.nextShotTime) {
			Bullet({
				parent: self.id,
				angle: angle,
				x: self.x,
				y: self.y,
				bulletSpeed: self.bulletSpeed,
			});
	
			self.nextShotTime = currentTime + self.fireRate; // Set the next allowed shot time
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
		upgrade: Upgrade.getAllInitPack(),
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
	self.spdX = Math.cos(param.angle / 180 * Math.PI) * param.bulletSpeed;
	self.spdY = Math.sin(param.angle / 180 * Math.PI) * param.bulletSpeed;
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

		if(self.collisionCount > 0){ // player harmed by ricochet's only
			for (var i in Player.list) {
				var p = Player.list[i];
				if (self.getDistance(p) < 32 && self.parent !== p.id) {
					p.hp -= 1;
	
					if (p.hp <= 0) {
						var shooter = Player.list[self.parent];
						if (shooter)
							shooter.score += 1;
						p.hp = p.hpMax;
						var spawnTile = randomNonWallTile();
						p.x = spawnTile.x * TILE_SIZE + TILE_SIZE / 2; // TILE_SIZE/2 is just to center the player on the tile. so it looks good
						p.y = spawnTile.y * TILE_SIZE + TILE_SIZE / 2;
					}
					self.toRemove = true;
				}
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

var Upgrade = function(param){
	var self = Entity(param);
	self.id = Math.random();
	self.toRemove = false;
	self.radius = param.radius;
	self.type = param.type;
	self.upgradeName = getRandomUpgrade(param.type);

	// Despawn after 15 seconds
    setTimeout(function () {
        self.toRemove = true;
    }, 15000);

	self.update = function(){
		for (var i in Player.list) {
			var player = Player.list[i];
			if(self.getDistance(player) < 32){
				self.applyEffect(player, self.type);
				self.toRemove = true;
			}
		}
	}

	// Example applyEffect function within Upgrade
self.applyEffect = function(player, upgradeName){

    // Apply the effect based on the upgrade name
    switch(upgradeName) {

		// buffs
        case 'bullet speed':
            player.bulletSpeed += 5; 
			setTimeout(() => {
                player.bulletSpeed -= 5;
            }, BUFF_DURATION); 
            break;
        case 'bullet size':
            player.bulletSize += 2; 
			setTimeout(() => {
                player.bulletSize -= 2;
            }, BUFF_DURATION); 
            break;
		case 'bullet fireRate':
			player.fireRate /= 2; // Example: Fire twice as often
            setTimeout(() => {
                player.fireRate *= 2; // Revert fire rate after 5 seconds
            }, BUFF_DURATION);
            break;
        case 'immunity':
            player.isImmune = true;
            setTimeout(() => {
                player.isImmune = false;
            }, 5000); // Immunity for 5 seconds
            break;
        case 'health restore':
            player.hp = player.hpMax;
            break;

		// guns
        case 'penta shot':
            player.gunType = 'penta shot';
            break;
        case 'phoenix shot':
            player.gunType = 'phoenix shot';
            break;
        case 'double rebounder':
            player.gunType = 'double rebounder';
            break;
        default:
            console.log('Unknown upgrade:', upgradeName);
    }
    self.toRemove = true; // remove the upgrade from the canvas
}


	self.getRandomUpgrade = function(type) {
		const buffUpgrade = ['bullet speed', 'bullet size', 'immunity', 'health restore'];
		const gunUpgrade = ['penta shot', 'phoenix shot', 'double rebounder'];
	
		let availableUpgrade = type === 'buff' ? buffUpgrade : gunUpgrade;
		let randomIndex = Math.floor(Math.random() * availableUpgrade.length);
	
		return availableUpgrade[randomIndex];
	}

	self.getInitPack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			type: self.type,
			radius: self.radius,
		};
	}
	self.getUpdatePack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			type: self.type,
			radius: self.radius,
		};
	}

	Upgrade.list[self.id] = self;
	initPack.upgrade.push(self.getInitPack());
    return self;
}

Upgrade.list = {};

Upgrade.update = function () {
	var pack = [];
	for (var i in Upgrade.list) {
		var upgrade = Upgrade.list[i];
		upgrade.update();
		if (upgrade.toRemove) {
			delete Upgrade.list[i];
			removePack.upgrade.push(upgrade.id);
		} else
			pack.push(upgrade.getUpdatePack());
	}
	return pack;
}

Upgrade.getAllInitPack = function () {
	var upgrades = [];
	for (var i in Upgrade.list)
		upgrades.push(Upgrade.list[i].getInitPack());
	return upgrades;
}

// Spawning upgrades
setInterval(function () {
    var type = Math.random() < 0.5 ? 'buff' : 'gun';
    var spawnTile = randomNonWallTile();
    Upgrade({
		radius: 32,
        type: type,
        x: spawnTile.x * TILE_SIZE + TILE_SIZE / 2,
        y: spawnTile.y * TILE_SIZE + TILE_SIZE / 2,
    });
}, 10000); // Every 10 seconds

module.exports = {
	Entity,
	Player,
	Bullet,
	Upgrade
};