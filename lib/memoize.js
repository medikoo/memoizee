'use strict';

var global     = require('es5-ext/lib/global')
  , toArray    = require('es5-ext/lib/Array/from')
  , indexOf    = require('es5-ext/lib/Array/prototype/e-index-of')
  , last       = require('es5-ext/lib/Array/prototype/last')
  , callable   = require('es5-ext/lib/Object/valid-callable')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , isString   = require('es5-ext/lib/String/is-string')
  , nextTick   = require('next-tick')

  , isArray = Array.isArray, join = Array.prototype.join
  , map = Array.prototype.map, push = Array.prototype.push
  , slice = Array.prototype.slice, apply = Function.prototype.apply
  , create = Object.create, defineProperty = Object.defineProperty

  , resolve, memoize, id = 0;

resolve = function (args) {
	return this.map(function (r, i) {
		return r ? r(args[i]) : args[i];
	}).concat(slice.call(args, this.length));
};

// Results are saved internally within array matrix:
// [0] -> Result of calling function with no arguments
// [1] -> Matrix that keeps results when function is called with one argument
//       [1][0] -> Array of arguments with which
//                 function have been called
//       [1][1] -> Array of results that matches [1][0] array
// [2] -> Matrix that keeps results when function is called with two arguments
//        [2][0] -> Array of first (of two) arguments with which
//                function have been called
//        [2][1] -> Matrixes that keeps results for two arguments function calls
//                  Each matrix matches first argument found in [2][0]
//                  [2][1][x][0] -> Array of second arguments with which
//                                  function have been called.
//                   [2][1][x][1] -> Array of results that matches [2][1][x][0]
//                                   arguments array
// ...and so on

