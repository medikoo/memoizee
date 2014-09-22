'use strict';

var callable = require('es5-ext/object/valid-callable')

module.exports = function (normalizer) {
	if (typeof normalizer === 'function') return { set: normalizer, get: normalizer };
	normalizer = { get: callable(normalizer.get) };
	if (normalizer.set !== undefined) {
		normalizer.set = callable(normalizer.set);
		normalizer.delete = callable(normalizer.delete);
		normalizer.clear = callable(normalizer.clear);
		return normalizer;
	}
	normalizer.set = normalizer.get;
	return normalizer;
};
