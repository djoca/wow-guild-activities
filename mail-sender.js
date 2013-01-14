var nodemailer = require("nodemailer");
var fs = require("fs");
var util = require('util');

fs.mkdir("data");
fs.mkdir("conf");

var summary = fs.readFileSync('data/summary.html', 'utf8');

var now = new Date();

var mailConfig = JSON.parse(fs.readFileSync("conf/mail-config.json"));

var smtpTransport = nodemailer.createTransport("SMTP",{
	service: "Gmail",
	auth: {
		user: mailConfig.smtpUser,
		pass: mailConfig.smtpPass
	}
});

var mailOptions = {
	from: mailConfig.from, 
	to: mailConfig.to, 
	subject: util.format("Resumo de %s/%s/%s", now.getDate(), (now.getMonth()+1), now.getFullYear()), 
	html: summary
}

smtpTransport.sendMail(mailOptions, function(error, response){
	if(error){
		console.log(error);
	}else{
		console.log("Message sent: " + response.message);
	}
	smtpTransport.close();
});
