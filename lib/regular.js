'use strict';

var indexOf      = require('es5-ext/lib/Array/prototype/e-index-of')
  , hasListeners = require('event-emitter/lib/has-listeners')

  , apply = Function.prototype.apply

  , getId0 = function () { return ''; };

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
module.exports = require('./_base')(function (conf, length) {
	var map, map1, map2, get, set, clear, count, fn
	  , hitListeners, initListeners, purgeListeners
	  , cache = conf.cache = {};

	if (length === 0) {
		get = set = clear = conf.get = getId0;
		conf.clearAll = function () { cache = conf.cache = {}; };
	} else {
		count = 0;
		if (length === 1) {
			map1 = [];
			map2 = [];
			get = conf.get = function (args) {
				return map2[indexOf.call(map1, args[0])];
			};
			set = function (args) {
				map1.push(args[0]);
				map2.push(++count);
				return count;
			};
			clear = function (args) {
				var index = indexOf.call(map1, args[0]), id;
				if (index !== -1) {
					id = map2[index];
					map1.splice(index, 1);
					map2.splice(index, 1);
					return id;
				}
			};
			conf.clearAll = function () {
				map1 = [];
				map2 = [];
				cache = conf.cache = {};
			};
		} else if (length === false) {
			map = [];
			get = conf.get = function (args) {
				var index = 0, set = map, i, length = args.length;
				if (length === 0) {
					return set[length];
				} else if ((set = set[length])) {
					while (index < (length - 1)) {
						i = indexOf.call(set[0], args[index]);
						if (i === -1) {
							return;
						}
						set = set[1][i];
						++index;
					}
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return;
					}
					return set[1][i];
				}
				return;
			};
			set = function (args) {
				var index = 0, set = map, i, length = args.length;
				if (length === 0) {
					set[length] = ++count;
				} else {
					if (!set[length]) {
						set[length] = [[], []];
					}
					set = set[length];
					while (index < (length - 1)) {
						i = indexOf.call(set[0], args[index]);
						if (i === -1) {
							i = set[0].push(args[index]) - 1;
							set[1].push([[], []]);
						}
						set = set[1][i];
						++index;
					}
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						i = set[0].push(args[index]) - 1;
					}
					set[1][i] = ++count;
				}
				return count;
			};
			clear = function (args) {
				var index = 0, set = map, i, length = args.length, path = [], id;
				if (length === 0) {
					id = set[length];
					delete set[length];
					return id;
				} else if ((set = set[length])) {
					while (index < (length - 1)) {
						i = indexOf.call(set[0], args[index]);
						if (i === -1) {
							return;
						}
						path.push(set, i);
						set = set[1][i];
						++index;
					}
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return;
					}
					id = set[1][i];
					set[0].splice(i, 1);
					set[1].splice(i, 1);
					while (!set[0].length && path.length) {
						i = path.pop();
						set = path.pop();
						set[0].splice(i, 1);
						set[1].splice(i, 1);
					}
					return id;
				}
			};
			conf.clearAll = function () {
				map = [];
				cache = conf.cache = {};
			};
		} else {
			map = [[], []];
			get = conf.get = function (args) {
				var index = 0, set = map, i;
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return null;
					}
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return null;
				}
				return set[1][i];
			};
			set = function (args) {
				var index = 0, set = map, i;
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						i = set[0].push(args[index]) - 1;
						set[1].push([[], []]);
					}
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					i = set[0].push(args[index]) - 1;
				}
				set[1][i] = ++count;
				return count;
			};
			clear = function (args) {
				var index = 0, set = map, i, path = [], id;
				while (index < (length - 1)) {
					i = indexOf.call(set[0], args[index]);
					if (i === -1) {
						return;
					}
					path.push(set, i);
					set = set[1][i];
					++index;
				}
				i = indexOf.call(set[0], args[index]);
				if (i === -1) {
					return;
				}
				id = set[1][i];
				set[0].splice(i, 1);
				set[1].splice(i, 1);
				while (!set[0].length && path.length) {
					i = path.pop();
					set = path.pop();
					set[0].splice(i, 1);
					set[1].splice(i, 1);
				}
				return id;
			};
			conf.clearAll = function () {
				map = [[], []];
				cache = conf.cache = {};
			};
		}
	}
	conf.memoized = function () {
		var id = get(arguments), value;
		if (cache.hasOwnProperty(id)) {
			hitListeners && conf.emit('hit', id);
			return cache[id];
		} else {
			value = apply.call(fn, this, arguments);
			id = set(arguments);
			cache[id] = value;
			initListeners && conf.emit('init', id);
			return value;
		}
	};
	conf.clear = function (id) {
		if (cache.hasOwnProperty(id)) {
			clear(id);
			purgeListeners && conf.emit('purge', id);
			delete cache[id];
		}
	};

	conf.once('ready', function () {
		fn = conf.fn;
		hitListeners = hasListeners(conf, 'hit');
		initListeners = hasListeners(conf, 'init');
		purgeListeners = hasListeners(conf, 'purge');
	});
});
