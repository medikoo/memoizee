// Support for functions returning promise

'use strict';

var objectMap = require('es5-ext/object/map')
  , isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').promise = function (ignore, conf) {
	var waiting = create(null), cache = create(null);

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
		if (!isPromise(promise)) return; // Non promise result, ignore;
		waiting[id] = 1;
		var onSuccess = function (result) {
			var count = waiting[id];
			if (!count) return; // deleted from cache before resolved
			delete waiting[id];
			cache[id] = result;
			conf.emit('setasync', id, count);
		};
		var onFailure = function () {
			if (!waiting[id]) return; // deleted from cache before resolved
			delete waiting[id];
			conf.delete(id);
		};
		if (typeof promise.done === 'function') {
			// Optimal promise resolution
			promise.done(onSuccess, onFailure);
		} else {
			// Be sure to escape error swallowing
			promise.then(function () { nextTick(onSuccess); }, function () { nextTick(onFailure); });
		}
	});

	// From cache (sync)
	conf.on('get', function (id, args, context) {
		if (waiting[id]) {
			++waiting[id]; // Still waiting
			return;
		}
		conf.emit('getasync', id, args, context);
	});

	// On delete
	conf.on('delete', function (id) {
		if (waiting[id]) {
			delete waiting[id];
			return; // Not yet resolved
		}
		if (!hasOwnProperty.call(cache, id)) return;
		var result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, [result]);
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		waiting = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) { return [data]; }));
	});
};
