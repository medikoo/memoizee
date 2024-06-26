/* eslint id-length: 0, no-shadow: 0, no-unused-vars: 0 */

"use strict";

var aFrom   = require("es5-ext/array/from")
  , memoize = require("../..");

module.exports = function () {
	return {
		"One arg": function (a) {
			var i = 0
			  , fn = function (x) {
					++i;
					return x;
				}
			  , mfn
			  , y = { toString: function () { return "foo"; } };
			mfn = memoize(fn, { primitive: true });
			a(mfn(y), y, "#1");
			a(mfn("foo"), y, "#2");
			a(i, 1, "Called once");
		},
		"No args": function (a) {
			var i = 0
			  , fn = function () {
					++i;
					return "foo";
				}
			  , mfn
			  , y = { toString: function () { return "foo"; } };
			mfn = memoize(fn);
			a(mfn._has(), false);
			a(mfn(), "foo", "#1");
			a(mfn._has(), true);
			mfn();
			a(i, 1, "Called once");
		},
		"Clear cache": function (a) {
			var i = 0
			  , fn = function (x, y, z) {
					++i;
					return x + y + z;
				}
			  , mfn
			  , y = { toString: function () { return "foo"; } };
			mfn = memoize(fn, { primitive: true });
			a(mfn(y, "bar", "zeta"), "foobarzeta", "#1");
			a(mfn("foo", "bar", "zeta"), "foobarzeta", "#2");
			a(i, 1, "Called once");
			mfn.delete("foo", { toString: function () { return "bar"; } }, "zeta");
			a(mfn(y, "bar", "zeta"), "foobarzeta", "#3");
			a(i, 2, "Called twice");
		},
		"_get": function (a) {
			var fn = function (x) { return x; }, mfn;
			mfn = memoize(fn);
			a(mfn._get("foo"), undefined);
			mfn("foo");
			a(mfn._get("foo"), "foo");
		},
		"_has": function (a) {
			var fn = function (x) { return x; }, mfn;
			mfn = memoize(fn);
			a(mfn._has("foo"), false);
			mfn("foo");
			a(mfn._has("foo"), true);
		},
		"Circular": function (a) {
			var i = 0, fn;
			fn = memoize(function (x) { if (++i < 2) fn(x); });
			a.throws(function () { fn("foo"); }, "CIRCULAR_INVOCATION");

			i = 0;
			fn = memoize(function (x, y) { if (++i < 2) fn(x, y); });
			a.throws(function () { fn("foo", "bar"); }, "CIRCULAR_INVOCATION");
		},
		"Resolvers": function () {
			var i = 0, fn, r;
			fn = memoize(
				function () {
					++i;
					return arguments;
				},
				{ length: 3, resolvers: [Boolean, String] }
			);
			return {
				"No args": function (a) {
					i = 0;
					a.deep(aFrom((r = fn())), [false, "undefined"], "First");
					a(fn(), r, "Second");
					a(fn(), r, "Third");
					a(i, 1, "Called once");
				},
				"One arg": function (a) {
					var fn = memoize(
						function (elo) {
							++i;
							return arguments;
						},
						{ resolvers: [Boolean] }
					);
					a.deep(aFrom((r = fn("elo"))), [true], "First");
				},
				"Some Args": function (a) {
					var x = {};
					i = 0;
					a.deep(aFrom((r = fn(0, 34, x, 45))), [false, "34", x, 45], "First");
					a(fn(0, 34, x, 22), r, "Second");
					a(fn(0, 34, x, false), r, "Third");
					a(i, 1, "Called once");
					return {
						Other: function (a) {
							a.deep(aFrom((r = fn(1, 34, x, 34))), [true, "34", x, 34], "Second");
							a(fn(1, 34, x, 89), r, "Third");
							a(i, 2, "Called once");
						},
					};
				},
			};
		},
	};
};
