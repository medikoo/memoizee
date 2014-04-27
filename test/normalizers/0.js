'use strict';

var memoize = require('../..');

module.exports = {
	"": function (a) {
		var i = 0, fn = function () { ++i; return 3; };

		fn = memoize(fn);
		a(fn(), 3, "First");
		a(fn(1), 3, "Second");
		a(fn(5), 3, "Third");
		a(i, 1, "Called once");
	},
	"Delete": function (a) {
		var i = 0, fn, mfn, x = {};

		fn = function (a, b, c) {
			return a + (++i);
		};
		mfn = memoize(fn, { length: 0 });
		a(mfn(3), 4, "Init");
		a(mfn(5), 4, "Other");
		a(i, 1, "Pre clear");
		mfn.delete(6, x, 1);
		a(i, 1, "After clear");
		a(mfn(6, x, 1), 8, "Reinit");
		a(i, 2, "Reinit count");
		a(mfn(3, x, 1), 8, "Reinit Cached");
		a(i, 2, "Reinit count");
	}
};
