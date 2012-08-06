# memoize - Memoization for any type of function arguments

Complete memoize solution, originally derived from [es5-ext](https://github.com/medikoo/es5-ext) package. Works with any type and length of function arguments. It's one of the fastest solutions available.

```javascript
var memoize = require('memoizee')
  , fn = function (one, two, three) { /* ... */ };

memoized = memoize(fn);

memoized('foo', 3, 'bar');
memoized('foo', 3, 'bar'); // Cache hit
```

## Installation
### Node.js

In your project path:

	$ npm install memoizee

<a name="installation-browser" />
### Browser

You can easily create browser bundle with help of [modules-webmake](https://github.com/medikoo/modules-webmake). Mind that it relies on some EcmaScript5 features, so for older browsers you need as well [es5-shim](https://github.com/kriskowal/es5-shim)


## Options
### Arguments length

By default fixed number of arguments that function take is assumed (it's based on function's  `length` property) this behaviour can be overriden:

```javascript
memoized = memoize(fn, { length: 2 });

memoized('foo'); // Assumed ('foo', undefined)
memoized('foo', undefined); // Cache hit

memoized('foo', 3, {}); // Third argument is ignored (but passed to underlying function)
memoized('foo', 3, 13); // Cache hit
```

Dynamic _length_ behavior can be forced by setting `length` to `false`, that means memoize will work with any number of arguments.

```javascript
memoized = memoize(fn, { length: false });

memoized('foo');
memoized('foo'); // Cache hit
memoized('foo', undefined);
memoized('foo', undefined); // Cache hit

memoized('foo', 3, {});
memoized('foo', 3, 13);
memoized('foo', 3, 13); // Cache hit
```

### Resolvers

When expecting arguments of certain type it's good to coerce them before doing memoization. We can do that by passing additional resolvers array:

```javascript
memoized = memoize(fn, { length: 2, resolvers: [String, Boolean] });

memoized(12, [1,2,3].length);
memoized("12", true); // Cache hit
memoized({ toString: function () { return "12"; } }, {}); // Cache hit
```

### Primitive mode

Dealing with input arguments as they are, may not be performant on large result sets. Optionally memoization can be run in _primitive_ mode, internally then obtained results are saved on hash (not array) it means arguments are coerced to strings to generate unique hash id.  

This mode will work properly only if your arguments can be coerced to unique strings.
__Mind also that performance gain when using this mode is only observed on large result sets (thousands of results) otherwise it may even be slower.__

```javascript
memoized = memoize(fn, { primitive: true });

memoized('/path/one');
memoized('/path/one'); // Cache hit
```

### Memoizing a method

When we're defining a prototype, we may want to define method that will memoize it's results in relation to each instance. Normal way to obtain that would be:

```javascript
var Foo = function () {
	memoize(this.bar.bind(this));
	// ... constructor logic
};
Foo.prototype.bar = function () {
	// ... method logic
};
```

With `method` option we can configure memoization directly on prototype. Following will have same effect:

```javascript
var Foo = function () {
	// ... constructor logic
};
Foo.prototype.bar = memoize(function () {
	// ... method logic
}, { method: 'bar' });
```

Additionally we may provide descriptor which would be used for defining method on instance object:

```javascript
var Foo = function () {
	// ... constructor logic
};
Foo.prototype.bar = memoize(function () {
	// ... method logic
}, { method: { name: 'bar', descriptor: { configurable: true } } });
```

#### Cache handling

Collected cache can be cleared, to clear data for particall call.

```javascript
	memoizedFn.clear('foo', true);
```

Arguments passed to `clear` are treated with same rules as input arguments passed to function

To clear all collected data:

```javascript
	memoizedFn.clearAll();
```

## Profiling & Statistics

`lib/profile` module can collect statistical data about memoized function calls. What's the ratio of initial calls to cache hits?. To collect data it needs to be imported before initialization of function memoizers that we want to track.

```javascript
var memProfile = require('memoizee/lib/profile')
  , memoize    = require('memoizee');

var memoized = memoize(fn);
memoized(1, 2);
memoized(1, 2);

memProfile.statistics // Holds statistics data in convenient hash form
memProfile.log(); // Outputs statictis data in readable form (using console.log)
```

## Tests [![Build Status](https://secure.travis-ci.org/medikoo/memoize.png?branch=master)](https://secure.travis-ci.org/medikoo/memoize)

	$ npm test
