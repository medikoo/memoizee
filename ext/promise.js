// Support for functions returning promise

'use strict';

var isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create;

require('../lib/registered-extensions').promise = function (ignore, conf) {
	var cache = create(null);

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
		if (!isPromise(promise)) return; // Non promise result, ignore;
		var onSuccess = function () {
			cache[id] = promise;
			conf.emit('setasync', id, 1);
		};
		var onFailure = function () { conf.delete(id); };
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
		conf.emit('getasync', id, args, context);
	});

	// On delete
	conf.on('delete', function (id) {
		var result;
		// If false, we don't have value yet, so we assume that intention is not
		// to memoize this call. After value is obtained we don't cache it but
		// gracefully pass to callback
		if (!cache[id]) return;
		result = cache[id];
		delete cache[id];
		conf.emit('deleteasync', id, result);
	});

	// On clear
	conf.on('clear', function () {
		var oldCache = cache;
		cache = create(null);
		conf.emit('clearasync', oldCache);
	});
};
