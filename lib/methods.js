'use strict';

var forEach       = require('es5-ext/object/for-each')
  , normalizeOpts = require('es5-ext/object/normalize-options')
  , callable      = require('es5-ext/object/valid-callable')
  , lazy          = require('d/lazy');

module.exports = function (memoize) {
	return function (props) {
		forEach(props, function (desc, name) {
			var fn = callable(desc.value);
			desc.value = function (options) {
				if (options.getNormalizer) {
					options = normalizeOpts(options);
					options.normalizer = options.getNormalizer();
					delete options.getNormalizer;
				}
				return memoize(fn.bind(this), options);
			};
		});
		return lazy(props);
	};
};
