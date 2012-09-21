'use strict';

var forEach = require('es5-ext/lib/Object/for-each');

require('../_base').ext.maxAge = function (maxAge, conf) {
	var cache;

	maxAge = maxAge >>> 0;
	if (!maxAge) {
		return;
	}

	cache = {};
	conf.on('init', function (id) {
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
