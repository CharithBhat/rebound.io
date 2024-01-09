const { Entity} = require('./entity');
const {playerList,upgradeList,initPack, removePack} = require('./global');
const {
	TILE_SIZE,
	array2D,
	randomNonWallTile
} = require('./collision-map');

const BUFF_DURATION = 30000; // 30 seconds

var Upgrade = function (param) {
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


	self.update = function () {
		for (var i in playerList) {
			var player = playerList[i];
			if (self.getDistance(player) < 32 + self.radius) {
				self.applyEffect(player, self.upgradeName);
				self.toRemove = true;
			}
		}
	}

	// Example applyEffect function within Upgrade
	self.applyEffect = function (player, upgradeName) {
		switch (upgradeName) {

			// buffs
			case 'bullet speed': // currently not using
				player.bulletSpeed *= 2;
				setTimeout(() => {
					player.bulletSpeed /= 2;
				}, BUFF_DURATION);
				break;
			case 'bulletSize':
				player.bulletRadius *= 2;
				setTimeout(() => {
					player.bulletRadius /= 2;
				}, BUFF_DURATION);
				break;
			case 'bulletFireRate':
				player.fireRate /= 2;
				setTimeout(() => {
					player.fireRate *= 2;
				}, BUFF_DURATION);
				break;
			case 'immunity':
				player.isImmune = true;
				setTimeout(() => {
					player.isImmune = false;
				}, BUFF_DURATION);
				break;
			case 'healthRestore':
				player.hp = player.hpMax;
				break;

				// guns
			case 'tripleShot':
				player.isTripleShot = true;
				setTimeout(() => {
					player.isTripleShot = false;
				}, BUFF_DURATION);
				break;
			case 'phoenixShot':
				player.isPhoenixShot = true;
				setTimeout(() => {
					player.isPhoenixShot = false;
				}, BUFF_DURATION);
				break;
			case 'doubleRebounder':
				player.isDoubleRebounder = true;
				setTimeout(() => {
					player.isDoubleRebounder = false;
				}, BUFF_DURATION);
				break;
			default:
				console.log('Unknown upgrade:', upgradeName);
		}
		self.toRemove = true; // remove the upgrade from the canvas
	}


	self.getInitPack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			type: self.type,
			radius: self.radius,
			upgradeName: self.upgradeName,
		};
	}
	self.getUpdatePack = function () {
		return {
			id: self.id,
			x: self.x,
			y: self.y,
			type: self.type,
			radius: self.radius,
			upgradeName: self.upgradeName,
		};
	}

	upgradeList[self.id] = self;
	initPack.upgrade.push(self.getInitPack());
	return self;
}


Upgrade.update = function () {
	var pack = [];
	for (var i in upgradeList) {
		var upgrade = upgradeList[i];
		upgrade.update();
		if (upgrade.toRemove) {
			delete upgradeList[i];
			removePack.upgrade.push(upgrade.id);
		} else
			pack.push(upgrade.getUpdatePack());
	}
	return pack;
}

Upgrade.getAllInitPack = function () {
	var upgrades = [];
	for (var i in upgradeList)
		upgrades.push(upgradeList[i].getInitPack());
	return upgrades;
}

getRandomUpgrade = function (type) {

	// removed bullet speed, its too fast, bullet goes deep into wall and delete
	const buffUpgrade = ['immunity', 'healthRestore'];
	const gunUpgrade = ['tripleShot', 'phoenixShot', 'doubleRebounder', 'bulletSize', 'bulletFireRate'];

	let availableUpgrade = type === 'buff' ? buffUpgrade : gunUpgrade;
	let randomIndex = Math.floor(Math.random() * availableUpgrade.length);

	return availableUpgrade[randomIndex];
}

// Spawning upgrades
setInterval(function () {
	var type = Math.random() < 0.28 ? 'buff' : 'gun';
	var spawnTile = randomNonWallTile();
	Upgrade({
		radius: 32,
		type: type,
		x: spawnTile.x * TILE_SIZE + TILE_SIZE / 2,
		y: spawnTile.y * TILE_SIZE + TILE_SIZE / 2,
	});
}, 10000); // Every 10 seconds

module.exports = {
	Upgrade,
};
