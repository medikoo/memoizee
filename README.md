# Memoize – Complete memoize solution for JavaScript

_Originally derived from [es5-ext](https://github.com/medikoo/es5-ext) package._

Memoization is best technique to save on memory or CPU cycles when we deal with repeated operations. For detailed insight see: http://en.wikipedia.org/wiki/Memoization

## Features

* Works with any type of function arguments – __no serialization is needed__
* Works with [__any length of function arguments__](#arguments-length). Length can be set as fixed or dynamic.
* One of the [__fastest__](https://github.com/medikoo/memoize/tree/master/benchmark) available solutions.
* Support for [__asynchronous functions__](#memoizing-asynchronous-functions)
* Optional [__primitive mode__](#primitive-mode) which assures fast performance when arguments are conversible to strings.
* Can be configured [__for methods__](#memoizing-a-method) (when `this` counts in)
* Cache can be cleared [manually](#manual-clean-up) or [after specified timeout](#expire-cache-after-given-period-of-time)
* Cache size can be [limited](#limiting-cache-size)
* Optionally [__accepts resolvers__](#resolvers) that normalize function arguments before passing them to underlying function.
* Optional [__reference counter mode__](#reference-counter), that allows more sophisticated cache management
* [__Profile tool__](#profiling--statistics) that provides valuable usage statistics
* Covered by [__over 500 unit tests__](#tests-)

## Usage

```javascript
var memoize = require('memoizee');

var fn = function (one, two, three) { /* ... */ };

memoized = memoize(fn);

memoized('foo', 3, 'bar');
memoized('foo', 3, 'bar'); // Cache hit
```

## Installation
### NPM

In your project path:

	$ npm install memoizee

### Browser

Browser bundle can be easily created with help of [modules-webmake](https://github.com/medikoo/modules-webmake). Mind that it relies on some EcmaScript5 features, so for older browsers you need as well [es5-shim](https://github.com/kriskowal/es5-shim)

## Configuration

All below options can be applied in any combination

### Arguments length

By default fixed number of arguments that function take is assumed (it's read from function's  `length` property) this can be overridden:

```javascript
memoized = memoize(fn, { length: 2 });

memoized('foo');            // Assumed: 'foo', undefined
memoized('foo', undefined); // Cache hit

memoized('foo', 3, {}); // Third argument is ignored (but passed to underlying function)
memoized('foo', 3, 13); // Cache hit
```

Dynamic _length_ behavior can be forced by setting _length_ to `false`, that means memoize will work with any number of arguments.

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

### Primitive mode

If we work with large result sets, or memoize hot functions, default mode may not perform as fast as we expect. In that case it's good to run memoization in _primitive_ mode. To provide fast access, results are saved in hash instead of an array. Generated hash ids are result of arguments to string convertion. __Mind that this mode will work correctly only if stringified arguments produce unique strings.__

```javascript
memoized = memoize(fn, { primitive: true });

memoized('/path/one');
memoized('/path/one'); // Cache hit
```

### Resolvers

When not working in _primitive_ mode but expecting arguments of certain type it's good to coerce them before doing memoization. We can do that by passing additional resolvers array:

```javascript
memoized = memoize(fn, { length: 2, resolvers: [String, Boolean] });

memoized(12, [1,2,3].length);
memoized("12", true); // Cache hit
memoized({ toString: function () { return "12"; } }, {}); // Cache hit
```

### Memoizing asynchronous functions

With _async_ option we indicate that we memoize asynchronous function.  
Operations that result with an error are not cached.

```javascript
afn = function (a, b, cb) {
  setTimeout(function () {
    cb(null, a + b);
  }, 200);
};
memoized = memoize(afn, { async: true });

memoized(3, 7, function (err, res) {
  memoized(3, 7, function (err, res) {
    // Cache hit
  });
});

memoized(3, 7, function (err, res) {
  // Cache hit
});
```

### Memoizing a method

When we are defining a prototype, we may want to define method that will memoize it's results in relation to each instance. Basic way to obtain that would be:

```javascript
var Foo = function () {
  this.bar = memoize(this.bar.bind(this));
  // ... constructor logic
};
Foo.prototype.bar = function () {
  // ... method logic
};
```

With _method_ option we can configure memoization directly on prototype:

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

### Cache handling

#### Manual clean up:

Clear data for particular call.

```javascript
memoized.clear('foo', true);
```

Arguments passed to `clear` are treated with same rules as input arguments passed to function

Clear all cached data:

```javascript
memoized.clearAll();
```

#### Expire cache after given period of time

With _maxAge_ option we can ensure that cache for given call is cleared after predefined period of time

```javascript
memoized = memoize(fn, { maxAge: 1000 });

memoized('foo', 3);
memoized('foo', 3); // Cache hit
setTimeout(function () {
  memoized('foo', 3); // No longer in cache, re-executed
  memoized('foo', 3); // Cache hit
}, 2000);
```

#### Reference counter

We can track number of references returned from cache, and manually clear them. When last reference is cleared, cache is purged automatically:

```javascript
memoized = memoize(fn, { refCounter: true });

memoized('foo', 3);          // refs: 1
memoized('foo', 3);          // Cache hit, refs: 2
memoized('foo', 3);          // Cache hit, refs: 3
memoized.clearRef('foo', 3); // refs: 2
memoized.clearRef('foo', 3); // refs: 1
memoized.clearRef('foo', 3); // refs: 0, Cache purged for 'foo', 3
memoized('foo', 3);          // Re-executed, refs: 1
```

#### Limiting cache size

With _max_ option you can limit cache size. It works on first-in/first-out basis.

```javascript
memoized = memoize(fn, { max: 2 });

memoized('foo', 3);
memoized('bar', 7);
memoized('foo', 3);    // Cache hit
memoized('bar', 7);    // Cache hit
memoized('lorem', 11); // Cache cleared for 'foo', 3
memoized('bar', 7);    // Cache hit
memoized('foo', 3);    // Re-executed, Cache cleared for 'bar', 7
memoized('lorem', 11); // Cache hit
memoized('foo', 3);    // Cache hit
memoized('bar', 7);    // Re-executed, Cache cleared for 'lorem', 11
```

#### Registering dispose callback
You can register callback that is called on each value being removed from cache:

```javascript
memoized = memoize(fn, { dispose: function (value) { /*…*/ } });

var foo3 = memoized('foo', 3);
var bar7 = memoized('bar', 7);
memoized.clear('foo', 3); // Dispose called with foo3 value
memoized.clear('bar', 7); // Dispose called with bar7 value
```

## Profiling & Statistics

If you want to make sure how much you benefit from memoization or just check if memoization works as expected, loading profile module will give access to all valuable information.

__Module needs to be imported before any memoization (that we want to track) is configured. Mind also that running profile module affects performance, it's best not to use it in production environment__

```javascript
var memProfile = require('memoizee/lib/profile');
```

Access statistics at any time:

```javascript
memProfile.statistics;         // Statistcs accessible for programmatical use
console.log(memProfile.log()); // Output statistics data in readable form
```

Example console output:

```
------------------------------------------------------------
Memoize statistics:

 Init  Cache  %Cache  Avg init time  Source location
11604  35682   75.46         0.000s  (all)
 2112  19901   90.41         0.000s  at /Users/medikoo/Projects/_packages/next/lib/fs/is-ignored.js:276:12
 2108   9087   81.17         0.001s  at /Users/medikoo/Projects/_packages/next/lib/fs/is-ignored.js:293:10
 6687   2772   29.31         0.000s  at /Users/medikoo/Projects/_packages/next/lib/fs/watch.js:125:9
  697   3922   84.91         0.000s  at /Users/medikoo/Projects/_packages/next/lib/fs/is-ignored.js:277:15
------------------------------------------------------------
```

* _Init_ – Initial hits
* _Cache_ – Cache hits
* _%Cache_ – What's the percentage of cache hits (of all function calls)
* _Avg init time_ – Average execution time of initial call
* _Source location_ – Where in the source code given memoization was initialized

## Tests [![Build Status](https://secure.travis-ci.org/medikoo/memoize.png?branch=master)](https://secure.travis-ci.org/medikoo/memoize)

	$ npm test
