'use strict';

module.exports = function (t, a) {
	var fn = function () {}, resolved = t(fn);
	a.deep(resolved, { get: fn, set: fn });
	a.deep(t(resolved), { get: fn, set: fn });
};
