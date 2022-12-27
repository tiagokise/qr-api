var express = require("express");
var authRouter = require("./auth");
var tagRouter = require("./tag");

var app = express();

app.use("/auth/", authRouter);
app.use("/tag/", tagRouter);

module.exports = app;