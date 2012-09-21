'use strict';

require('../_base').ext.max = function (max, conf) {
	var index, base, size, add, top, clear, queue, map;

	max = max >>> 0;
	if (!max) {
		return;
	}

	index = -1;
	base = size = 0;
	queue = {};
	map = {};

	conf.on('init', function (id) {
		queue[++index] = id;
		map[id] = index;
		++size;
		if (size > max) {
			conf.clear(queue[base]);
		}
	});

	conf.on('hit', function (id) {
		var oldIndex = map[id];
		queue[++index] = queue[oldIndex];
		map[id] = index;
		delete queue[oldIndex];
		if (base === oldIndex) {
			while (!queue.hasOwnProperty(++base)) continue;
		}
	});

	conf.on('purge', function (id) {
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

	conf.on('purgeall', function (id) {
		index = -1;
		base = size = 0;
		queue = {};
		map = {};
	});
};
