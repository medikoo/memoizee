'use strict';

var normalizeOpts = require('es5-ext/object/normalize-options')
  , resolveLength = require('./lib/resolve-length')
  , plain         = require('./plain');

module.exports = function (fn/*, options*/) {
	var options = normalizeOpts(arguments[1]), length;

	if (!options.normalizer && !options.serialize) {
		length = options.length = resolveLength(options.length, fn.length, options.async);
		if (length === 0) {
			options.normalizer = require('./lib/normalizers/0');
		} else if (options.primitive) {
			if (length === false) {
				options.normalizer = require('./lib/normalizers/primitive');
			} else if (length > 1) {
				options.normalizer = require('./lib/normalizers/get-primitive-fixed')(length);
			}
		} else {
			if (length === false) options.normalizer = require('./lib/normalizers/get-regular')();
			else if (length === 1) options.normalizer = require('./lib/normalizers/get-regular-1')();
			else options.normalizer = require('./lib/normalizers/get-regular-fixed')(length);
		}
	}

	// Assure extensions
	if (options.async) require('./ext/async');
	if (options.dispose) require('./ext/dispose');
	if (options.maxAge) require('./ext/max-age');
	if (options.max) require('./ext/max');
	if (options.refCounter) require('./ext/ref-counter');

	return plain(fn, options);
};
