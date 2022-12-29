const nodemailer = require("nodemailer");

let transporter = nodemailer.createTransport({
	host: process.env.EMAIL_SMTP_HOST,
	port: process.env.EMAIL_SMTP_PORT,
	auth: { user: process.env.EMAIL_SMTP_USERNAME, pass: process.env.EMAIL_SMTP_PASSWORD }
});

exports.send = function (from, to, subject, html){
	return transporter.sendMail({ from, to, subject, html });
};