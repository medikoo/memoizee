// Support for functions returning promise

'use strict';

var objectMap = require('es5-ext/object/map')
  , isPromise = require('is-promise')
  , nextTick  = require('next-tick')

  , create = Object.create, hasOwnProperty = Object.prototype.hasOwnProperty;

require('../lib/registered-extensions').promise = function (mode, conf) {
	var waiting = create(null), cache = create(null), promises = create(null);

	// We may want to force 'then' usage, when promise implementation that's used:
	// - Implements both `done` and `finally`
	// - For rejected promise throws rejection reason unconditionally when `done` is called with
	//   no onFailue callback (even though some other `then` or `done` call may have processed the
	//   error)
	var forceThenMode = (mode === 'then');

	// After not from cache call
	conf.on('set', function (id, ignore, promise) {
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
			if (!count) return; // deleted from cache before resolved
			delete waiting[id];
			cache[id] = result;
			conf.emit('setasync', id, count);
		};
		var onFailure = function () {
			if (!waiting[id]) return; // deleted from cache (or succeed in case of finally)
			delete waiting[id];
			delete promises[id];
			conf.delete(id);
		};

		// Use 'finally' and not rejection callback (on 'done' or 'then') to not register error
		// handling.
		// Additionally usage of 'finally' should take place if implementation
		// supports promise cancelation (then no `then` or `done` callbacks are invoked)
		var hasFinally = (typeof promise.finally === 'function');
		if (!forceThenMode && (typeof promise.done === 'function')) {
			// Optimal promise resolution
			if (hasFinally) {
				promise.done(onSuccess);
				promise.finally(onFailure);
			} else {
				promise.done(onSuccess, onFailure);
			}
		} else {
			// Be sure to escape error swallowing
			if (hasFinally) {
				promise.then(function (result) { nextTick(onSuccess.bind(this, result)); });
				promise.finally(function () { nextTick(onFailure); });
			} else {
				promise.then(function (result) {
					nextTick(onSuccess.bind(this, result));
				}, function (error) {
					nextTick(onFailure);
					throw error
				});
			}
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
