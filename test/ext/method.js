'use strict';

var memoize  = require('../../lib');

module.exports = function () {
	return {
		"No descriptor": function (a) {
			var x = {}, i = 0, fn = function () {
				++i;
				return this;
			};

			Object.defineProperties(x, memoize(fn, { method: 'foo' }));
			a(x.foo(), x, "Context");
			a(x.foo(), x, "Method");
			a(i, 1, "Cached");
		},
		"Descriptor": function (a) {
			var x = {}, i = 0, fn = function () {
				++i;
				return this;
			};

			Object.defineProperties(x, memoize(fn,
				{ method: 'foo', writable: false }));
			a(x.foo(), x, "Context");
			a.deep(Object.getOwnPropertyDescriptor(x, 'foo'),
				{ enumerable: false, configurable: true, writable: false,
					value: x.foo });
			a(x.foo(), x, "Method");
			a(i, 1, "Cached");
		}
	};
};
