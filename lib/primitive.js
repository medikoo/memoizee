// Memoize working in primitive mode

'use strict';

var customError  = require('es5-ext/error/custom')
  , callable     = require('es5-ext/object/valid-callable')
  , hasListeners = require('event-emitter/has-listeners')

  , serialize0 = function () { return ''; }
  , serialize1 = function (args) { return args[0]; }

  , apply = Function.prototype.apply, call = Function.prototype.call
  , serializeN;

serializeN = function (args) {
	var id = '', i, length = args.length;
	if (length) {
		id += args[i = 0];
		while (--length) id += '\u0001' + args[++i];
	} else {
		id = '\u0002';
	}
	return id;
};

module.exports = require('./_base')(function (conf, length, options) {
	var get, cache = conf.cache = {}, fn
	  , hitListeners, initListeners, purgeListeners, serialize;

	if (options.serialize) {
		serialize = callable(options.serialize);
		get = conf.get = function (args) { return serialize.apply(this, args); };
	} else if (length === 1) {
		get = conf.get = serialize1;
	} else if (length === false) {
		get = conf.get = serializeN;
	} else if (length) {
		get = conf.get = function (args) {
			var id = String(args[0]), i = 0, l = length;
			while (--l) { id += '\u0001' + args[++i]; }
			return id;
		};
	} else {
		get = conf.get = serialize0;
	}

	conf.memoized = (length === 1) ? function (id) {
		var value;
		if (cache.hasOwnProperty(id)) {
			if (hitListeners) conf.emit('hit', id, arguments, this);
			return cache[id];
		}
		if (arguments.length === 1) value = call.call(fn, this, id);
		else value = apply.call(fn, this, arguments);
		if (cache.hasOwnProperty(id)) {
			throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
		}
		cache[id] = value;
		if (initListeners) conf.emit('init', id);
		return value;
	} : function () {
		var id = get(arguments), value;
		if (cache.hasOwnProperty(id)) {
			if (hitListeners) conf.emit('hit', id, arguments, this);
			return cache[id];
		}
		value = apply.call(conf.fn, this, arguments);
		if (cache.hasOwnProperty(id)) {
			throw customError("Circular invocation", 'CIRCULAR_INVOCATION');
		}
		cache[id] = value;
		if (initListeners) conf.emit('init', id);
		return value;
	};

	conf.clear = function (id) {
		if (cache.hasOwnProperty(id)) {
			if (purgeListeners) conf.emit('purge', id);
			delete cache[id];
		}
	};
	conf.clearAll = function () { cache = conf.cache = {}; };

	conf.once('ready', function () {
		fn = conf.fn;
		hitListeners = hasListeners(conf, 'hit');
		initListeners = hasListeners(conf, 'init');
		purgeListeners = hasListeners(conf, 'purge');
	});
});
