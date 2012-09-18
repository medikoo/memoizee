'use strict';

// Simple benchmark for very simple memoization case (fibonacci series)
// To run it, do following in memoizee package path:
//
// $ npm install bench underscore lodash lru-cache
// $ node benchmark/fibonacci.js

var getFib = function (memoize, opts) {
	var fib = memoize(function (x) {
		return (x < 2) ? 1 : fib(x - 1) + fib(x - 2);
	}, opts);
	return fib;
};

var memoizee = getFib(require('../lib/memoize'), { primitive: true })
  , underscore = getFib(require('underscore').memoize)
  , lodash = getFib(require('lodash').memoize)

  , index = 200;

var lruCache = require('lru-cache')({});

var lru = function (x) {
	var value = lruCache.get(x);
	if (value === undefined) {
		value = ((x < 2) ? 1 : lru(x - 1) + lru(x - 2));
		lruCache.set(x, value);
	}
	return value;
};

exports.compare = {
	"Underscore": function () {
		underscore(index);
	},
	"Lodash": function () {
		lodash(index);
	},
	"Memoizee": function () {
		memoizee(index);
	},
	"LruCache": function () {
		lru(index);
	}
};

require('bench').runMain();
