const HelperUtils = require("../utils/helpers");

module.exports = function (err, req, res, next) {
    res.status(500).send(HelperUtils.errorObj(err.message, err));
};