'use strict';

var forEach = require('es5-ext/lib/Object/for-each')
  , ext = require('../_base').ext

ext.maxAge = function (maxAge, conf, options) {
	var cache, mode;

	maxAge = maxAge >>> 0;
	if (!maxAge) {
		return;
	}

	cache = {};
	mode = (options.async && ext.async) ? 'async' : '';
	conf.on('init' + mode, function (id) {
		cache[id] = setTimeout(function () { conf.clear(id); }, maxAge);
	});
	conf.on('purge', function (id) {
		clearTimeout(cache[id]);
		delete cache[id];
	});
	conf.on('purgeall', function (id) {
		forEach(cache, function (id) {
			clearTimeout(id);
		});
		cache = {};
	});
};
