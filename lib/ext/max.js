'use strict';

var ext = require('../_base').ext;

ext.max = function (max, conf, options) {
	var index, base, size, add, top, clear, queue, map, async;

	max = max >>> 0;
	if (!max) {
		return;
	}

	index = -1;
	base = size = 0;
	queue = {};
	map = {};
	async = options.async && ext.async;

	conf.on('init' + (async ? 'async' : ''), function (id) {
		queue[++index] = id;
		map[id] = index;
		++size;
		if (size > max) {
			conf.clear(queue[base]);
		}
	});

	conf.on('hit' + (async ? 'async' : ''), function (id) {
		var oldIndex = map[id];
		queue[++index] = id;
		map[id] = index;
		delete queue[oldIndex];
		if (base === oldIndex) {
			while (!queue.hasOwnProperty(++base)) continue;
		}
	});

	conf.on('purge' + (async ? 'async' : ''), function (id) {
		var oldIndex = map[id];
		delete queue[oldIndex];
		--size;
		if (base === oldIndex) {
			if (!size) {
				index = -1;
				base = 0;
			} else {
				while (!queue.hasOwnProperty(++base)) continue;
			}
		}
	});

	if (!async) {
		conf.on('purgeall', function (id) {
			index = -1;
			base = size = 0;
			queue = {};
			map = {};
		});
	}
};
