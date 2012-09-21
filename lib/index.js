'use strict';

var regular   = require('./regular')
  , primitive = require('./primitive')

  , apply = Function.prototype.apply;

// Order is important!
require('./ext/dispose');
require('./ext/resolvers');
require('./ext/async');
require('./ext/ref-counter');
require('./ext/method');
require('./ext/max-age');
require('./ext/max');

module.exports = function (fn/* options */) {
	var options = Object(arguments[1]);
	return apply.call(options.primitive ? primitive : regular, this, arguments);
};
