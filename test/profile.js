'use strict';

var memoize = require('../lib/memoize');

module.exports = function (t, a) {
	a(typeof memoize._profile, 'function', "Set on memoize");
	a(typeof t.statistics, 'object', "Access to statistics");
	a(typeof t.log, 'function', "Access to log function");
};
