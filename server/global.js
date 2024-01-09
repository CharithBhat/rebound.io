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

isPositionWall = function (grid, pointX, pointY) {
	var gridX = Math.floor(pointX / TILE_SIZE);
	var gridY = Math.floor(pointY / TILE_SIZE);
	return grid[gridY][gridX] != 0;
}

// Player.list = {}; 
var playerList = {};
var bulletList = {};
var upgradeList = {};

module.exports = {
    playerList,
    bulletList,
    upgradeList,
    initPack,
    removePack,
    isPositionWall,
};