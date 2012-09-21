'use strict';

var memoize  = require('../../lib')

module.exports = function (a) {
	return  {
		"Regular": function (a) {
			var i = 0, fn = function (x, y, z) { ++i; return x + y + z; }, mfn;
			mfn = memoize(fn, { refCounter: true });
			a(mfn.clearRef(3, 5, 7), null, "Clear before");
			a(mfn(3, 5, 7), 15, "Initial");
			a(mfn(3, 5, 7), 15, "Cache");
			a(mfn.clearRef(3, 5, 7), false, "Clear #1");
			mfn(3, 5, 7);
			a(mfn.clearRef(3, 5, 7), false, "Clear #2");
			mfn(3, 5, 7);
			a(mfn.clearRef(3, 5, 7), false, "Clear #3");
			mfn(3, 5, 7);
			a(i, 1, "Not cleared");
			a(mfn.clearRef(3, 5, 7), false, "Clear #4");
			a(mfn.clearRef(3, 5, 7), true, "Clear final");
			mfn(3, 5, 7);
			a(i, 2, "Restarted");
			mfn(3, 5, 7);
			a(i, 2, "Cached again");
		},
		"Primitive": function (a) {
			var i = 0, fn = function (x, y, z) { ++i; return x + y + z; }, mfn;
			mfn = memoize(fn, { primitive: true, refCounter: true });
			a(mfn.clearRef(3, 5, 7), null, "Clear before");
			a(mfn(3, 5, 7), 15, "Initial");
			a(mfn(3, 5, 7), 15, "Cache");
			a(mfn.clearRef(3, 5, 7), false, "Clear #1");
			mfn(3, 5, 7);
			a(mfn.clearRef(3, 5, 7), false, "Clear #2");
			mfn(3, 5, 7);
			a(mfn.clearRef(3, 5, 7), false, "Clear #3");
			mfn(3, 5, 7);
			a(i, 1, "Not cleared");
			a(mfn.clearRef(3, 5, 7), false, "Clear #4");
			a(mfn.clearRef(3, 5, 7), true, "Clear final");
			mfn(3, 5, 7);
			a(i, 2, "Restarted");
			mfn(3, 5, 7);
			a(i, 2, "Cached again");
		}
	};
};
