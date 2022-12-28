var mongoose = require("mongoose");

var UserSchema = new mongoose.Schema({
	userFullName: {type: String, required: true},
	email: {type: String, required: true},
	phone: {type: String, required: true},
	password: {type: String, required: true},
	isConfirmed: {type: Boolean, required: true, default: false},
	confirmOTP: {type: String, required:false},
	otpTries: {type: Number, required:false, default: 0},
	status: {type: Boolean, required: true, default: true}
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);