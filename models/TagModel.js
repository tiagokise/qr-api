var mongoose = require("mongoose");

var Schema = mongoose.Schema;

var TagSchema = new Schema({
	name: {type: String, required: true},
	description: {type: String, required: true},
	qrCode: {type: String, required: true},
	user: { type: Schema.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Tag", TagSchema);