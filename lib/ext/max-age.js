'use strict';

var forEach = require('es5-ext/lib/Object/for-each')
  , ext = require('../_base').ext

ext.maxAge = function (maxAge, conf, options) {
	var cache, async;

	maxAge = maxAge >>> 0;
	if (!maxAge) {
		return;
	}

	cache = {};
	async = options.async && ext.async;
	conf.on('init' + (async ? 'async' : ''), function (id) {
		cache[id] = setTimeout(function () { conf.clear(id); }, maxAge);
	});
	conf.on('purge' + (async ? 'async' : ''), function (id) {
		clearTimeout(cache[id]);
		delete cache[id];
	});

	if (!async) {
		conf.on('purgeall', function (id) {
			forEach(cache, function (id) {
				clearTimeout(id);
			});
			cache = {};
		});
	}
};
