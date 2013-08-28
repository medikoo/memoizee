// Memoized methods factory

'use strict';

var copy     = require('es5-ext/object/copy')

  , defineProperty = Object.defineProperty;

require('../_base').ext.method = function (method, options, fn, configure) {
	var name, descriptor, props, prop, selfName;
	name = selfName = String(method);
	descriptor = {
		enumerable: (options.enumerable == null) ? false :
				Boolean(options.enumerable),
		configurable: (options.configurable == null) ? true :
				Boolean(options.configurable),
		writable: (options.writable == null) ? true :
				Boolean(options.writable)
	};
	props = {};
	prop = props[selfName] = copy(descriptor);
	delete prop.writable;
	if (options.protoDeep != null) {
		if (typeof options.protoDeep === 'boolean') {
			if (options.protoDeep) name = '_' + name + '_';
		} else {
			name = String(options.protoDeep);
		}
	}
	options = copy(options);
	delete options.method;
	delete options.protoDeep;

	prop.get = function () {
		if ((name !== selfName) && this.hasOwnProperty(name)) return this[name];
		options.context = this;
		descriptor.value = configure(fn.bind(this), options);
		defineProperty(this, name, descriptor);
		return this[name];
	};
	return props;
};
