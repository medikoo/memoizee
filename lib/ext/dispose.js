'use strict';

var callable = require('es5-ext/lib/Object/valid-callable')
  , forEach  = require('es5-ext/lib/Object/for-each')
  , ext      = require('../_base').ext

  , isArray = Array.isArray, slice = Array.prototype.slice;

ext.dispose = function (dispose, conf, options) {
	var clear;

	callable(dispose);

	conf.on('purge', clear = (options.async && ext.async) ? function (id) {
		var value = conf.async[id];
		delete conf.cache[id];
		if (!isArray(value)) {
			dispose.apply(null, slice.call(value, 1));
		}
	}: function (id) {
		var value = conf.cache[id];
		delete conf.cache[id];
		dispose(value);
	});

	conf.on('purgeall', function () {
		forEach(conf.cache, function (value, id, cache) {
			clear(id);
		});
	});
};
