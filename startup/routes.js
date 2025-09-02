const error = require("../middleware/error");
const userApiRoute = require('./../routes/v1/user/User');
const adminApiRoute = require('./../routes/v1/admin/Admin');
const cors = require('cors')
const express = require("express");

module.exports = function (app) {
    app.use(express.json({ limit: '50mb' }));
    app.use(express.urlencoded({ extended: true }));
    app.use(function (req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });
    app.options('*', cors())
    // added routes files
    // app.use(simulateSession);
    app.use("/api/v1/user", userApiRoute);
    app.use("/api/v1/admin", adminApiRoute);
    console.log("route loaded");
    app.use(error);
}

