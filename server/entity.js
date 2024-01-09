const {
	TILE_SIZE,
	array2D,
	randomNonWallTile
} = require('./collision-map');

const {isPositionWall} = require('./global');

// init and remove pack

var MAP_WIDTH = array2D[0].length * TILE_SIZE;
var MAP_HEIGHT = array2D.length * TILE_SIZE;


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

module.exports = {
	Entity,
};