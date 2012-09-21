'use strict';

require('../_base').ext.refCounter = function (ignore, conf) {
	var cache, get, clear;

	cache = {};

	conf.on('init', function (id) { cache[id] = 1; });
	conf.on('hit', function (id) { ++cache[id]; });
	conf.on('purge', function (id) { delete cache[id]; });
	conf.on('purgeall', function () { cache = {}; });

	conf.memoized.clearRef = function () {
		var id = conf.get(arguments);
		if (cache.hasOwnProperty(id)) {
			if (!--cache[id]) {
				conf.clear(id)
				return true;
			}
			return false;
		}
		return null;
	};
};
