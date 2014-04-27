'use strict';

var forEach  = require('es5-ext/object/for-each')
  , callable = require('es5-ext/object/valid-callable')
  , lazy     = require('d/lazy');

module.exports = function (memoize) {
	return function (props) {
		forEach(props, function (desc, name) {
			var fn = callable(desc.value);
			desc.value = function (options) { return memoize(fn.bind(this), options); };
		});
		return lazy(props);
	};
};
