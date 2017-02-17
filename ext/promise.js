// Support for functions returning promise

'use strict';

var objectMap = require('es5-ext/object/map')
  , isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').promise = function (mode, conf) {
	var waiting = create(null), cache = create(null), promises = create(null);

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
		var isFailed = false;

		if (!isPromise(promise)) {
			// Non promise result
			cache[id] = promise;
			conf.emit('setasync', id, 1);
			return;
		}
		waiting[id] = 1;
		promises[id] = promise;
		var onSuccess = function (result) {
			var count = waiting[id];
			if (isFailed) {
				throw new Error("Memoizee error: Promise resolved with both failure and success," +
					" this can be result of unordered done & finally resolution.\n" +
					"Instead of `promise: true` consider configuring memoization via `promise: 'then'` or " +
					"`promise: 'done'");
			}
			if (!count) return; // deleted from cache before resolved
			delete waiting[id];
			cache[id] = result;
			conf.emit('setasync', id, count);
		};
		var onFailure = function () {
			isFailed = true;
			if (!waiting[id]) return; // deleted from cache (or succeed in case of finally)
			delete waiting[id];
			delete promises[id];
			conf.delete(id);
		};

		if ((mode !== 'then') && (typeof promise.done === 'function')) {
			// Optimal promise resolution
			if ((mode !== 'done') && (typeof promise.finally === 'function')) {
				// Use 'finally' to not register error handling (still proper behavior is subject to
				// used implementation, if library throws unconditionally even on handled errors
				// switch to 'then' mode)
				promise.done(onSuccess);
				promise.finally(onFailure);
			} else {
				// With no `finally` side effect is that it mutes any eventual
				// "Unhandled error" events on returned promise
				promise.done(onSuccess, onFailure);
			}
		} else {
			// With no `done` it's best we can do.
			// Side effect is that it mutes any eventual "Unhandled error" events on returned promise
			promise.then(function (result) {
				nextTick(onSuccess.bind(this, result));
			}, function () {
				nextTick(onFailure);
			});
		}
	});

	// From cache (sync)
	conf.on('get', function (id, args, context) {
		var promise;
		if (waiting[id]) {
			++waiting[id]; // Still waiting
			return;
		}
		promise = promises[id];
		var emit = function () { conf.emit('getasync', id, args, context); };
		if (isPromise(promise)) {
			if (typeof promise.done === 'function') promise.done(emit);
			else promise.then(function () { nextTick(emit); });
		} else {
			emit();
		}
	});

	// On delete
	conf.on('delete', function (id) {
		delete promises[id];
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
		promises = create(null);
		conf.emit('clearasync', objectMap(oldCache, function (data) { return [data]; }));
	});
};
