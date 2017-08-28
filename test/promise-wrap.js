"use strict";

var deferred = require("deferred");

module.exports = function (cb) {
	var def = deferred();
	cb(def.resolve, def.reject);
	return def.promise;
};
