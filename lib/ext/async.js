'use strict';

var toArray    = require('es5-ext/lib/Array/from')
  , last       = require('es5-ext/lib/Array/prototype/last')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , nextTick   = require('next-tick')

  , isArray = Array.isArray, slice = Array.prototype.slice
  , apply = Function.prototype.apply;

require('../_base').ext.async = function (ignore, conf, options) {
	var cache;

	cache = conf.async = {};

	(function (org) {
		var value, cb;

		conf.on('init', function (id) {
			value.id = id;
			cache[id] = cb ? [cb] : [];
		});

		conf.on('hit', function (id) {
			if (!cb) {
				return;
			}

			if (isArray(cache[id])) {
				cache[id].push(cb);
			} else {
				nextTick(apply.bind(cb, cache[id].context, cache[id]));
			}
		});
		conf.fn = function () {
			var id, args, asyncArgs;
			args = arguments;
			asyncArgs = toArray(args);
			asyncArgs.push(value = function self(err) {
				var i, cb, waiting, res;
				if (self.id == null) {
					// Shouldn't happen, means async callback was called sync way
					nextTick(apply.bind(self, this, arguments));
					return;
				}
				waiting = cache[self.id];
				if (err) {
					conf.clear(self.id);
				} else {
					arguments.context = this;
					cache[self.id] = arguments;
				}
				for (i = 0; cb = waiting[i]; ++i) {
					res = apply.call(cb, this, arguments);
				}
				return res;
			});
			return apply.call(org, this, asyncArgs);
		};

		(function (fn) {
			var resolver = function (args) {
				cb = last.call(args);
				if (isCallable(cb)) {
					return slice.call(args, 0, -1);
				} else {
					cb = null;
					return args;
				}
			};
			conf.memoized = function () {
				return fn.apply(this, resolver(arguments));
			};
			forEach(fn, function (value, name) {
				memoized[name] = function () {
					return fn[name].apply(this, resolver(arguments));
				};
			});

		}(conf.memoized));

	}(conf.fn));

	conf.on('purge', function (id) {
		delete cache[id];
	});

	conf.on('purgeall', function () {
		cache = conf.async = {};
	});
};
