'use strict';

var partial  = require('es5-ext/lib/Function/prototype/partial')
  , forEach  = require('es5-ext/lib/Object/for-each')
  , contains = require('es5-ext/lib/String/prototype/contains')
  , pad      = require('es5-ext/lib/String/prototype/pad')
  , memoize  = require('./memoize')

  , max = Math.max

  , stats = exports.statistics = {};

memoize._profile = function () {
	var id, stack = (new Error()).stack;
	id = stack.split('\n')[3].replace(/\n/g, "\\n").trim();
	if (contains.call(id, '/memoizee/lib')) {
		id = stack.split('\n')[4].replace(/\n/g, "\\n").trim();
	}
	if (!stats[id]) {
		stats[id] = { initial: 0, cached: 0, time: 0 };
	}
	return stats[id];
};

exports.log = function () {
	var initial, cached, time, ordered, ipad, cpad, ppad, toPrc, tpad, atime, log;

	initial = cached = time = 0;
	ordered = [];

	toPrc = function (initial, cached) {
		if (!initial && !cached) {
			return '0.00';
		}
		return ((cached / (initial + cached)) * 100).toFixed(2);
	};

	log = "------------------------------------------------------------\n";
	log += "Memoize statistics:\n\n";

	forEach(stats, function (data, name) {
		initial += data.initial;
		cached += data.cached;
		time += data.time;
		ordered.push([name, data]);
	}, null, function (a, b) {
		return (this[b].initial + this[b].cached) -
			(this[a].initial + this[a].cached);
	});

	ipad = partial.call(pad, " ",
		max(String(initial).length, "Init".length));
	cpad = partial.call(pad, " ", max(String(cached).length, "Cache".length));
	ppad = partial.call(pad, " ", "%Cache".length);
	tpad = partial.call(pad, " ", max((String(time.toFixed(3)) + "s").length,
		"Avg init time".length));
	log += ipad.call("Init") + "  " +
		cpad.call("Cache") + "  " +
		ppad.call("%Cache") + "  " +
		tpad.call("Avg init time") + "  Source location\n";
	log += ipad.call(initial) + "  " +
		cpad.call(cached) + "  " +
		ppad.call(toPrc(initial, cached)) + "  " +
		tpad.call((atime = initial ? ((time / initial) / 1000) : 0).toFixed(3) +
			"s") + "  (all)\n";
	ordered.forEach(function (data) {
		var name = data[0];
		data = data[1];
		log += ipad.call(data.initial) + "  " +
			cpad.call(data.cached) + "  " +
			ppad.call(toPrc(data.initial, data.cached)) + "  " +
			tpad.call((atime =
				data.initial ? ((data.time / data.initial) / 1000) : 0).toFixed(3) +
				"s") + "  " + name + "\n";
	});
	log += "------------------------------------------------------------\n";
	return log;
};
