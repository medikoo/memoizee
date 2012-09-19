'use strict';

var global     = require('es5-ext/lib/global')
  , toArray    = require('es5-ext/lib/Array/from')
  , clearArr   = require('es5-ext/lib/Array/prototype/clear')
  , indexOf    = require('es5-ext/lib/Array/prototype/e-index-of')
  , last       = require('es5-ext/lib/Array/prototype/last')
  , remove     = require('es5-ext/lib/Array/prototype/remove')
  , curry      = require('es5-ext/lib/Function/prototype/curry')
  , partial    = require('es5-ext/lib/Function/prototype/partial')
  , callable   = require('es5-ext/lib/Object/valid-callable')
  , isCallable = require('es5-ext/lib/Object/is-callable')
  , isCopy     = require('es5-ext/lib/Object/is-copy')
  , forEach    = require('es5-ext/lib/Object/for-each')
  , isString   = require('es5-ext/lib/String/is-string')
  , nextTick   = require('next-tick')

  , slice = Array.prototype.slice, now = Date.now
  , apply = Function.prototype.apply
  , create = Object.create, defineProperty = Object.defineProperty

  , resolve, memoize;

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

memoize = module.exports = function (fn/*, options*/) {
	var mfn, options, length, resolver, method, cache, find, save, clear
	  , value, primitive, serialize, profile, refCounter, async, initAsync
	  , maxAge, max, queue, dispose, orgDispose, purgePrimitive;

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
		length = false;
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
				descriptor: { configurable: true, writable: true } };
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
	maxAge = options.maxAge >>> 0;
	max = options.max >>> 0;
	if (options.dispose != null) {
		dispose = orgDispose = callable(options.dispose);
		if (async) {
			dispose = function (value) {
				if (value.value) {
					apply.call(orgDispose, null, slice.call(value.value, 1));
				}
			};
		} else if (refCounter) {
			dispose = function (value) { orgDispose(value.value); };
		}
	}

	cache = primitive ? {} : [];

	if (memoize._profile) {
		profile = memoize._profile();
	}

	if (max) {
		queue = [];
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
			if (dispose && rset.hasOwnProperty("0")) {
				value = rset[0];
				delete rset[0];
				dispose(value);
			} else {
				delete rset[length];
			}
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
			if (dispose) {
				dispose(rset[1][i]);
			}
			rset[1].splice(i, 1);
			while (!rset[0].length && path.length) {
				i = path.pop();
				rset = path.pop();
				rset[0].splice(i, 1);
				rset[1].splice(i, 1);
			}
		}
	};

	if (primitive && (length !== 1)) {
		serialize = function (args, length) {
			var id = '', i;
			if (length) {
				id += args[i = 0];
				while (--length) {
					id += '\u0001' + args[++i];
				}
			} else {
				id = '\u0002';
			}
			return id;
		};
	}

	purgePrimitive = function (id) {
		var value;
		if (cache.hasOwnProperty(id)) {
			value = cache[id];
			delete cache[id];
			if (dispose) {
				dispose(value);
			}
		}
	};

	initAsync = function (args, cb, maxAgeData) {
		var waiting = cb ? [cb] : []
		  , value = { waiting: waiting }, time;
		args.push(function (err) {
			var args2 = arguments;
			if (profile) {
				profile.time += (now() - time);
			}
			if (!err) {
				value.value = arguments;
				if (max) {
					if (primitive) {
						queue.push(maxAgeData);
						if (queue.length > max) {
							purgePrimitive(queue.shift());
						}
					} else {
						queue.push([maxAgeData, args]);
						if (queue.length > max) {
							clear.apply(null, queue.shift());
						}
					}
				}
				if (maxAge) {
					setTimeout(primitive ? partial.call(purgePrimitive, maxAgeData) :
							partial.call(clear, maxAgeData, args.slice(0, -1)), maxAge);
				}
			} else {
				mfn.clear.apply(this, args.slice(0, -1));
			}
			waiting.forEach(function (cb) {
				cb.apply(null, args2);
			});
			delete value.waiting;
		});
		if (profile) {
			time = now();
		}
		return value;
	};

	mfn = function () {
		var args, alength, id, cb, time;
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
		if (resolver) {
			args = resolver(args);
		}
		alength = (length === false) ? args.length : length;

		if (primitive) {
			id = (length === 1) ? args[0] : serialize(args, alength);
			if (cache.hasOwnProperty(id)) {
				profile && ++profile.cached;
				value = cache[id];
			} else {
				profile && ++profile.initial;
				mfn.args = arguments;
				mfn.preventCache = false;
				if (async) {
					args = toArray(args);
					value = initAsync(args, cb, id);
					value.sync = apply.call(fn, this, args);
				} else {
					if (profile) {
						time = now();
					}
					value = apply.call(fn, this, args);
					if (profile) {
						profile.time += (now() - time);
					}
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
					if (max && !async) {
						queue.push(id);
						if (queue.length > max) {
							purgePrimitive(queue.shift());
						}
					}
					if (maxAge && !async) {
						setTimeout(partial.call(purgePrimitive, id), maxAge);
					}
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
				value = initAsync(args, cb, alength);
				value.sync = apply.call(fn, this, args);
			} else {
				if (profile) {
					time = now();
				}
				value = apply.call(fn, this, args);
				if (profile) {
					profile.time += (now() - time);
				}
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
				if (max && !async) {
					queue.push([alength, args]);
					if (queue.length > max) {
						clear.apply(null, queue.shift());
					}
				}
				if (maxAge && !async) {
					setTimeout(partial.call(clear, alength, args), maxAge);
				}
			}
			delete mfn.args;
			return async ? value.sync : (refCounter ? value.value : value);
		}

		if (async) {
			if (cb) {
				if (refCounter) {
					++value.count;
				}
				if (value.value) {
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
			id = (length === 1) ? args[0] : serialize(args, alength);
			if (max) {
				remove.call(queue, id);
			}
			purgePrimitive(id);
		} else {
			if (max) {
				if (find.call(queue, function (data, index) {
						if (isCopy(data, [alength, args], 2)) {
							id = index;
							return true;
						}
					})) {
					queue.splice(id, 1);
				}
			}
			clear(alength, args);
		}
	};

	mfn.clearAll = function () {
		if (dispose) {
			if (primitive) {
				forEach(cache, curry.call(dispose, 1));
			} else {
				cache.forEach(function self(value, index) {
					if (!index) {
						dispose(value);
						return;
					}
					--index;
					value[1].forEach(function (value) { self(value, index); });
				});
			}
		}
		if (max) {
			clearArr.call(queue);
		}
		cache = primitive ? {} : [];
	};

	if (refCounter) {
		mfn.clearRef = function () {
			var args, alength, id;
			args = resolver ? resolver(arguments) : arguments;
			alength = (length === false) ? args.length : length;

			if (primitive) {
				id = (length === 1) ? args[0] : serialize(args, alength);
				if (!cache.hasOwnProperty(id)) {
					return null;
				}
				value = cache[id];
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
