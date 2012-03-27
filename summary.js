var http = require('http');
var fs = require('fs');
var util = require('util');
var jpath = require('JSONPath');

console.log('Retrieving guild activities');

fs.mkdir("data");
fs.mkdir("conf");

var summaryConfig = JSON.parse(fs.readFileSync("conf/summary-config.json"));

var realm = summaryConfig.realm;
var guildName = summaryConfig.guild;

var charPath = util.format('/api/wow/character/%s/', encodeURIComponent(realm));
var guildPath = util.format('/api/wow/guild/%s/%s?fields=members', encodeURIComponent(realm), encodeURIComponent(guildName));
var imgPath = '/static-render/us/%s';

var yesterday = new Date();
yesterday.setDate(yesterday.getDate()-1);

// Prevents 'socket hang up' errors
http.globalAgent.maxSockets = 1024;

// Summary

function Summary() {
	this.headerHTML = fs.readFileSync('conf/header.html','utf8');
	this.guildHTML = fs.readFileSync('conf/guild.html','utf8');
	this.charHTML = fs.readFileSync('conf/char.html','utf8');
	this.achievHTML = fs.readFileSync('conf/achiev.html','utf8');
	this.footerHTML = fs.readFileSync('conf/footer.html','utf8');

	this.html = this.headerHTML;
}

Summary.prototype.addGuild = function(guild) {
	this.html += util.format(this.guildHTML, guild.name, guild.level);
}

Summary.prototype.addChar = function(name, ch, raceName, className) {
	this.html += util.format(this.charHTML, util.format(imgPath, ch.thumbnail), encodeURIComponent(realm), ch.name, name, ch.level, raceName, className);
}

Summary.prototype.addAchiev = function(achiev) {
	this.html += util.format(this.achievHTML, achiev.id, achiev.title);
}

Summary.prototype.addFooter = function() {
	this.html += this.footerHTML;
}

Summary.prototype.add = function(string) {
	this.html += string + '\n';
}

Summary.prototype.send = function() {
	console.log(this.html);
}

var summary = new Summary();

// Bnet Request

function Bnet() {
}

Bnet.prototype.errorHandler = function(e) {
	console.log(e.message);
}

Bnet.prototype.request = function(apiPath, callback) {

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
	
	}).on('error', this.errorHandler);
}

// Character

function Char(charName) {
	this.name = charName;
}

Char.prototype.handler = function(data) {
	var c = JSON.parse(data);

	var ganhouAchiev = jpath.eval(c.achievements, util.format('$..achievementsCompletedTimestamp[?(@>%s)]', yesterday.getTime()));

	if (ganhouAchiev && ganhouAchiev.length == 0) {
		return;
	}
	
	// ignore inactive characters
	if (c.status == 'nok')
		return;
		
	var charName = '';
	var titleName = '';
		
	// handle title and name  
	if (c.titles && c.titles.length > 0) {
		var title = jpath.eval(c.titles, '$..[?(@.selected==true)]')[0];
		if (title && title.name) {
        		charName = util.format(title.name, c.name);
		}
	}

	// char has no title
	if (!charName || charName.length ==0) {
		charName = c.name;
	}

	// handle level, class and race
	var className = jpath.eval(classes, util.format('$..classes[?(@.id==%s)]', c.class))[0].name;
	var raceName = jpath.eval(races, util.format('$..races[?(@.id==%s)]', c.race))[0].name;
	
	summary.addChar(charName, c, raceName, className);

	// handle achievements
	// TODO Not optimized code. I know it can be better!
	for (var a in c.achievements.achievementsCompleted) {
		var achievId = c.achievements.achievementsCompleted[a];
		var achievTime = c.achievements.achievementsCompletedTimestamp[a];
		var achiev = jpath.eval(achievements, util.format('$..achievements[?(@.id==%s && @.title)]', achievId))[0];
		
		if (achievTime > yesterday) {
			summary.addAchiev(achiev);
		}

	}
}

Char.prototype.request = function() {
	var path = charPath + this.name + '?fields=achievements,titles,charHandler';
	new Bnet().request(path, this.handler);
}

// GUILD

function guildHandler(data) {
    var g = JSON.parse(data);

    var i = 0;
    
    summary.addGuild(g);

	var requests = new Array();

    for (var m in g.members) {
        var c = g.members[m].character;
        new Char(c.name).request();
    }

}

function guildRequest() {
    new Bnet().request(guildPath, guildHandler);
}

var achievements = JSON.parse(fs.readFileSync('data/achievements.json'));
var classes = JSON.parse(fs.readFileSync('data/classes.json'));
var races = JSON.parse(fs.readFileSync('data/races.json'));

guildRequest();

process.on('exit', function () {
	summary.addFooter();
	fs.writeFileSync('data/summary.html', summary.html, 'utf8');
});
