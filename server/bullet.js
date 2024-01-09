const { Entity} = require('./entity');
const {playerList, bulletList ,initPack, removePack, isPositionWall} = require('./global');
const {
	TILE_SIZE,
	array2D,
	randomNonWallTile
} = require('./collision-map');

var Bullet = function (param) {
	var self = Entity(param);
	self.id = Math.random();
	self.angle = param.angle;
	self.spdX = Math.cos(param.angle / 180 * Math.PI) * param.bulletSpeed;
	self.spdY = Math.sin(param.angle / 180 * Math.PI) * param.bulletSpeed;
	self.parent = param.parent;
	self.collisionCount = 0;
	self.toRemove = false;
	self.radius = param.bulletRadius;
	self.collisionCap = param.collisionCap;
	self.bulletRadius = param.bulletRadius;

	var super_update = self.update;
	self.update = function () {
		nextX = self.x + self.spdX;
		nextY = self.y + self.spdY;
		if (isPositionWall(array2D, nextX, nextY)) {
			if (self.collisionCount === self.collisionCap) {
				self.toRemove = true;
			} else self.ricochet(nextX, nextY);
		}
		super_update();

		if (self.collisionCount > 0) { // player harmed by ricochet's only
			for (var i in playerList) {
				var p = playerList[i];
				if (self.getDistance(p) < 22 + self.bulletRadius && self.parent !== p.id) {
					if (!p.isImmune) p.hp -= 1;
					p.isHit = true;
					p.hitTime = Date.now();
					if (p.hp <= 0) {
						self.resetUpgradeEffects(p);
						p.score = 0;
						var shooter = playerList[self.parent];
						if (shooter)
							shooter.score += 1;
						p.hp = p.hpMax;
						var spawnTile = randomNonWallTile();
						p.x = spawnTile.x * TILE_SIZE + TILE_SIZE / 2; // TILE_SIZE/2 is just to center the player on the tile. so it looks good
						p.y = spawnTile.y * TILE_SIZE + TILE_SIZE / 2;
					}
					self.toRemove = true; // not  always
				}
			}
		}
	}

	self.resetUpgradeEffects = function(player) {
		player.fireRate = 500; // 1000ms = 1 shot/s, 500 = 2 shots/s
		player.nextShotTime = 0;
		player.bulletSpeed = 10;
		player.bulletRadius = 10;
		player.isImmune = false;
		// gun related
		player.isTripleShot = false;
		player.isPhoenixShot = false;
		player.isDoubleRebounder = false;
	}

	self.getInitPack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			radius: self.radius,
			parent: self.parent,
			collisionCount: self.collisionCount,
		};
	}
	self.getUpdatePack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			radius: self.radius,
			parent: self.parent,
			collisionCount: self.collisionCount,
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

		const BUFFER = 10;
		var neighborLeft = gridX > 0 && isPositionWall(array2D, pointX - TILE_SIZE, pointY);
		var neighborRight = gridX < array2D[0].length - 1 && isPositionWall(array2D, pointX + TILE_SIZE, pointY);
		var neighborBottom = gridY < array2D.length - 1 && isPositionWall(array2D, pointX, pointY + TILE_SIZE);
		var neighborTop = gridY < array2D.length - 1 && isPositionWall(array2D, pointX, pointY - TILE_SIZE);
		// corner case
		if ((distanceToLeft < BUFFER || distanceToRight < BUFFER) && distanceToBottom < BUFFER) {

			if (((distanceToLeft < BUFFER && neighborLeft === false) || (distanceToRight < BUFFER && neighborRight === false)) && neighborBottom === false) {
				self.spdX = -self.spdX;
				self.spdY = -self.spdY;
				return;
			}
			if (neighborBottom === false) self.spdY = -self.spdY;
			else self.spdX = -self.spdX;
			return;
		} else if ((distanceToLeft < BUFFER || distanceToRight < BUFFER) && distanceToTop < BUFFER) {

			if (((distanceToLeft < BUFFER && neighborLeft === false) || (distanceToRight < BUFFER && neighborRight === false)) && neighborTop === false) {
				self.spdX = -self.spdX;
				self.spdY = -self.spdY;
				return;
			}
			if (neighborTop === false) self.spdY = -self.spdY;
			else self.spdX = -self.spdX;
			return;
		}
		// non corner cases
		var minDistance = Math.min(distanceToLeft, distanceToRight, distanceToTop, distanceToBottom);

		if (minDistance === distanceToLeft || minDistance === distanceToRight) {
			self.spdX = -self.spdX;
		} else {
			self.spdY = -self.spdY;
		}
	}


	bulletList[self.id] = self;
	initPack.bullet.push(self.getInitPack());
	return self;
}

Bullet.update = function () {
	var pack = [];
	for (var i in bulletList) {
		var bullet = bulletList[i];
		bullet.update();
		if (bullet.toRemove) {
			delete bulletList[i];
			removePack.bullet.push(bullet.id);
		} else
			pack.push(bullet.getUpdatePack());
	}
	return pack;
}

Bullet.getAllInitPack = function () {
	var bullets = [];
	for (var i in bulletList)
		bullets.push(bulletList[i].getInitPack());
	return bullets;
}

module.exports = {
	Bullet,
};