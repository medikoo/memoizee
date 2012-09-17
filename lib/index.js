'use strict';

var global         = require('es5-ext/lib/global')
  , toArray        = require('es5-ext/lib/Array/from')
  , indexOf        = require('es5-ext/lib/Array/prototype/e-index-of')
  , callable       = require('es5-ext/lib/Object/valid-callable')
  , isString       = require('es5-ext/lib/String/is-string')

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
	  , value, primitive, getPrimitiveId, profile, gc, ongcclear;

	callable(fn);
	if (fn.memoized) {
		// Prevent memoization of already memoized function
		return fn;
	}

	options = Object(arguments[1]);

	if (isNaN(options.length)) {
		length = fn.length;
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
	gc = Boolean(options.gc);
	if (options.ongcclear != null) {
		ongcclear = callable(options.ongcclear);
	}

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

		if (gc) {
			value = { value: value, count: 1 };
		}
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

	mfn = function () {
		var args, alength, id;
		if (method && this && (this !== global)) {
			method.descriptor.value = memoize(fn.bind(this), options);
			defineProperty(this, method.name, method.descriptor);
			return method.descriptor.value.apply(this, arguments);
		}
		args = resolver ? resolver(arguments) : arguments;
		alength = (length === false) ? args.length : length;

		if (primitive) {
			id = getPrimitiveId(alength, args);
			if (cache.hasOwnProperty(id)) {
				profile && ++profile.cached;
				if (gc) {
					++cache[id].count;
					return cache[id].value;
				}
				return cache[id];
			} else {
				profile && ++profile.initial;
				mfn.args = arguments;
				mfn.preventCache = false;
				value = apply.call(fn, this, args);
				if (!mfn.preventCache) {
					cache[id] = gc ? { value: value, count: 1 } : value;
				}
				delete mfn.args;
				return value;
			}
		}
		if (find(alength, args)) {
			profile && ++profile.cached;
			if (gc) {
				++value.count;
				return value.value;
			}
			return value;
		} else {
			profile && ++profile.initial;
			mfn.args = arguments;
			mfn.preventCache = false;
			value = apply.call(fn, this, args);
			if (!mfn.preventCache) {
				save(alength, args, value);
			}
			delete mfn.args;
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

	if (gc) {
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
				if (ongcclear) {
					ongcclear(value.value, args, arguments);
				}
				return true;
			}
			return false;
		};
	}

	return mfn;
};