memoize = module.exports = function (fn) {
	var mfn, options, length, resolver, method, cache, find, save, clear
	  , value, primitive, getPrimitiveId, profile, refCounter, async, initAsync;

	callable(fn);
	if (fn.memoized) {
		// Prevent memoization of already memoized function
		return fn;
	}

	options = Object(arguments[1]);

	async = Boolean(options.async);
	if (isNaN(options.length)) {
		length = fn.length;
		if (async) {
			--length;
		}
	} else if (options.length === false) {
		length = options.length;
	} else {
		length = Number(options.length);
	}
	if (options.resolvers) {
		resolver = toArray(options.resolvers);
		resolver.forEach(function (r) {
			(r == null) || callable(r);
		});
		resolver = resolve.bind(resolver);
	}
	if (options.method) {
		if (isString(options.method)) {
			method = { name: String(options.method),
				descriptor: { configurable: true, writable: true } }
		} else {
			method = options.method;
			method.name = String(method.name);
			method.descriptor = (method.descriptor == null) ?
				{ configurable: true, writable: true } : Object(method.descriptor);
		}
		options = create(options);
		options.method = undefined;
	}
	primitive = Boolean(options.primitive);
	refCounter = Boolean(options.refCounter);

	cache = primitive ? {} : [];

	if (memoize._profile) {
		profile = memoize._profile();
	}

	find =  function (length, args) {
		var index = 0, rset = cache, i;

		if (length === 0) {
			value = rset[length];
			return rset.hasOwnProperty(length);
		} else if ((rset = rset[length])) {
			while (index < (length - 1)) {
				i = indexOf.call(rset[0], args[index]);
				if (i === -1) {
					return false;
				}
				rset = rset[1][i];
				++index;
			}
			i = indexOf.call(rset[0], args[index]);
			if (i === -1) {
				return false;
			}
			value = rset[1][i];
			return true;
		}
		return false;
	};

	save = function (length, args, value) {
		var index = 0, rset = cache, i;

		if (length === 0) {
			rset[length] = value;
		} else {
			if (!rset[length]) {
				rset[length] = [[], []];
			}
			rset = rset[length];
			while (index < (length - 1)) {
				i = indexOf.call(rset[0], args[index]);
				if (i === -1) {
					i = rset[0].push(args[index]) - 1;
					rset[1].push([[], []]);
				}
				rset = rset[1][i];
				++index;
			}
			i = indexOf.call(rset[0], args[index]);
			if (i === -1) {
				i = rset[0].push(args[index]) - 1;
			}
			rset[1][i] = value;
		}
	};

	clear = function (length, args) {
		var index = 0, rset = cache, i, path = [], value;

		if (length === 0) {
			delete rset[length];
		} else if ((rset = rset[length])) {
			while (index < (length - 1)) {
				i = indexOf.call(rset[0], args[index]);
				if (i === -1) {
					return;
				}
				path.push(rset, i);
				rset = rset[1][i];
				++index;
			}
			i = indexOf.call(rset[0], args[index]);
			if (i === -1) {
				return;
			}
			rset[0].splice(i, 1);
			rset[1].splice(i, 1);
			while (!rset[0].length && path.length) {
				i = path.pop();
				rset = path.pop();
				rset[0].splice(i, 1);
				rset[1].splice(i, 1);
			}
		}
	};

	getPrimitiveId = function (length, args) {
		var argsLength;
		if (length) {
			argsLength = args.length;
			if (length < argsLength) {
				args = slice.call(args, 0, length);
			} else if (length > argsLength) {
				args = toArray(args);
				push.apply(args, Array(length - argsLength));
			}
			return (length > 1) ? join.call(args, '\u0001') :
				(args[0] + '\u0002');
		} else {
			return '';
		}
	};

	initAsync = function (args, cb) {
		var waiting = cb ? [cb] : []
		  , value = { waiting: waiting };
		args.push(function (err, result) {
			var args2 = arguments;
			if (!err) {
				value.ready = true;
				value.value = arguments;
			} else {
				mfn.clear.apply(this, args.slice(0, -1));
			}
			waiting.forEach(function (cb) {
				cb.apply(null, args2);
			});
			delete value.waiting;
		});
		return value;
	};

	mfn = function () {
		var args, alength, id, cb, mcb, waiting;
		if (method && this && (this !== global)) {
			method.descriptor.value = memoize(fn.bind(this), options);
			defineProperty(this, method.name, method.descriptor);
			return method.descriptor.value.apply(this, arguments);
		}
		args = arguments;
		if (async) {
			cb = last.call(args);
			if (isCallable(cb)) {
				args = slice.call(args, 0, -1);
			} else {
				cb = null;
			}
		}
		args = resolver ? resolver(args) : args;
		alength = (length === false) ? args.length : length;

		if (primitive) {
			id = getPrimitiveId(alength, args);
			if (cache.hasOwnProperty(id)) {
				profile && ++profile.cached;
				value = cache[id];
			} else {
				profile && ++profile.initial;
				mfn.args = arguments;
				mfn.preventCache = false;
				if (async) {
					args = toArray(args);
					value = initAsync(args, cb);
					value.sync = apply.call(fn, this, args);
				} else {
					value = apply.call(fn, this, args);
				}
				if (!mfn.preventCache) {
					if (refCounter) {
						if (async) {
							value.count = cb ? 1 : 0;
						} else {
							value = { value: value, count: 1 };
						}
					}
					cache[id] = value;
				}
				delete mfn.args;
				return async ? value.sync : (refCounter ? value.value : value);
			}
		} else if (find(alength, args)) {
			profile && ++profile.cached;
		} else {
			profile && ++profile.initial;
			mfn.args = arguments;
			mfn.preventCache = false;
			if (async) {
				args = toArray(args);
				value = initAsync(args, cb);
				value.sync = apply.call(fn, this, args);
			} else {
				value = apply.call(fn, this, args);
			}
			if (!mfn.preventCache) {
				if (refCounter) {
					if (async) {
						value.count = cb ? 1 : 0;
					} else {
						value = { value: value, count: 1 };
					}
				}
				save(alength, args, value);
			}
			delete mfn.args;
			return async ? value.sync : (refCounter ? value.value : value);
		}

		if (async) {
			if (cb) {
				if (refCounter) {
					++value.count;
				}
				if (value.ready) {
					nextTick(function () {
						cb.apply(null, this);
					}.bind(value.value));
				} else {
					value.waiting.push(cb);
				}
			}
			return value.sync;
		} else {
			if (refCounter) {
				++value.count;
				value = value.value;
			}
			return value;
		}
	};
	mfn.memoized = true;

	mfn.clear = function () {
		var args, alength, id;
		args = resolver ? resolver(arguments) : arguments;
		alength = (length === false) ? args.length : length;

		if (primitive) {
			id = getPrimitiveId(alength, args);
			delete cache[id];
		} else {
			clear(alength, args);
		}
	};

	mfn.clearAll = function () {
		cache = primitive ? {} : [];
	};

	if (refCounter) {
		mfn.clearRef = function () {
			var args, alength;
			args = resolver ? resolver(arguments) : arguments;
			alength = (length === false) ? args.length : length;

			if (primitive) {
				if (!(value = cache[getPrimitiveId(alength, args)])) {
					return null;
				}
			} else if (!find(alength, args)) {
				return null;
			}
			if (!--value.count) {
				mfn.clear.apply(null, arguments);
				return true;
			}
			return false;
		};
	}

	return mfn;
};
