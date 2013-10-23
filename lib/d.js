'use strict';

var forEach  = require('es5-ext/object/for-each')
  , callable = require('es5-ext/object/valid-callable')
  , lazy     = require('d/lazy')

  , a = [], b = [];

module.exports = function (fn) {
	var index = a.indexOf(callable(fn));
	if (index !== -1) return b[index];
	index = a.push(fn);
	return (b[index - 1] = function (props) {
		forEach(props, function (desc, name) {
			var value = callable(desc.value);
			desc.value = function (options) { return fn(value.bind(this), options); };
		});
		return lazy(props);
	});
};
