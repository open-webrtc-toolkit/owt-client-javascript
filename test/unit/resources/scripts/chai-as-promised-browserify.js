(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.chaiAsPromised = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

/* !
 * Chai - checkError utility
 * Copyright(c) 2012-2016 Jake Luer <jake@alogicalparadox.com>
 * MIT Licensed
 */

/**
 * ### .checkError
 *
 * Checks that an error conforms to a given set of criteria and/or retrieves information about it.
 *
 * @api public
 */

/**
 * ### .compatibleInstance(thrown, errorLike)
 *
 * Checks if two instances are compatible (strict equal).
 * Returns false if errorLike is not an instance of Error, because instances
 * can only be compatible if they're both error instances.
 *
 * @name compatibleInstance
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleInstance(thrown, errorLike) {
  return errorLike instanceof Error && thrown === errorLike;
}

/**
 * ### .compatibleConstructor(thrown, errorLike)
 *
 * Checks if two constructors are compatible.
 * This function can receive either an error constructor or
 * an error instance as the `errorLike` argument.
 * Constructors are compatible if they're the same or if one is
 * an instance of another.
 *
 * @name compatibleConstructor
 * @param {Error} thrown error
 * @param {Error|ErrorConstructor} errorLike object to compare against
 * @namespace Utils
 * @api public
 */

function compatibleConstructor(thrown, errorLike) {
  if (errorLike instanceof Error) {
    // If `errorLike` is an instance of any error we compare their constructors
    return thrown.constructor === errorLike.constructor || thrown instanceof errorLike.constructor;
  } else if (errorLike.prototype instanceof Error || errorLike === Error) {
    // If `errorLike` is a constructor that inherits from Error, we compare `thrown` to `errorLike` directly
    return thrown.constructor === errorLike || thrown instanceof errorLike;
  }

  return false;
}

/**
 * ### .compatibleMessage(thrown, errMatcher)
 *
 * Checks if an error's message is compatible with a matcher (String or RegExp).
 * If the message contains the String or passes the RegExp test,
 * it is considered compatible.
 *
 * @name compatibleMessage
 * @param {Error} thrown error
 * @param {String|RegExp} errMatcher to look for into the message
 * @namespace Utils
 * @api public
 */

function compatibleMessage(thrown, errMatcher) {
  var comparisonString = typeof thrown === 'string' ? thrown : thrown.message;
  if (errMatcher instanceof RegExp) {
    return errMatcher.test(comparisonString);
  } else if (typeof errMatcher === 'string') {
    return comparisonString.indexOf(errMatcher) !== -1; // eslint-disable-line no-magic-numbers
  }

  return false;
}

/**
 * ### .getFunctionName(constructorFn)
 *
 * Returns the name of a function.
 * This also includes a polyfill function if `constructorFn.name` is not defined.
 *
 * @name getFunctionName
 * @param {Function} constructorFn
 * @namespace Utils
 * @api private
 */

var functionNameMatch = /\s*function(?:\s|\s*\/\*[^(?:*\/)]+\*\/\s*)*([^\(\/]+)/;
function getFunctionName(constructorFn) {
  var name = '';
  if (typeof constructorFn.name === 'undefined') {
    // Here we run a polyfill if constructorFn.name is not defined
    var match = String(constructorFn).match(functionNameMatch);
    if (match) {
      name = match[1];
    }
  } else {
    name = constructorFn.name;
  }

  return name;
}

/**
 * ### .getConstructorName(errorLike)
 *
 * Gets the constructor name for an Error instance or constructor itself.
 *
 * @name getConstructorName
 * @param {Error|ErrorConstructor} errorLike
 * @namespace Utils
 * @api public
 */

function getConstructorName(errorLike) {
  var constructorName = errorLike;
  if (errorLike instanceof Error) {
    constructorName = getFunctionName(errorLike.constructor);
  } else if (typeof errorLike === 'function') {
    // If `err` is not an instance of Error it is an error constructor itself or another function.
    // If we've got a common function we get its name, otherwise we may need to create a new instance
    // of the error just in case it's a poorly-constructed error. Please see chaijs/chai/issues/45 to know more.
    constructorName = getFunctionName(errorLike).trim() ||
        getFunctionName(new errorLike()); // eslint-disable-line new-cap
  }

  return constructorName;
}

/**
 * ### .getMessage(errorLike)
 *
 * Gets the error message from an error.
 * If `err` is a String itself, we return it.
 * If the error has no message, we return an empty string.
 *
 * @name getMessage
 * @param {Error|String} errorLike
 * @namespace Utils
 * @api public
 */

function getMessage(errorLike) {
  var msg = '';
  if (errorLike && errorLike.message) {
    msg = errorLike.message;
  } else if (typeof errorLike === 'string') {
    msg = errorLike;
  }

  return msg;
}

module.exports = {
  compatibleInstance: compatibleInstance,
  compatibleConstructor: compatibleConstructor,
  compatibleMessage: compatibleMessage,
  getMessage: getMessage,
  getConstructorName: getConstructorName,
};

},{}],2:[function(require,module,exports){
"use strict";
/* eslint-disable no-invalid-this */
let checkError = require("check-error");

module.exports = (chai, utils) => {
    const Assertion = chai.Assertion;
    const assert = chai.assert;
    const proxify = utils.proxify;

    // If we are using a version of Chai that has checkError on it,
    // we want to use that version to be consistent. Otherwise, we use
    // what was passed to the factory.
    if (utils.checkError) {
        checkError = utils.checkError;
    }

    function isLegacyJQueryPromise(thenable) {
        // jQuery promises are Promises/A+-compatible since 3.0.0. jQuery 3.0.0 is also the first version
        // to define the catch method.
        return typeof thenable.catch !== "function" &&
               typeof thenable.always === "function" &&
               typeof thenable.done === "function" &&
               typeof thenable.fail === "function" &&
               typeof thenable.pipe === "function" &&
               typeof thenable.progress === "function" &&
               typeof thenable.state === "function";
    }

    function assertIsAboutPromise(assertion) {
        if (typeof assertion._obj.then !== "function") {
            throw new TypeError(utils.inspect(assertion._obj) + " is not a thenable.");
        }
        if (isLegacyJQueryPromise(assertion._obj)) {
            throw new TypeError("Chai as Promised is incompatible with thenables of jQuery<3.0.0, sorry! Please " +
                                "upgrade jQuery or use another Promises/A+ compatible library (see " +
                                "http://promisesaplus.com/).");
        }
    }

    function proxifyIfSupported(assertion) {
        return proxify === undefined ? assertion : proxify(assertion);
    }

    function method(name, asserter) {
        utils.addMethod(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return asserter.apply(this, arguments);
        });
    }

    function property(name, asserter) {
        utils.addProperty(Assertion.prototype, name, function () {
            assertIsAboutPromise(this);
            return proxifyIfSupported(asserter.apply(this, arguments));
        });
    }

    function doNotify(promise, done) {
        promise.then(() => done(), done);
    }

    // These are for clarity and to bypass Chai refusing to allow `undefined` as actual when used with `assert`.
    function assertIfNegated(assertion, message, extra) {
        assertion.assert(true, null, message, extra.expected, extra.actual);
    }

    function assertIfNotNegated(assertion, message, extra) {
        assertion.assert(false, message, null, extra.expected, extra.actual);
    }

    function getBasePromise(assertion) {
        // We need to chain subsequent asserters on top of ones in the chain already (consider
        // `eventually.have.property("foo").that.equals("bar")`), only running them after the existing ones pass.
        // So the first base-promise is `assertion._obj`, but after that we use the assertions themselves, i.e.
        // previously derived promises, to chain off of.
        return typeof assertion.then === "function" ? assertion : assertion._obj;
    }

    function getReasonName(reason) {
        return reason instanceof Error ? reason.toString() : checkError.getConstructorName(reason);
    }

    // Grab these first, before we modify `Assertion.prototype`.

    const propertyNames = Object.getOwnPropertyNames(Assertion.prototype);

    const propertyDescs = {};
    for (const name of propertyNames) {
        propertyDescs[name] = Object.getOwnPropertyDescriptor(Assertion.prototype, name);
    }

    property("fulfilled", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNegated(this,
                                "expected promise not to be fulfilled but it was fulfilled with #{act}",
                                { actual: value });
                return value;
            },
            reason => {
                assertIfNotNegated(this,
                                   "expected promise to be fulfilled but it was rejected with #{act}",
                                   { actual: getReasonName(reason) });
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("rejected", function () {
        const derivedPromise = getBasePromise(this).then(
            value => {
                assertIfNotNegated(this,
                                   "expected promise to be rejected but it was fulfilled with #{act}",
                                   { actual: value });
                return value;
            },
            reason => {
                assertIfNegated(this,
                                "expected promise not to be rejected but it was rejected with #{act}",
                                { actual: getReasonName(reason) });

                // Return the reason, transforming this into a fulfillment, to allow further assertions, e.g.
                // `promise.should.be.rejected.and.eventually.equal("reason")`.
                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    method("rejectedWith", function (errorLike, errMsgMatcher, message) {
        let errorLikeName = null;
        const negate = utils.flag(this, "negate") || false;

        // rejectedWith with that is called without arguments is
        // the same as a plain ".rejected" use.
        if (errorLike === undefined && errMsgMatcher === undefined &&
            message === undefined) {
            /* eslint-disable no-unused-expressions */
            return this.rejected;
            /* eslint-enable no-unused-expressions */
        }

        if (message !== undefined) {
            utils.flag(this, "message", message);
        }

        if (errorLike instanceof RegExp || typeof errorLike === "string") {
            errMsgMatcher = errorLike;
            errorLike = null;
        } else if (errorLike && errorLike instanceof Error) {
            errorLikeName = errorLike.toString();
        } else if (typeof errorLike === "function") {
            errorLikeName = checkError.getConstructorName(errorLike);
        } else {
            errorLike = null;
        }
        const everyArgIsDefined = Boolean(errorLike && errMsgMatcher);

        let matcherRelation = "including";
        if (errMsgMatcher instanceof RegExp) {
            matcherRelation = "matching";
        }

        const derivedPromise = getBasePromise(this).then(
            value => {
                let assertionMessage = null;
                let expected = null;

                if (errorLike) {
                    assertionMessage = "expected promise to be rejected with #{exp} but it was fulfilled with #{act}";
                    expected = errorLikeName;
                } else if (errMsgMatcher) {
                    assertionMessage = `expected promise to be rejected with an error ${matcherRelation} #{exp} but ` +
                                       `it was fulfilled with #{act}`;
                    expected = errMsgMatcher;
                }

                assertIfNotNegated(this, assertionMessage, { expected, actual: value });
                return value;
            },
            reason => {
                const errorLikeCompatible = errorLike && (errorLike instanceof Error ?
                                                        checkError.compatibleInstance(reason, errorLike) :
                                                        checkError.compatibleConstructor(reason, errorLike));

                const errMsgMatcherCompatible = errMsgMatcher && checkError.compatibleMessage(reason, errMsgMatcher);

                const reasonName = getReasonName(reason);

                if (negate && everyArgIsDefined) {
                    if (errorLikeCompatible && errMsgMatcherCompatible) {
                        this.assert(true,
                                    null,
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }
                } else {
                    if (errorLike) {
                        this.assert(errorLikeCompatible,
                                    "expected promise to be rejected with #{exp} but it was rejected with #{act}",
                                    "expected promise not to be rejected with #{exp} but it was rejected " +
                                    "with #{act}",
                                    errorLikeName,
                                    reasonName);
                    }

                    if (errMsgMatcher) {
                        this.assert(errMsgMatcherCompatible,
                                    `expected promise to be rejected with an error ${matcherRelation} #{exp} but got ` +
                                    `#{act}`,
                                    `expected promise not to be rejected with an error ${matcherRelation} #{exp}`,
                                    errMsgMatcher,
                                    checkError.getMessage(reason));
                    }
                }

                return reason;
            }
        );

        module.exports.transferPromiseness(this, derivedPromise);
        return this;
    });

    property("eventually", function () {
        utils.flag(this, "eventually", true);
        return this;
    });

    method("notify", function (done) {
        doNotify(getBasePromise(this), done);
        return this;
    });

    method("become", function (value, message) {
        return this.eventually.deep.equal(value, message);
    });

    // ### `eventually`

    // We need to be careful not to trigger any getters, thus `Object.getOwnPropertyDescriptor` usage.
    const methodNames = propertyNames.filter(name => {
        return name !== "assert" && typeof propertyDescs[name].value === "function";
    });

    methodNames.forEach(methodName => {
        Assertion.overwriteMethod(methodName, originalMethod => function () {
            return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
        });
    });

    const getterNames = propertyNames.filter(name => {
        return name !== "_obj" && typeof propertyDescs[name].get === "function";
    });

    getterNames.forEach(getterName => {
        // Chainable methods are things like `an`, which can work both for `.should.be.an.instanceOf` and as
        // `should.be.an("object")`. We need to handle those specially.
        const isChainableMethod = Assertion.prototype.__methods.hasOwnProperty(getterName);

        if (isChainableMethod) {
            Assertion.overwriteChainableMethod(
                getterName,
                originalMethod => function () {
                    return doAsserterAsyncAndAddThen(originalMethod, this, arguments);
                },
                originalGetter => function () {
                    return doAsserterAsyncAndAddThen(originalGetter, this);
                }
            );
        } else {
            Assertion.overwriteProperty(getterName, originalGetter => function () {
                return proxifyIfSupported(doAsserterAsyncAndAddThen(originalGetter, this));
            });
        }
    });

    function doAsserterAsyncAndAddThen(asserter, assertion, args) {
        // Since we're intercepting all methods/properties, we need to just pass through if they don't want
        // `eventually`, or if we've already fulfilled the promise (see below).
        if (!utils.flag(assertion, "eventually")) {
            asserter.apply(assertion, args);
            return assertion;
        }

        const derivedPromise = getBasePromise(assertion).then(value => {
            // Set up the environment for the asserter to actually run: `_obj` should be the fulfillment value, and
            // now that we have the value, we're no longer in "eventually" mode, so we won't run any of this code,
            // just the base Chai code that we get to via the short-circuit above.
            assertion._obj = value;
            utils.flag(assertion, "eventually", false);

            return args ? module.exports.transformAsserterArgs(args) : args;
        }).then(newArgs => {
            asserter.apply(assertion, newArgs);

            // Because asserters, for example `property`, can change the value of `_obj` (i.e. change the "object"
            // flag), we need to communicate this value change to subsequent chained asserters. Since we build a
            // promise chain paralleling the asserter chain, we can use it to communicate such changes.
            return assertion._obj;
        });

        module.exports.transferPromiseness(assertion, derivedPromise);
        return assertion;
    }

    // ### Now use the `Assertion` framework to build an `assert` interface.
    const originalAssertMethods = Object.getOwnPropertyNames(assert).filter(propName => {
        return typeof assert[propName] === "function";
    });

    assert.isFulfilled = (promise, message) => (new Assertion(promise, message)).to.be.fulfilled;

    assert.isRejected = (promise, errorLike, errMsgMatcher, message) => {
        const assertion = new Assertion(promise, message);
        return assertion.to.be.rejectedWith(errorLike, errMsgMatcher, message);
    };

    assert.becomes = (promise, value, message) => assert.eventually.deepEqual(promise, value, message);

    assert.doesNotBecome = (promise, value, message) => assert.eventually.notDeepEqual(promise, value, message);

    assert.eventually = {};
    originalAssertMethods.forEach(assertMethodName => {
        assert.eventually[assertMethodName] = function (promise) {
            const otherArgs = Array.prototype.slice.call(arguments, 1);

            let customRejectionHandler;
            const message = arguments[assert[assertMethodName].length - 1];
            if (typeof message === "string") {
                customRejectionHandler = reason => {
                    throw new chai.AssertionError(`${message}\n\nOriginal reason: ${utils.inspect(reason)}`);
                };
            }

            const returnedPromise = promise.then(
                fulfillmentValue => assert[assertMethodName].apply(assert, [fulfillmentValue].concat(otherArgs)),
                customRejectionHandler
            );

            returnedPromise.notify = done => {
                doNotify(returnedPromise, done);
            };

            return returnedPromise;
        };
    });
};

module.exports.transferPromiseness = (assertion, promise) => {
    assertion.then = promise.then.bind(promise);
};

module.exports.transformAsserterArgs = values => values;

},{"check-error":1}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIkM6L1VzZXJzL2ppYW5qdW56L0FwcERhdGEvUm9hbWluZy9ucG0vbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsIm5vZGVfbW9kdWxlcy9jaGVjay1lcnJvci9pbmRleC5qcyIsInVuaXQvcmVzb3VyY2VzL3NjcmlwdHMvY2hhaS1hcy1wcm9taXNlZC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKiAhXG4gKiBDaGFpIC0gY2hlY2tFcnJvciB1dGlsaXR5XG4gKiBDb3B5cmlnaHQoYykgMjAxMi0yMDE2IEpha2UgTHVlciA8amFrZUBhbG9naWNhbHBhcmFkb3guY29tPlxuICogTUlUIExpY2Vuc2VkXG4gKi9cblxuLyoqXG4gKiAjIyMgLmNoZWNrRXJyb3JcbiAqXG4gKiBDaGVja3MgdGhhdCBhbiBlcnJvciBjb25mb3JtcyB0byBhIGdpdmVuIHNldCBvZiBjcml0ZXJpYSBhbmQvb3IgcmV0cmlldmVzIGluZm9ybWF0aW9uIGFib3V0IGl0LlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuLyoqXG4gKiAjIyMgLmNvbXBhdGlibGVJbnN0YW5jZSh0aHJvd24sIGVycm9yTGlrZSlcbiAqXG4gKiBDaGVja3MgaWYgdHdvIGluc3RhbmNlcyBhcmUgY29tcGF0aWJsZSAoc3RyaWN0IGVxdWFsKS5cbiAqIFJldHVybnMgZmFsc2UgaWYgZXJyb3JMaWtlIGlzIG5vdCBhbiBpbnN0YW5jZSBvZiBFcnJvciwgYmVjYXVzZSBpbnN0YW5jZXNcbiAqIGNhbiBvbmx5IGJlIGNvbXBhdGlibGUgaWYgdGhleSdyZSBib3RoIGVycm9yIGluc3RhbmNlcy5cbiAqXG4gKiBAbmFtZSBjb21wYXRpYmxlSW5zdGFuY2VcbiAqIEBwYXJhbSB7RXJyb3J9IHRocm93biBlcnJvclxuICogQHBhcmFtIHtFcnJvcnxFcnJvckNvbnN0cnVjdG9yfSBlcnJvckxpa2Ugb2JqZWN0IHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQG5hbWVzcGFjZSBVdGlsc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBjb21wYXRpYmxlSW5zdGFuY2UodGhyb3duLCBlcnJvckxpa2UpIHtcbiAgcmV0dXJuIGVycm9yTGlrZSBpbnN0YW5jZW9mIEVycm9yICYmIHRocm93biA9PT0gZXJyb3JMaWtlO1xufVxuXG4vKipcbiAqICMjIyAuY29tcGF0aWJsZUNvbnN0cnVjdG9yKHRocm93biwgZXJyb3JMaWtlKVxuICpcbiAqIENoZWNrcyBpZiB0d28gY29uc3RydWN0b3JzIGFyZSBjb21wYXRpYmxlLlxuICogVGhpcyBmdW5jdGlvbiBjYW4gcmVjZWl2ZSBlaXRoZXIgYW4gZXJyb3IgY29uc3RydWN0b3Igb3JcbiAqIGFuIGVycm9yIGluc3RhbmNlIGFzIHRoZSBgZXJyb3JMaWtlYCBhcmd1bWVudC5cbiAqIENvbnN0cnVjdG9ycyBhcmUgY29tcGF0aWJsZSBpZiB0aGV5J3JlIHRoZSBzYW1lIG9yIGlmIG9uZSBpc1xuICogYW4gaW5zdGFuY2Ugb2YgYW5vdGhlci5cbiAqXG4gKiBAbmFtZSBjb21wYXRpYmxlQ29uc3RydWN0b3JcbiAqIEBwYXJhbSB7RXJyb3J9IHRocm93biBlcnJvclxuICogQHBhcmFtIHtFcnJvcnxFcnJvckNvbnN0cnVjdG9yfSBlcnJvckxpa2Ugb2JqZWN0IHRvIGNvbXBhcmUgYWdhaW5zdFxuICogQG5hbWVzcGFjZSBVdGlsc1xuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBjb21wYXRpYmxlQ29uc3RydWN0b3IodGhyb3duLCBlcnJvckxpa2UpIHtcbiAgaWYgKGVycm9yTGlrZSBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgLy8gSWYgYGVycm9yTGlrZWAgaXMgYW4gaW5zdGFuY2Ugb2YgYW55IGVycm9yIHdlIGNvbXBhcmUgdGhlaXIgY29uc3RydWN0b3JzXG4gICAgcmV0dXJuIHRocm93bi5jb25zdHJ1Y3RvciA9PT0gZXJyb3JMaWtlLmNvbnN0cnVjdG9yIHx8IHRocm93biBpbnN0YW5jZW9mIGVycm9yTGlrZS5jb25zdHJ1Y3RvcjtcbiAgfSBlbHNlIGlmIChlcnJvckxpa2UucHJvdG90eXBlIGluc3RhbmNlb2YgRXJyb3IgfHwgZXJyb3JMaWtlID09PSBFcnJvcikge1xuICAgIC8vIElmIGBlcnJvckxpa2VgIGlzIGEgY29uc3RydWN0b3IgdGhhdCBpbmhlcml0cyBmcm9tIEVycm9yLCB3ZSBjb21wYXJlIGB0aHJvd25gIHRvIGBlcnJvckxpa2VgIGRpcmVjdGx5XG4gICAgcmV0dXJuIHRocm93bi5jb25zdHJ1Y3RvciA9PT0gZXJyb3JMaWtlIHx8IHRocm93biBpbnN0YW5jZW9mIGVycm9yTGlrZTtcbiAgfVxuXG4gIHJldHVybiBmYWxzZTtcbn1cblxuLyoqXG4gKiAjIyMgLmNvbXBhdGlibGVNZXNzYWdlKHRocm93biwgZXJyTWF0Y2hlcilcbiAqXG4gKiBDaGVja3MgaWYgYW4gZXJyb3IncyBtZXNzYWdlIGlzIGNvbXBhdGlibGUgd2l0aCBhIG1hdGNoZXIgKFN0cmluZyBvciBSZWdFeHApLlxuICogSWYgdGhlIG1lc3NhZ2UgY29udGFpbnMgdGhlIFN0cmluZyBvciBwYXNzZXMgdGhlIFJlZ0V4cCB0ZXN0LFxuICogaXQgaXMgY29uc2lkZXJlZCBjb21wYXRpYmxlLlxuICpcbiAqIEBuYW1lIGNvbXBhdGlibGVNZXNzYWdlXG4gKiBAcGFyYW0ge0Vycm9yfSB0aHJvd24gZXJyb3JcbiAqIEBwYXJhbSB7U3RyaW5nfFJlZ0V4cH0gZXJyTWF0Y2hlciB0byBsb29rIGZvciBpbnRvIHRoZSBtZXNzYWdlXG4gKiBAbmFtZXNwYWNlIFV0aWxzXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIGNvbXBhdGlibGVNZXNzYWdlKHRocm93biwgZXJyTWF0Y2hlcikge1xuICB2YXIgY29tcGFyaXNvblN0cmluZyA9IHR5cGVvZiB0aHJvd24gPT09ICdzdHJpbmcnID8gdGhyb3duIDogdGhyb3duLm1lc3NhZ2U7XG4gIGlmIChlcnJNYXRjaGVyIGluc3RhbmNlb2YgUmVnRXhwKSB7XG4gICAgcmV0dXJuIGVyck1hdGNoZXIudGVzdChjb21wYXJpc29uU3RyaW5nKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXJyTWF0Y2hlciA9PT0gJ3N0cmluZycpIHtcbiAgICByZXR1cm4gY29tcGFyaXNvblN0cmluZy5pbmRleE9mKGVyck1hdGNoZXIpICE9PSAtMTsgLy8gZXNsaW50LWRpc2FibGUtbGluZSBuby1tYWdpYy1udW1iZXJzXG4gIH1cblxuICByZXR1cm4gZmFsc2U7XG59XG5cbi8qKlxuICogIyMjIC5nZXRGdW5jdGlvbk5hbWUoY29uc3RydWN0b3JGbilcbiAqXG4gKiBSZXR1cm5zIHRoZSBuYW1lIG9mIGEgZnVuY3Rpb24uXG4gKiBUaGlzIGFsc28gaW5jbHVkZXMgYSBwb2x5ZmlsbCBmdW5jdGlvbiBpZiBgY29uc3RydWN0b3JGbi5uYW1lYCBpcyBub3QgZGVmaW5lZC5cbiAqXG4gKiBAbmFtZSBnZXRGdW5jdGlvbk5hbWVcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGNvbnN0cnVjdG9yRm5cbiAqIEBuYW1lc3BhY2UgVXRpbHNcbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbnZhciBmdW5jdGlvbk5hbWVNYXRjaCA9IC9cXHMqZnVuY3Rpb24oPzpcXHN8XFxzKlxcL1xcKlteKD86KlxcLyldK1xcKlxcL1xccyopKihbXlxcKFxcL10rKS87XG5mdW5jdGlvbiBnZXRGdW5jdGlvbk5hbWUoY29uc3RydWN0b3JGbikge1xuICB2YXIgbmFtZSA9ICcnO1xuICBpZiAodHlwZW9mIGNvbnN0cnVjdG9yRm4ubmFtZSA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgICAvLyBIZXJlIHdlIHJ1biBhIHBvbHlmaWxsIGlmIGNvbnN0cnVjdG9yRm4ubmFtZSBpcyBub3QgZGVmaW5lZFxuICAgIHZhciBtYXRjaCA9IFN0cmluZyhjb25zdHJ1Y3RvckZuKS5tYXRjaChmdW5jdGlvbk5hbWVNYXRjaCk7XG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBuYW1lID0gbWF0Y2hbMV07XG4gICAgfVxuICB9IGVsc2Uge1xuICAgIG5hbWUgPSBjb25zdHJ1Y3RvckZuLm5hbWU7XG4gIH1cblxuICByZXR1cm4gbmFtZTtcbn1cblxuLyoqXG4gKiAjIyMgLmdldENvbnN0cnVjdG9yTmFtZShlcnJvckxpa2UpXG4gKlxuICogR2V0cyB0aGUgY29uc3RydWN0b3IgbmFtZSBmb3IgYW4gRXJyb3IgaW5zdGFuY2Ugb3IgY29uc3RydWN0b3IgaXRzZWxmLlxuICpcbiAqIEBuYW1lIGdldENvbnN0cnVjdG9yTmFtZVxuICogQHBhcmFtIHtFcnJvcnxFcnJvckNvbnN0cnVjdG9yfSBlcnJvckxpa2VcbiAqIEBuYW1lc3BhY2UgVXRpbHNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZ2V0Q29uc3RydWN0b3JOYW1lKGVycm9yTGlrZSkge1xuICB2YXIgY29uc3RydWN0b3JOYW1lID0gZXJyb3JMaWtlO1xuICBpZiAoZXJyb3JMaWtlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICBjb25zdHJ1Y3Rvck5hbWUgPSBnZXRGdW5jdGlvbk5hbWUoZXJyb3JMaWtlLmNvbnN0cnVjdG9yKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgZXJyb3JMaWtlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgLy8gSWYgYGVycmAgaXMgbm90IGFuIGluc3RhbmNlIG9mIEVycm9yIGl0IGlzIGFuIGVycm9yIGNvbnN0cnVjdG9yIGl0c2VsZiBvciBhbm90aGVyIGZ1bmN0aW9uLlxuICAgIC8vIElmIHdlJ3ZlIGdvdCBhIGNvbW1vbiBmdW5jdGlvbiB3ZSBnZXQgaXRzIG5hbWUsIG90aGVyd2lzZSB3ZSBtYXkgbmVlZCB0byBjcmVhdGUgYSBuZXcgaW5zdGFuY2VcbiAgICAvLyBvZiB0aGUgZXJyb3IganVzdCBpbiBjYXNlIGl0J3MgYSBwb29ybHktY29uc3RydWN0ZWQgZXJyb3IuIFBsZWFzZSBzZWUgY2hhaWpzL2NoYWkvaXNzdWVzLzQ1IHRvIGtub3cgbW9yZS5cbiAgICBjb25zdHJ1Y3Rvck5hbWUgPSBnZXRGdW5jdGlvbk5hbWUoZXJyb3JMaWtlKS50cmltKCkgfHxcbiAgICAgICAgZ2V0RnVuY3Rpb25OYW1lKG5ldyBlcnJvckxpa2UoKSk7IC8vIGVzbGludC1kaXNhYmxlLWxpbmUgbmV3LWNhcFxuICB9XG5cbiAgcmV0dXJuIGNvbnN0cnVjdG9yTmFtZTtcbn1cblxuLyoqXG4gKiAjIyMgLmdldE1lc3NhZ2UoZXJyb3JMaWtlKVxuICpcbiAqIEdldHMgdGhlIGVycm9yIG1lc3NhZ2UgZnJvbSBhbiBlcnJvci5cbiAqIElmIGBlcnJgIGlzIGEgU3RyaW5nIGl0c2VsZiwgd2UgcmV0dXJuIGl0LlxuICogSWYgdGhlIGVycm9yIGhhcyBubyBtZXNzYWdlLCB3ZSByZXR1cm4gYW4gZW1wdHkgc3RyaW5nLlxuICpcbiAqIEBuYW1lIGdldE1lc3NhZ2VcbiAqIEBwYXJhbSB7RXJyb3J8U3RyaW5nfSBlcnJvckxpa2VcbiAqIEBuYW1lc3BhY2UgVXRpbHNcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gZ2V0TWVzc2FnZShlcnJvckxpa2UpIHtcbiAgdmFyIG1zZyA9ICcnO1xuICBpZiAoZXJyb3JMaWtlICYmIGVycm9yTGlrZS5tZXNzYWdlKSB7XG4gICAgbXNnID0gZXJyb3JMaWtlLm1lc3NhZ2U7XG4gIH0gZWxzZSBpZiAodHlwZW9mIGVycm9yTGlrZSA9PT0gJ3N0cmluZycpIHtcbiAgICBtc2cgPSBlcnJvckxpa2U7XG4gIH1cblxuICByZXR1cm4gbXNnO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgY29tcGF0aWJsZUluc3RhbmNlOiBjb21wYXRpYmxlSW5zdGFuY2UsXG4gIGNvbXBhdGlibGVDb25zdHJ1Y3RvcjogY29tcGF0aWJsZUNvbnN0cnVjdG9yLFxuICBjb21wYXRpYmxlTWVzc2FnZTogY29tcGF0aWJsZU1lc3NhZ2UsXG4gIGdldE1lc3NhZ2U6IGdldE1lc3NhZ2UsXG4gIGdldENvbnN0cnVjdG9yTmFtZTogZ2V0Q29uc3RydWN0b3JOYW1lLFxufTtcbiIsIlwidXNlIHN0cmljdFwiO1xuLyogZXNsaW50LWRpc2FibGUgbm8taW52YWxpZC10aGlzICovXG5sZXQgY2hlY2tFcnJvciA9IHJlcXVpcmUoXCJjaGVjay1lcnJvclwiKTtcblxubW9kdWxlLmV4cG9ydHMgPSAoY2hhaSwgdXRpbHMpID0+IHtcbiAgICBjb25zdCBBc3NlcnRpb24gPSBjaGFpLkFzc2VydGlvbjtcbiAgICBjb25zdCBhc3NlcnQgPSBjaGFpLmFzc2VydDtcbiAgICBjb25zdCBwcm94aWZ5ID0gdXRpbHMucHJveGlmeTtcblxuICAgIC8vIElmIHdlIGFyZSB1c2luZyBhIHZlcnNpb24gb2YgQ2hhaSB0aGF0IGhhcyBjaGVja0Vycm9yIG9uIGl0LFxuICAgIC8vIHdlIHdhbnQgdG8gdXNlIHRoYXQgdmVyc2lvbiB0byBiZSBjb25zaXN0ZW50LiBPdGhlcndpc2UsIHdlIHVzZVxuICAgIC8vIHdoYXQgd2FzIHBhc3NlZCB0byB0aGUgZmFjdG9yeS5cbiAgICBpZiAodXRpbHMuY2hlY2tFcnJvcikge1xuICAgICAgICBjaGVja0Vycm9yID0gdXRpbHMuY2hlY2tFcnJvcjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBpc0xlZ2FjeUpRdWVyeVByb21pc2UodGhlbmFibGUpIHtcbiAgICAgICAgLy8galF1ZXJ5IHByb21pc2VzIGFyZSBQcm9taXNlcy9BKy1jb21wYXRpYmxlIHNpbmNlIDMuMC4wLiBqUXVlcnkgMy4wLjAgaXMgYWxzbyB0aGUgZmlyc3QgdmVyc2lvblxuICAgICAgICAvLyB0byBkZWZpbmUgdGhlIGNhdGNoIG1ldGhvZC5cbiAgICAgICAgcmV0dXJuIHR5cGVvZiB0aGVuYWJsZS5jYXRjaCAhPT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuYWx3YXlzID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiB0aGVuYWJsZS5kb25lID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiB0aGVuYWJsZS5mYWlsID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiB0aGVuYWJsZS5waXBlID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICAgICAgICAgICAgIHR5cGVvZiB0aGVuYWJsZS5wcm9ncmVzcyA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgICAgICAgICAgICB0eXBlb2YgdGhlbmFibGUuc3RhdGUgPT09IFwiZnVuY3Rpb25cIjtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhc3NlcnRJc0Fib3V0UHJvbWlzZShhc3NlcnRpb24pIHtcbiAgICAgICAgaWYgKHR5cGVvZiBhc3NlcnRpb24uX29iai50aGVuICE9PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IodXRpbHMuaW5zcGVjdChhc3NlcnRpb24uX29iaikgKyBcIiBpcyBub3QgYSB0aGVuYWJsZS5cIik7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKGlzTGVnYWN5SlF1ZXJ5UHJvbWlzZShhc3NlcnRpb24uX29iaikpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBUeXBlRXJyb3IoXCJDaGFpIGFzIFByb21pc2VkIGlzIGluY29tcGF0aWJsZSB3aXRoIHRoZW5hYmxlcyBvZiBqUXVlcnk8My4wLjAsIHNvcnJ5ISBQbGVhc2UgXCIgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcInVwZ3JhZGUgalF1ZXJ5IG9yIHVzZSBhbm90aGVyIFByb21pc2VzL0ErIGNvbXBhdGlibGUgbGlicmFyeSAoc2VlIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJodHRwOi8vcHJvbWlzZXNhcGx1cy5jb20vKS5cIik7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm94aWZ5SWZTdXBwb3J0ZWQoYXNzZXJ0aW9uKSB7XG4gICAgICAgIHJldHVybiBwcm94aWZ5ID09PSB1bmRlZmluZWQgPyBhc3NlcnRpb24gOiBwcm94aWZ5KGFzc2VydGlvbik7XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gbWV0aG9kKG5hbWUsIGFzc2VydGVyKSB7XG4gICAgICAgIHV0aWxzLmFkZE1ldGhvZChBc3NlcnRpb24ucHJvdG90eXBlLCBuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnRJc0Fib3V0UHJvbWlzZSh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiBhc3NlcnRlci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBwcm9wZXJ0eShuYW1lLCBhc3NlcnRlcikge1xuICAgICAgICB1dGlscy5hZGRQcm9wZXJ0eShBc3NlcnRpb24ucHJvdG90eXBlLCBuYW1lLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBhc3NlcnRJc0Fib3V0UHJvbWlzZSh0aGlzKTtcbiAgICAgICAgICAgIHJldHVybiBwcm94aWZ5SWZTdXBwb3J0ZWQoYXNzZXJ0ZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKSk7XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGZ1bmN0aW9uIGRvTm90aWZ5KHByb21pc2UsIGRvbmUpIHtcbiAgICAgICAgcHJvbWlzZS50aGVuKCgpID0+IGRvbmUoKSwgZG9uZSk7XG4gICAgfVxuXG4gICAgLy8gVGhlc2UgYXJlIGZvciBjbGFyaXR5IGFuZCB0byBieXBhc3MgQ2hhaSByZWZ1c2luZyB0byBhbGxvdyBgdW5kZWZpbmVkYCBhcyBhY3R1YWwgd2hlbiB1c2VkIHdpdGggYGFzc2VydGAuXG4gICAgZnVuY3Rpb24gYXNzZXJ0SWZOZWdhdGVkKGFzc2VydGlvbiwgbWVzc2FnZSwgZXh0cmEpIHtcbiAgICAgICAgYXNzZXJ0aW9uLmFzc2VydCh0cnVlLCBudWxsLCBtZXNzYWdlLCBleHRyYS5leHBlY3RlZCwgZXh0cmEuYWN0dWFsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBhc3NlcnRJZk5vdE5lZ2F0ZWQoYXNzZXJ0aW9uLCBtZXNzYWdlLCBleHRyYSkge1xuICAgICAgICBhc3NlcnRpb24uYXNzZXJ0KGZhbHNlLCBtZXNzYWdlLCBudWxsLCBleHRyYS5leHBlY3RlZCwgZXh0cmEuYWN0dWFsKTtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRCYXNlUHJvbWlzZShhc3NlcnRpb24pIHtcbiAgICAgICAgLy8gV2UgbmVlZCB0byBjaGFpbiBzdWJzZXF1ZW50IGFzc2VydGVycyBvbiB0b3Agb2Ygb25lcyBpbiB0aGUgY2hhaW4gYWxyZWFkeSAoY29uc2lkZXJcbiAgICAgICAgLy8gYGV2ZW50dWFsbHkuaGF2ZS5wcm9wZXJ0eShcImZvb1wiKS50aGF0LmVxdWFscyhcImJhclwiKWApLCBvbmx5IHJ1bm5pbmcgdGhlbSBhZnRlciB0aGUgZXhpc3Rpbmcgb25lcyBwYXNzLlxuICAgICAgICAvLyBTbyB0aGUgZmlyc3QgYmFzZS1wcm9taXNlIGlzIGBhc3NlcnRpb24uX29iamAsIGJ1dCBhZnRlciB0aGF0IHdlIHVzZSB0aGUgYXNzZXJ0aW9ucyB0aGVtc2VsdmVzLCBpLmUuXG4gICAgICAgIC8vIHByZXZpb3VzbHkgZGVyaXZlZCBwcm9taXNlcywgdG8gY2hhaW4gb2ZmIG9mLlxuICAgICAgICByZXR1cm4gdHlwZW9mIGFzc2VydGlvbi50aGVuID09PSBcImZ1bmN0aW9uXCIgPyBhc3NlcnRpb24gOiBhc3NlcnRpb24uX29iajtcbiAgICB9XG5cbiAgICBmdW5jdGlvbiBnZXRSZWFzb25OYW1lKHJlYXNvbikge1xuICAgICAgICByZXR1cm4gcmVhc29uIGluc3RhbmNlb2YgRXJyb3IgPyByZWFzb24udG9TdHJpbmcoKSA6IGNoZWNrRXJyb3IuZ2V0Q29uc3RydWN0b3JOYW1lKHJlYXNvbik7XG4gICAgfVxuXG4gICAgLy8gR3JhYiB0aGVzZSBmaXJzdCwgYmVmb3JlIHdlIG1vZGlmeSBgQXNzZXJ0aW9uLnByb3RvdHlwZWAuXG5cbiAgICBjb25zdCBwcm9wZXJ0eU5hbWVzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoQXNzZXJ0aW9uLnByb3RvdHlwZSk7XG5cbiAgICBjb25zdCBwcm9wZXJ0eURlc2NzID0ge307XG4gICAgZm9yIChjb25zdCBuYW1lIG9mIHByb3BlcnR5TmFtZXMpIHtcbiAgICAgICAgcHJvcGVydHlEZXNjc1tuYW1lXSA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eURlc2NyaXB0b3IoQXNzZXJ0aW9uLnByb3RvdHlwZSwgbmFtZSk7XG4gICAgfVxuXG4gICAgcHJvcGVydHkoXCJmdWxmaWxsZWRcIiwgZnVuY3Rpb24gKCkge1xuICAgICAgICBjb25zdCBkZXJpdmVkUHJvbWlzZSA9IGdldEJhc2VQcm9taXNlKHRoaXMpLnRoZW4oXG4gICAgICAgICAgICB2YWx1ZSA9PiB7XG4gICAgICAgICAgICAgICAgYXNzZXJ0SWZOZWdhdGVkKHRoaXMsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwiZXhwZWN0ZWQgcHJvbWlzZSBub3QgdG8gYmUgZnVsZmlsbGVkIGJ1dCBpdCB3YXMgZnVsZmlsbGVkIHdpdGggI3thY3R9XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgYWN0dWFsOiB2YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVhc29uID0+IHtcbiAgICAgICAgICAgICAgICBhc3NlcnRJZk5vdE5lZ2F0ZWQodGhpcyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJleHBlY3RlZCBwcm9taXNlIHRvIGJlIGZ1bGZpbGxlZCBidXQgaXQgd2FzIHJlamVjdGVkIHdpdGggI3thY3R9XCIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHsgYWN0dWFsOiBnZXRSZWFzb25OYW1lKHJlYXNvbikgfSk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYXNvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBtb2R1bGUuZXhwb3J0cy50cmFuc2ZlclByb21pc2VuZXNzKHRoaXMsIGRlcml2ZWRQcm9taXNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBwcm9wZXJ0eShcInJlamVjdGVkXCIsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgY29uc3QgZGVyaXZlZFByb21pc2UgPSBnZXRCYXNlUHJvbWlzZSh0aGlzKS50aGVuKFxuICAgICAgICAgICAgdmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgIGFzc2VydElmTm90TmVnYXRlZCh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImV4cGVjdGVkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgYnV0IGl0IHdhcyBmdWxmaWxsZWQgd2l0aCAje2FjdH1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBhY3R1YWw6IHZhbHVlIH0pO1xuICAgICAgICAgICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWFzb24gPT4ge1xuICAgICAgICAgICAgICAgIGFzc2VydElmTmVnYXRlZCh0aGlzLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImV4cGVjdGVkIHByb21pc2Ugbm90IHRvIGJlIHJlamVjdGVkIGJ1dCBpdCB3YXMgcmVqZWN0ZWQgd2l0aCAje2FjdH1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgeyBhY3R1YWw6IGdldFJlYXNvbk5hbWUocmVhc29uKSB9KTtcblxuICAgICAgICAgICAgICAgIC8vIFJldHVybiB0aGUgcmVhc29uLCB0cmFuc2Zvcm1pbmcgdGhpcyBpbnRvIGEgZnVsZmlsbG1lbnQsIHRvIGFsbG93IGZ1cnRoZXIgYXNzZXJ0aW9ucywgZS5nLlxuICAgICAgICAgICAgICAgIC8vIGBwcm9taXNlLnNob3VsZC5iZS5yZWplY3RlZC5hbmQuZXZlbnR1YWxseS5lcXVhbChcInJlYXNvblwiKWAuXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlYXNvbjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcblxuICAgICAgICBtb2R1bGUuZXhwb3J0cy50cmFuc2ZlclByb21pc2VuZXNzKHRoaXMsIGRlcml2ZWRQcm9taXNlKTtcbiAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfSk7XG5cbiAgICBtZXRob2QoXCJyZWplY3RlZFdpdGhcIiwgZnVuY3Rpb24gKGVycm9yTGlrZSwgZXJyTXNnTWF0Y2hlciwgbWVzc2FnZSkge1xuICAgICAgICBsZXQgZXJyb3JMaWtlTmFtZSA9IG51bGw7XG4gICAgICAgIGNvbnN0IG5lZ2F0ZSA9IHV0aWxzLmZsYWcodGhpcywgXCJuZWdhdGVcIikgfHwgZmFsc2U7XG5cbiAgICAgICAgLy8gcmVqZWN0ZWRXaXRoIHdpdGggdGhhdCBpcyBjYWxsZWQgd2l0aG91dCBhcmd1bWVudHMgaXNcbiAgICAgICAgLy8gdGhlIHNhbWUgYXMgYSBwbGFpbiBcIi5yZWplY3RlZFwiIHVzZS5cbiAgICAgICAgaWYgKGVycm9yTGlrZSA9PT0gdW5kZWZpbmVkICYmIGVyck1zZ01hdGNoZXIgPT09IHVuZGVmaW5lZCAmJlxuICAgICAgICAgICAgbWVzc2FnZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAvKiBlc2xpbnQtZGlzYWJsZSBuby11bnVzZWQtZXhwcmVzc2lvbnMgKi9cbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJlamVjdGVkO1xuICAgICAgICAgICAgLyogZXNsaW50LWVuYWJsZSBuby11bnVzZWQtZXhwcmVzc2lvbnMgKi9cbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChtZXNzYWdlICE9PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIHV0aWxzLmZsYWcodGhpcywgXCJtZXNzYWdlXCIsIG1lc3NhZ2UpO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGVycm9yTGlrZSBpbnN0YW5jZW9mIFJlZ0V4cCB8fCB0eXBlb2YgZXJyb3JMaWtlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICBlcnJNc2dNYXRjaGVyID0gZXJyb3JMaWtlO1xuICAgICAgICAgICAgZXJyb3JMaWtlID0gbnVsbDtcbiAgICAgICAgfSBlbHNlIGlmIChlcnJvckxpa2UgJiYgZXJyb3JMaWtlIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgICAgIGVycm9yTGlrZU5hbWUgPSBlcnJvckxpa2UudG9TdHJpbmcoKTtcbiAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgZXJyb3JMaWtlID09PSBcImZ1bmN0aW9uXCIpIHtcbiAgICAgICAgICAgIGVycm9yTGlrZU5hbWUgPSBjaGVja0Vycm9yLmdldENvbnN0cnVjdG9yTmFtZShlcnJvckxpa2UpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZXJyb3JMaWtlID0gbnVsbDtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBldmVyeUFyZ0lzRGVmaW5lZCA9IEJvb2xlYW4oZXJyb3JMaWtlICYmIGVyck1zZ01hdGNoZXIpO1xuXG4gICAgICAgIGxldCBtYXRjaGVyUmVsYXRpb24gPSBcImluY2x1ZGluZ1wiO1xuICAgICAgICBpZiAoZXJyTXNnTWF0Y2hlciBpbnN0YW5jZW9mIFJlZ0V4cCkge1xuICAgICAgICAgICAgbWF0Y2hlclJlbGF0aW9uID0gXCJtYXRjaGluZ1wiO1xuICAgICAgICB9XG5cbiAgICAgICAgY29uc3QgZGVyaXZlZFByb21pc2UgPSBnZXRCYXNlUHJvbWlzZSh0aGlzKS50aGVuKFxuICAgICAgICAgICAgdmFsdWUgPT4ge1xuICAgICAgICAgICAgICAgIGxldCBhc3NlcnRpb25NZXNzYWdlID0gbnVsbDtcbiAgICAgICAgICAgICAgICBsZXQgZXhwZWN0ZWQgPSBudWxsO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yTGlrZSkge1xuICAgICAgICAgICAgICAgICAgICBhc3NlcnRpb25NZXNzYWdlID0gXCJleHBlY3RlZCBwcm9taXNlIHRvIGJlIHJlamVjdGVkIHdpdGggI3tleHB9IGJ1dCBpdCB3YXMgZnVsZmlsbGVkIHdpdGggI3thY3R9XCI7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gZXJyb3JMaWtlTmFtZTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGVyck1zZ01hdGNoZXIpIHtcbiAgICAgICAgICAgICAgICAgICAgYXNzZXJ0aW9uTWVzc2FnZSA9IGBleHBlY3RlZCBwcm9taXNlIHRvIGJlIHJlamVjdGVkIHdpdGggYW4gZXJyb3IgJHttYXRjaGVyUmVsYXRpb259ICN7ZXhwfSBidXQgYCArXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgaXQgd2FzIGZ1bGZpbGxlZCB3aXRoICN7YWN0fWA7XG4gICAgICAgICAgICAgICAgICAgIGV4cGVjdGVkID0gZXJyTXNnTWF0Y2hlcjtcbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBhc3NlcnRJZk5vdE5lZ2F0ZWQodGhpcywgYXNzZXJ0aW9uTWVzc2FnZSwgeyBleHBlY3RlZCwgYWN0dWFsOiB2YWx1ZSB9KTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVhc29uID0+IHtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvckxpa2VDb21wYXRpYmxlID0gZXJyb3JMaWtlICYmIChlcnJvckxpa2UgaW5zdGFuY2VvZiBFcnJvciA/XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRXJyb3IuY29tcGF0aWJsZUluc3RhbmNlKHJlYXNvbiwgZXJyb3JMaWtlKSA6XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrRXJyb3IuY29tcGF0aWJsZUNvbnN0cnVjdG9yKHJlYXNvbiwgZXJyb3JMaWtlKSk7XG5cbiAgICAgICAgICAgICAgICBjb25zdCBlcnJNc2dNYXRjaGVyQ29tcGF0aWJsZSA9IGVyck1zZ01hdGNoZXIgJiYgY2hlY2tFcnJvci5jb21wYXRpYmxlTWVzc2FnZShyZWFzb24sIGVyck1zZ01hdGNoZXIpO1xuXG4gICAgICAgICAgICAgICAgY29uc3QgcmVhc29uTmFtZSA9IGdldFJlYXNvbk5hbWUocmVhc29uKTtcblxuICAgICAgICAgICAgICAgIGlmIChuZWdhdGUgJiYgZXZlcnlBcmdJc0RlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVycm9yTGlrZUNvbXBhdGlibGUgJiYgZXJyTXNnTWF0Y2hlckNvbXBhdGlibGUpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXNzZXJ0KHRydWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBudWxsLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJleHBlY3RlZCBwcm9taXNlIG5vdCB0byBiZSByZWplY3RlZCB3aXRoICN7ZXhwfSBidXQgaXQgd2FzIHJlamVjdGVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwid2l0aCAje2FjdH1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTGlrZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFzb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJvckxpa2UpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXNzZXJ0KGVycm9yTGlrZUNvbXBhdGlibGUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBcImV4cGVjdGVkIHByb21pc2UgdG8gYmUgcmVqZWN0ZWQgd2l0aCAje2V4cH0gYnV0IGl0IHdhcyByZWplY3RlZCB3aXRoICN7YWN0fVwiLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgXCJleHBlY3RlZCBwcm9taXNlIG5vdCB0byBiZSByZWplY3RlZCB3aXRoICN7ZXhwfSBidXQgaXQgd2FzIHJlamVjdGVkIFwiICtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIFwid2l0aCAje2FjdH1cIixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVycm9yTGlrZU5hbWUsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZWFzb25OYW1lKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGlmIChlcnJNc2dNYXRjaGVyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmFzc2VydChlcnJNc2dNYXRjaGVyQ29tcGF0aWJsZSxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGBleHBlY3RlZCBwcm9taXNlIHRvIGJlIHJlamVjdGVkIHdpdGggYW4gZXJyb3IgJHttYXRjaGVyUmVsYXRpb259ICN7ZXhwfSBidXQgZ290IGAgK1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYCN7YWN0fWAsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBgZXhwZWN0ZWQgcHJvbWlzZSBub3QgdG8gYmUgcmVqZWN0ZWQgd2l0aCBhbiBlcnJvciAke21hdGNoZXJSZWxhdGlvbn0gI3tleHB9YCxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVyck1zZ01hdGNoZXIsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja0Vycm9yLmdldE1lc3NhZ2UocmVhc29uKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICByZXR1cm4gcmVhc29uO1xuICAgICAgICAgICAgfVxuICAgICAgICApO1xuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnRyYW5zZmVyUHJvbWlzZW5lc3ModGhpcywgZGVyaXZlZFByb21pc2UpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIHByb3BlcnR5KFwiZXZlbnR1YWxseVwiLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHV0aWxzLmZsYWcodGhpcywgXCJldmVudHVhbGx5XCIsIHRydWUpO1xuICAgICAgICByZXR1cm4gdGhpcztcbiAgICB9KTtcblxuICAgIG1ldGhvZChcIm5vdGlmeVwiLCBmdW5jdGlvbiAoZG9uZSkge1xuICAgICAgICBkb05vdGlmeShnZXRCYXNlUHJvbWlzZSh0aGlzKSwgZG9uZSk7XG4gICAgICAgIHJldHVybiB0aGlzO1xuICAgIH0pO1xuXG4gICAgbWV0aG9kKFwiYmVjb21lXCIsIGZ1bmN0aW9uICh2YWx1ZSwgbWVzc2FnZSkge1xuICAgICAgICByZXR1cm4gdGhpcy5ldmVudHVhbGx5LmRlZXAuZXF1YWwodmFsdWUsIG1lc3NhZ2UpO1xuICAgIH0pO1xuXG4gICAgLy8gIyMjIGBldmVudHVhbGx5YFxuXG4gICAgLy8gV2UgbmVlZCB0byBiZSBjYXJlZnVsIG5vdCB0byB0cmlnZ2VyIGFueSBnZXR0ZXJzLCB0aHVzIGBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yYCB1c2FnZS5cbiAgICBjb25zdCBtZXRob2ROYW1lcyA9IHByb3BlcnR5TmFtZXMuZmlsdGVyKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4gbmFtZSAhPT0gXCJhc3NlcnRcIiAmJiB0eXBlb2YgcHJvcGVydHlEZXNjc1tuYW1lXS52YWx1ZSA9PT0gXCJmdW5jdGlvblwiO1xuICAgIH0pO1xuXG4gICAgbWV0aG9kTmFtZXMuZm9yRWFjaChtZXRob2ROYW1lID0+IHtcbiAgICAgICAgQXNzZXJ0aW9uLm92ZXJ3cml0ZU1ldGhvZChtZXRob2ROYW1lLCBvcmlnaW5hbE1ldGhvZCA9PiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXR1cm4gZG9Bc3NlcnRlckFzeW5jQW5kQWRkVGhlbihvcmlnaW5hbE1ldGhvZCwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG5cbiAgICBjb25zdCBnZXR0ZXJOYW1lcyA9IHByb3BlcnR5TmFtZXMuZmlsdGVyKG5hbWUgPT4ge1xuICAgICAgICByZXR1cm4gbmFtZSAhPT0gXCJfb2JqXCIgJiYgdHlwZW9mIHByb3BlcnR5RGVzY3NbbmFtZV0uZ2V0ID09PSBcImZ1bmN0aW9uXCI7XG4gICAgfSk7XG5cbiAgICBnZXR0ZXJOYW1lcy5mb3JFYWNoKGdldHRlck5hbWUgPT4ge1xuICAgICAgICAvLyBDaGFpbmFibGUgbWV0aG9kcyBhcmUgdGhpbmdzIGxpa2UgYGFuYCwgd2hpY2ggY2FuIHdvcmsgYm90aCBmb3IgYC5zaG91bGQuYmUuYW4uaW5zdGFuY2VPZmAgYW5kIGFzXG4gICAgICAgIC8vIGBzaG91bGQuYmUuYW4oXCJvYmplY3RcIilgLiBXZSBuZWVkIHRvIGhhbmRsZSB0aG9zZSBzcGVjaWFsbHkuXG4gICAgICAgIGNvbnN0IGlzQ2hhaW5hYmxlTWV0aG9kID0gQXNzZXJ0aW9uLnByb3RvdHlwZS5fX21ldGhvZHMuaGFzT3duUHJvcGVydHkoZ2V0dGVyTmFtZSk7XG5cbiAgICAgICAgaWYgKGlzQ2hhaW5hYmxlTWV0aG9kKSB7XG4gICAgICAgICAgICBBc3NlcnRpb24ub3ZlcndyaXRlQ2hhaW5hYmxlTWV0aG9kKFxuICAgICAgICAgICAgICAgIGdldHRlck5hbWUsXG4gICAgICAgICAgICAgICAgb3JpZ2luYWxNZXRob2QgPT4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZG9Bc3NlcnRlckFzeW5jQW5kQWRkVGhlbihvcmlnaW5hbE1ldGhvZCwgdGhpcywgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9LFxuICAgICAgICAgICAgICAgIG9yaWdpbmFsR2V0dGVyID0+IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRvQXNzZXJ0ZXJBc3luY0FuZEFkZFRoZW4ob3JpZ2luYWxHZXR0ZXIsIHRoaXMpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBBc3NlcnRpb24ub3ZlcndyaXRlUHJvcGVydHkoZ2V0dGVyTmFtZSwgb3JpZ2luYWxHZXR0ZXIgPT4gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiBwcm94aWZ5SWZTdXBwb3J0ZWQoZG9Bc3NlcnRlckFzeW5jQW5kQWRkVGhlbihvcmlnaW5hbEdldHRlciwgdGhpcykpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cbiAgICB9KTtcblxuICAgIGZ1bmN0aW9uIGRvQXNzZXJ0ZXJBc3luY0FuZEFkZFRoZW4oYXNzZXJ0ZXIsIGFzc2VydGlvbiwgYXJncykge1xuICAgICAgICAvLyBTaW5jZSB3ZSdyZSBpbnRlcmNlcHRpbmcgYWxsIG1ldGhvZHMvcHJvcGVydGllcywgd2UgbmVlZCB0byBqdXN0IHBhc3MgdGhyb3VnaCBpZiB0aGV5IGRvbid0IHdhbnRcbiAgICAgICAgLy8gYGV2ZW50dWFsbHlgLCBvciBpZiB3ZSd2ZSBhbHJlYWR5IGZ1bGZpbGxlZCB0aGUgcHJvbWlzZSAoc2VlIGJlbG93KS5cbiAgICAgICAgaWYgKCF1dGlscy5mbGFnKGFzc2VydGlvbiwgXCJldmVudHVhbGx5XCIpKSB7XG4gICAgICAgICAgICBhc3NlcnRlci5hcHBseShhc3NlcnRpb24sIGFyZ3MpO1xuICAgICAgICAgICAgcmV0dXJuIGFzc2VydGlvbjtcbiAgICAgICAgfVxuXG4gICAgICAgIGNvbnN0IGRlcml2ZWRQcm9taXNlID0gZ2V0QmFzZVByb21pc2UoYXNzZXJ0aW9uKS50aGVuKHZhbHVlID0+IHtcbiAgICAgICAgICAgIC8vIFNldCB1cCB0aGUgZW52aXJvbm1lbnQgZm9yIHRoZSBhc3NlcnRlciB0byBhY3R1YWxseSBydW46IGBfb2JqYCBzaG91bGQgYmUgdGhlIGZ1bGZpbGxtZW50IHZhbHVlLCBhbmRcbiAgICAgICAgICAgIC8vIG5vdyB0aGF0IHdlIGhhdmUgdGhlIHZhbHVlLCB3ZSdyZSBubyBsb25nZXIgaW4gXCJldmVudHVhbGx5XCIgbW9kZSwgc28gd2Ugd29uJ3QgcnVuIGFueSBvZiB0aGlzIGNvZGUsXG4gICAgICAgICAgICAvLyBqdXN0IHRoZSBiYXNlIENoYWkgY29kZSB0aGF0IHdlIGdldCB0byB2aWEgdGhlIHNob3J0LWNpcmN1aXQgYWJvdmUuXG4gICAgICAgICAgICBhc3NlcnRpb24uX29iaiA9IHZhbHVlO1xuICAgICAgICAgICAgdXRpbHMuZmxhZyhhc3NlcnRpb24sIFwiZXZlbnR1YWxseVwiLCBmYWxzZSk7XG5cbiAgICAgICAgICAgIHJldHVybiBhcmdzID8gbW9kdWxlLmV4cG9ydHMudHJhbnNmb3JtQXNzZXJ0ZXJBcmdzKGFyZ3MpIDogYXJncztcbiAgICAgICAgfSkudGhlbihuZXdBcmdzID0+IHtcbiAgICAgICAgICAgIGFzc2VydGVyLmFwcGx5KGFzc2VydGlvbiwgbmV3QXJncyk7XG5cbiAgICAgICAgICAgIC8vIEJlY2F1c2UgYXNzZXJ0ZXJzLCBmb3IgZXhhbXBsZSBgcHJvcGVydHlgLCBjYW4gY2hhbmdlIHRoZSB2YWx1ZSBvZiBgX29iamAgKGkuZS4gY2hhbmdlIHRoZSBcIm9iamVjdFwiXG4gICAgICAgICAgICAvLyBmbGFnKSwgd2UgbmVlZCB0byBjb21tdW5pY2F0ZSB0aGlzIHZhbHVlIGNoYW5nZSB0byBzdWJzZXF1ZW50IGNoYWluZWQgYXNzZXJ0ZXJzLiBTaW5jZSB3ZSBidWlsZCBhXG4gICAgICAgICAgICAvLyBwcm9taXNlIGNoYWluIHBhcmFsbGVsaW5nIHRoZSBhc3NlcnRlciBjaGFpbiwgd2UgY2FuIHVzZSBpdCB0byBjb21tdW5pY2F0ZSBzdWNoIGNoYW5nZXMuXG4gICAgICAgICAgICByZXR1cm4gYXNzZXJ0aW9uLl9vYmo7XG4gICAgICAgIH0pO1xuXG4gICAgICAgIG1vZHVsZS5leHBvcnRzLnRyYW5zZmVyUHJvbWlzZW5lc3MoYXNzZXJ0aW9uLCBkZXJpdmVkUHJvbWlzZSk7XG4gICAgICAgIHJldHVybiBhc3NlcnRpb247XG4gICAgfVxuXG4gICAgLy8gIyMjIE5vdyB1c2UgdGhlIGBBc3NlcnRpb25gIGZyYW1ld29yayB0byBidWlsZCBhbiBgYXNzZXJ0YCBpbnRlcmZhY2UuXG4gICAgY29uc3Qgb3JpZ2luYWxBc3NlcnRNZXRob2RzID0gT2JqZWN0LmdldE93blByb3BlcnR5TmFtZXMoYXNzZXJ0KS5maWx0ZXIocHJvcE5hbWUgPT4ge1xuICAgICAgICByZXR1cm4gdHlwZW9mIGFzc2VydFtwcm9wTmFtZV0gPT09IFwiZnVuY3Rpb25cIjtcbiAgICB9KTtcblxuICAgIGFzc2VydC5pc0Z1bGZpbGxlZCA9IChwcm9taXNlLCBtZXNzYWdlKSA9PiAobmV3IEFzc2VydGlvbihwcm9taXNlLCBtZXNzYWdlKSkudG8uYmUuZnVsZmlsbGVkO1xuXG4gICAgYXNzZXJ0LmlzUmVqZWN0ZWQgPSAocHJvbWlzZSwgZXJyb3JMaWtlLCBlcnJNc2dNYXRjaGVyLCBtZXNzYWdlKSA9PiB7XG4gICAgICAgIGNvbnN0IGFzc2VydGlvbiA9IG5ldyBBc3NlcnRpb24ocHJvbWlzZSwgbWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBhc3NlcnRpb24udG8uYmUucmVqZWN0ZWRXaXRoKGVycm9yTGlrZSwgZXJyTXNnTWF0Y2hlciwgbWVzc2FnZSk7XG4gICAgfTtcblxuICAgIGFzc2VydC5iZWNvbWVzID0gKHByb21pc2UsIHZhbHVlLCBtZXNzYWdlKSA9PiBhc3NlcnQuZXZlbnR1YWxseS5kZWVwRXF1YWwocHJvbWlzZSwgdmFsdWUsIG1lc3NhZ2UpO1xuXG4gICAgYXNzZXJ0LmRvZXNOb3RCZWNvbWUgPSAocHJvbWlzZSwgdmFsdWUsIG1lc3NhZ2UpID0+IGFzc2VydC5ldmVudHVhbGx5Lm5vdERlZXBFcXVhbChwcm9taXNlLCB2YWx1ZSwgbWVzc2FnZSk7XG5cbiAgICBhc3NlcnQuZXZlbnR1YWxseSA9IHt9O1xuICAgIG9yaWdpbmFsQXNzZXJ0TWV0aG9kcy5mb3JFYWNoKGFzc2VydE1ldGhvZE5hbWUgPT4ge1xuICAgICAgICBhc3NlcnQuZXZlbnR1YWxseVthc3NlcnRNZXRob2ROYW1lXSA9IGZ1bmN0aW9uIChwcm9taXNlKSB7XG4gICAgICAgICAgICBjb25zdCBvdGhlckFyZ3MgPSBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpO1xuXG4gICAgICAgICAgICBsZXQgY3VzdG9tUmVqZWN0aW9uSGFuZGxlcjtcbiAgICAgICAgICAgIGNvbnN0IG1lc3NhZ2UgPSBhcmd1bWVudHNbYXNzZXJ0W2Fzc2VydE1ldGhvZE5hbWVdLmxlbmd0aCAtIDFdO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiBtZXNzYWdlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICAgICAgICAgICAgY3VzdG9tUmVqZWN0aW9uSGFuZGxlciA9IHJlYXNvbiA9PiB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBjaGFpLkFzc2VydGlvbkVycm9yKGAke21lc3NhZ2V9XFxuXFxuT3JpZ2luYWwgcmVhc29uOiAke3V0aWxzLmluc3BlY3QocmVhc29uKX1gKTtcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBjb25zdCByZXR1cm5lZFByb21pc2UgPSBwcm9taXNlLnRoZW4oXG4gICAgICAgICAgICAgICAgZnVsZmlsbG1lbnRWYWx1ZSA9PiBhc3NlcnRbYXNzZXJ0TWV0aG9kTmFtZV0uYXBwbHkoYXNzZXJ0LCBbZnVsZmlsbG1lbnRWYWx1ZV0uY29uY2F0KG90aGVyQXJncykpLFxuICAgICAgICAgICAgICAgIGN1c3RvbVJlamVjdGlvbkhhbmRsZXJcbiAgICAgICAgICAgICk7XG5cbiAgICAgICAgICAgIHJldHVybmVkUHJvbWlzZS5ub3RpZnkgPSBkb25lID0+IHtcbiAgICAgICAgICAgICAgICBkb05vdGlmeShyZXR1cm5lZFByb21pc2UsIGRvbmUpO1xuICAgICAgICAgICAgfTtcblxuICAgICAgICAgICAgcmV0dXJuIHJldHVybmVkUHJvbWlzZTtcbiAgICAgICAgfTtcbiAgICB9KTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnRyYW5zZmVyUHJvbWlzZW5lc3MgPSAoYXNzZXJ0aW9uLCBwcm9taXNlKSA9PiB7XG4gICAgYXNzZXJ0aW9uLnRoZW4gPSBwcm9taXNlLnRoZW4uYmluZChwcm9taXNlKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzLnRyYW5zZm9ybUFzc2VydGVyQXJncyA9IHZhbHVlcyA9PiB2YWx1ZXM7XG4iXX0=
