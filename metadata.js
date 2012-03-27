var http = require('http');
var fs = require('fs');
var util = require('util');

console.log('Retrieving metadata');

fs.mkdir("data");
fs.mkdir("conf");

var achievFile = 'data/achievements.json';
var achievPath = '/api/wow/data/character/achievements/';

var classFile = 'data/classes.json';
var classPath = '/api/wow/data/character/classes/';

var raceFile = 'data/races.json';
var racePath = '/api/wow/data/character/races/';

function errorHandler(e) {
    console.log(e.message);
}

function bnetRequest(apiPath, callback) {

	opts = {
		host: 'us.battle.net',
		port: 80,
		path: apiPath
	};

    http.get(opts, function(res) {

		var data = '';
	
		res.on('data', function(c) {
			data += c;
		});
	
		res.on('end', function() {
			callback(data);
		});
	
    }).on('error', errorHandler);
}

function writeFile(fileName, data) {
	console.log(util.format('Writing %s', fileName));
	
	fs.writeFile(fileName, data, function (err) {
		if (err) throw err;
	});
}

function metadataRequest(callback) {
	bnetRequest(achievPath, function(achievs) {
		writeFile(achievFile, achievs);
	});
	
	bnetRequest(classPath, function(classes) {
		writeFile(classFile, classes);
	});
	
	bnetRequest(racePath, function(races) {
		writeFile(raceFile, races);
	});
}

function achievLoad(callback) {
	var achievements = '';
	
	fs.readFile(achievFile, function (err, data) {
    	if (err) throw err;
  		achievements = JSON.parse(data);
  		console.log(achievements);
	});
}

metadataRequest();
//achievLoad();




