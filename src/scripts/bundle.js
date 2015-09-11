(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

module.exports.Dispatcher = require('./lib/Dispatcher');

},{"./lib/Dispatcher":2}],2:[function(require,module,exports){
(function (process){
/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule Dispatcher
 * 
 * @preventMunge
 */

'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var invariant = require('fbjs/lib/invariant');

var _prefix = 'ID_';

/**
 * Dispatcher is used to broadcast payloads to registered callbacks. This is
 * different from generic pub-sub systems in two ways:
 *
 *   1) Callbacks are not subscribed to particular events. Every payload is
 *      dispatched to every registered callback.
 *   2) Callbacks can be deferred in whole or part until other callbacks have
 *      been executed.
 *
 * For example, consider this hypothetical flight destination form, which
 * selects a default city when a country is selected:
 *
 *   var flightDispatcher = new Dispatcher();
 *
 *   // Keeps track of which country is selected
 *   var CountryStore = {country: null};
 *
 *   // Keeps track of which city is selected
 *   var CityStore = {city: null};
 *
 *   // Keeps track of the base flight price of the selected city
 *   var FlightPriceStore = {price: null}
 *
 * When a user changes the selected city, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'city-update',
 *     selectedCity: 'paris'
 *   });
 *
 * This payload is digested by `CityStore`:
 *
 *   flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'city-update') {
 *       CityStore.city = payload.selectedCity;
 *     }
 *   });
 *
 * When the user selects a country, we dispatch the payload:
 *
 *   flightDispatcher.dispatch({
 *     actionType: 'country-update',
 *     selectedCountry: 'australia'
 *   });
 *
 * This payload is digested by both stores:
 *
 *   CountryStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       CountryStore.country = payload.selectedCountry;
 *     }
 *   });
 *
 * When the callback to update `CountryStore` is registered, we save a reference
 * to the returned token. Using this token with `waitFor()`, we can guarantee
 * that `CountryStore` is updated before the callback that updates `CityStore`
 * needs to query its data.
 *
 *   CityStore.dispatchToken = flightDispatcher.register(function(payload) {
 *     if (payload.actionType === 'country-update') {
 *       // `CountryStore.country` may not be updated.
 *       flightDispatcher.waitFor([CountryStore.dispatchToken]);
 *       // `CountryStore.country` is now guaranteed to be updated.
 *
 *       // Select the default city for the new country
 *       CityStore.city = getDefaultCityForCountry(CountryStore.country);
 *     }
 *   });
 *
 * The usage of `waitFor()` can be chained, for example:
 *
 *   FlightPriceStore.dispatchToken =
 *     flightDispatcher.register(function(payload) {
 *       switch (payload.actionType) {
 *         case 'country-update':
 *         case 'city-update':
 *           flightDispatcher.waitFor([CityStore.dispatchToken]);
 *           FlightPriceStore.price =
 *             getFlightPriceStore(CountryStore.country, CityStore.city);
 *           break;
 *     }
 *   });
 *
 * The `country-update` payload will be guaranteed to invoke the stores'
 * registered callbacks in order: `CountryStore`, `CityStore`, then
 * `FlightPriceStore`.
 */

var Dispatcher = (function () {
  function Dispatcher() {
    _classCallCheck(this, Dispatcher);

    this._callbacks = {};
    this._isDispatching = false;
    this._isHandled = {};
    this._isPending = {};
    this._lastID = 1;
  }

  /**
   * Registers a callback to be invoked with every dispatched payload. Returns
   * a token that can be used with `waitFor()`.
   */

  Dispatcher.prototype.register = function register(callback) {
    var id = _prefix + this._lastID++;
    this._callbacks[id] = callback;
    return id;
  };

  /**
   * Removes a callback based on its token.
   */

  Dispatcher.prototype.unregister = function unregister(id) {
    !this._callbacks[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.unregister(...): `%s` does not map to a registered callback.', id) : invariant(false) : undefined;
    delete this._callbacks[id];
  };

  /**
   * Waits for the callbacks specified to be invoked before continuing execution
   * of the current callback. This method should only be used by a callback in
   * response to a dispatched payload.
   */

  Dispatcher.prototype.waitFor = function waitFor(ids) {
    !this._isDispatching ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): Must be invoked while dispatching.') : invariant(false) : undefined;
    for (var ii = 0; ii < ids.length; ii++) {
      var id = ids[ii];
      if (this._isPending[id]) {
        !this._isHandled[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): Circular dependency detected while ' + 'waiting for `%s`.', id) : invariant(false) : undefined;
        continue;
      }
      !this._callbacks[id] ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatcher.waitFor(...): `%s` does not map to a registered callback.', id) : invariant(false) : undefined;
      this._invokeCallback(id);
    }
  };

  /**
   * Dispatches a payload to all registered callbacks.
   */

  Dispatcher.prototype.dispatch = function dispatch(payload) {
    !!this._isDispatching ? process.env.NODE_ENV !== 'production' ? invariant(false, 'Dispatch.dispatch(...): Cannot dispatch in the middle of a dispatch.') : invariant(false) : undefined;
    this._startDispatching(payload);
    try {
      for (var id in this._callbacks) {
        if (this._isPending[id]) {
          continue;
        }
        this._invokeCallback(id);
      }
    } finally {
      this._stopDispatching();
    }
  };

  /**
   * Is this Dispatcher currently dispatching.
   */

  Dispatcher.prototype.isDispatching = function isDispatching() {
    return this._isDispatching;
  };

  /**
   * Call the callback stored with the given id. Also do some internal
   * bookkeeping.
   *
   * @internal
   */

  Dispatcher.prototype._invokeCallback = function _invokeCallback(id) {
    this._isPending[id] = true;
    this._callbacks[id](this._pendingPayload);
    this._isHandled[id] = true;
  };

  /**
   * Set up bookkeeping needed when dispatching.
   *
   * @internal
   */

  Dispatcher.prototype._startDispatching = function _startDispatching(payload) {
    for (var id in this._callbacks) {
      this._isPending[id] = false;
      this._isHandled[id] = false;
    }
    this._pendingPayload = payload;
    this._isDispatching = true;
  };

  /**
   * Clear bookkeeping used for dispatching.
   *
   * @internal
   */

  Dispatcher.prototype._stopDispatching = function _stopDispatching() {
    delete this._pendingPayload;
    this._isDispatching = false;
  };

  return Dispatcher;
})();

module.exports = Dispatcher;
}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9mbHV4L2xpYi9EaXNwYXRjaGVyLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgRGlzcGF0Y2hlclxuICogXG4gKiBAcHJldmVudE11bmdlXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJ2ZianMvbGliL2ludmFyaWFudCcpO1xuXG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICBDb3VudHJ5U3RvcmUuY291bnRyeSA9IHBheWxvYWQuc2VsZWN0ZWRDb3VudHJ5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgY2FsbGJhY2sgdG8gdXBkYXRlIGBDb3VudHJ5U3RvcmVgIGlzIHJlZ2lzdGVyZWQsIHdlIHNhdmUgYSByZWZlcmVuY2VcbiAqIHRvIHRoZSByZXR1cm5lZCB0b2tlbi4gVXNpbmcgdGhpcyB0b2tlbiB3aXRoIGB3YWl0Rm9yKClgLCB3ZSBjYW4gZ3VhcmFudGVlXG4gKiB0aGF0IGBDb3VudHJ5U3RvcmVgIGlzIHVwZGF0ZWQgYmVmb3JlIHRoZSBjYWxsYmFjayB0aGF0IHVwZGF0ZXMgYENpdHlTdG9yZWBcbiAqIG5lZWRzIHRvIHF1ZXJ5IGl0cyBkYXRhLlxuICpcbiAqICAgQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIG1heSBub3QgYmUgdXBkYXRlZC5cbiAqICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgaXMgbm93IGd1YXJhbnRlZWQgdG8gYmUgdXBkYXRlZC5cbiAqXG4gKiAgICAgICAvLyBTZWxlY3QgdGhlIGRlZmF1bHQgY2l0eSBmb3IgdGhlIG5ldyBjb3VudHJ5XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IGdldERlZmF1bHRDaXR5Rm9yQ291bnRyeShDb3VudHJ5U3RvcmUuY291bnRyeSk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgdXNhZ2Ugb2YgYHdhaXRGb3IoKWAgY2FuIGJlIGNoYWluZWQsIGZvciBleGFtcGxlOlxuICpcbiAqICAgRmxpZ2h0UHJpY2VTdG9yZS5kaXNwYXRjaFRva2VuID1cbiAqICAgICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgY2FzZSAnY2l0eS11cGRhdGUnOlxuICogICAgICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIGdldEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSBgY291bnRyeS11cGRhdGVgIHBheWxvYWQgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGludm9rZSB0aGUgc3RvcmVzJ1xuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MgaW4gb3JkZXI6IGBDb3VudHJ5U3RvcmVgLCBgQ2l0eVN0b3JlYCwgdGhlblxuICogYEZsaWdodFByaWNlU3RvcmVgLlxuICovXG5cbnZhciBEaXNwYXRjaGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGlzcGF0Y2hlcik7XG5cbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy5faXNIYW5kbGVkID0ge307XG4gICAgdGhpcy5faXNQZW5kaW5nID0ge307XG4gICAgdGhpcy5fbGFzdElEID0gMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggZXZlcnkgZGlzcGF0Y2hlZCBwYXlsb2FkLiBSZXR1cm5zXG4gICAqIGEgdG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGB3YWl0Rm9yKClgLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKGNhbGxiYWNrKSB7XG4gICAgdmFyIGlkID0gX3ByZWZpeCArIHRoaXMuX2xhc3RJRCsrO1xuICAgIHRoaXMuX2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjYWxsYmFjayBiYXNlZCBvbiBpdHMgdG9rZW4uXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnVucmVnaXN0ZXIgPSBmdW5jdGlvbiB1bnJlZ2lzdGVyKGlkKSB7XG4gICAgIXRoaXMuX2NhbGxiYWNrc1tpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci51bnJlZ2lzdGVyKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLCBpZCkgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUud2FpdEZvciA9IGZ1bmN0aW9uIHdhaXRGb3IoaWRzKSB7XG4gICAgIXRoaXMuX2lzRGlzcGF0Y2hpbmcgPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IE11c3QgYmUgaW52b2tlZCB3aGlsZSBkaXNwYXRjaGluZy4nKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy5faXNQZW5kaW5nW2lkXSkge1xuICAgICAgICAhdGhpcy5faXNIYW5kbGVkW2lkXSA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogQ2lyY3VsYXIgZGVwZW5kZW5jeSBkZXRlY3RlZCB3aGlsZSAnICsgJ3dhaXRpbmcgZm9yIGAlc2AuJywgaWQpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAhdGhpcy5fY2FsbGJhY2tzW2lkXSA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsIGlkKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgcGF5bG9hZCB0byBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24gZGlzcGF0Y2gocGF5bG9hZCkge1xuICAgICEhdGhpcy5faXNEaXNwYXRjaGluZyA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaC5kaXNwYXRjaCguLi4pOiBDYW5ub3QgZGlzcGF0Y2ggaW4gdGhlIG1pZGRsZSBvZiBhIGRpc3BhdGNoLicpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuX3N0b3BEaXNwYXRjaGluZygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXMgdGhpcyBEaXNwYXRjaGVyIGN1cnJlbnRseSBkaXNwYXRjaGluZy5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZyA9IGZ1bmN0aW9uIGlzRGlzcGF0Y2hpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzcGF0Y2hpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGNhbGxiYWNrIHN0b3JlZCB3aXRoIHRoZSBnaXZlbiBpZC4gQWxzbyBkbyBzb21lIGludGVybmFsXG4gICAqIGJvb2trZWVwaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuX2ludm9rZUNhbGxiYWNrID0gZnVuY3Rpb24gX2ludm9rZUNhbGxiYWNrKGlkKSB7XG4gICAgdGhpcy5faXNQZW5kaW5nW2lkXSA9IHRydWU7XG4gICAgdGhpcy5fY2FsbGJhY2tzW2lkXSh0aGlzLl9wZW5kaW5nUGF5bG9hZCk7XG4gICAgdGhpcy5faXNIYW5kbGVkW2lkXSA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB1cCBib29ra2VlcGluZyBuZWVkZWQgd2hlbiBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9zdGFydERpc3BhdGNoaW5nID0gZnVuY3Rpb24gX3N0YXJ0RGlzcGF0Y2hpbmcocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuX2NhbGxiYWNrcykge1xuICAgICAgdGhpcy5faXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNIYW5kbGVkW2lkXSA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLl9wZW5kaW5nUGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgdGhpcy5faXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuX3N0b3BEaXNwYXRjaGluZyA9IGZ1bmN0aW9uIF9zdG9wRGlzcGF0Y2hpbmcoKSB7XG4gICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdQYXlsb2FkO1xuICAgIHRoaXMuX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuICByZXR1cm4gRGlzcGF0Y2hlcjtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcjsiXX0=
},{"_process":7,"fbjs/lib/invariant":3}],3:[function(require,module,exports){
(function (process){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

"use strict";

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function (condition, format, a, b, c, d, e, f) {
  if (process.env.NODE_ENV !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error('Minified exception occurred; use the non-minified dev environment ' + 'for the full error message and additional helpful warnings.');
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error('Invariant Violation: ' + format.replace(/%s/g, function () {
        return args[argIndex++];
      }));
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;
}).call(this,require('_process'))
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9mbHV4L25vZGVfbW9kdWxlcy9mYmpzL2xpYi9pbnZhcmlhbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbiAoY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICsgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICsgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDsiXX0=
},{"_process":7}],4:[function(require,module,exports){
/**
 * Copyright 2013-2014 Facebook, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */

"use strict";

/**
 * Constructs an enumeration with keys equal to their value.
 *
 * For example:
 *
 *   var COLORS = keyMirror({blue: null, red: null});
 *   var myColor = COLORS.blue;
 *   var isColorValid = !!COLORS[myColor];
 *
 * The last line could not be performed if the values of the generated enum were
 * not equal to their keys.
 *
 *   Input:  {key1: val1, key2: val2}
 *   Output: {key1: key1, key2: key2}
 *
 * @param {object} obj
 * @return {object}
 */
var keyMirror = function(obj) {
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    ret[key] = key;
  }
  return ret;
};

module.exports = keyMirror;

},{}],5:[function(require,module,exports){
'use strict';

function ToObject(val) {
	if (val == null) {
		throw new TypeError('Object.assign cannot be called with null or undefined');
	}

	return Object(val);
}

module.exports = Object.assign || function (target, source) {
	var pendingException;
	var from;
	var keys;
	var to = ToObject(target);

	for (var s = 1; s < arguments.length; s++) {
		from = arguments[s];
		keys = Object.keys(Object(from));

		for (var i = 0; i < keys.length; i++) {
			try {
				to[keys[i]] = from[keys[i]];
			} catch (err) {
				if (pendingException === undefined) {
					pendingException = err;
				}
			}
		}
	}

	if (pendingException) {
		throw pendingException;
	}

	return to;
};

},{}],6:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],7:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};
var queue = [];
var draining = false;

function drainQueue() {
    if (draining) {
        return;
    }
    draining = true;
    var currentQueue;
    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        var i = -1;
        while (++i < len) {
            currentQueue[i]();
        }
        len = queue.length;
    }
    draining = false;
}
process.nextTick = function (fun) {
    queue.push(fun);
    if (!draining) {
        setTimeout(drainQueue, 0);
    }
};

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],8:[function(require,module,exports){
var Dispatcher = require('flux').Dispatcher;

module.exports = new Dispatcher();
},{"flux":1}],9:[function(require,module,exports){
var keyMirror = require('keymirror');

module.exports = {
    ActionTypes: keyMirror({
        LOGIN: null,
        MESSAGE_SEND: null,
        INDIVIDUAL_MESSAGE_SEND: null,
        SWITCH_THREAD: null,
        MESSAGE_BROADCAST: null
    }),
    Avatars: {
        1 : {
            'avatar_id': 1,
            'background_position': '-12px -2px'
        },
        2 : {
            'avatar_id': 2,
            'background_position': '-72px 0px'
        },
        3 : {
            'avatar_id': 3,
            'background_position': '-132px 0px'
        },
        4 : {
            'avatar_id': 4,
            'background_position': '-11px -62px'
        },
        5 : {
            'avatar_id': 5,
            'background_position': '-72px -61px'
        },
        6 : {
            'avatar_id': 6,
            'background_position': '-132px -61px'
        },
        7 : {
            'avatar_id': 7,
            'background_position': '-12px -124px'
        },
        8 : {
            'avatar_id': 8,
            'background_position': '-72px -122px'
        },
        9 : {
            'avatar_id': 9,
            'background_position': '-132px -123px'
        }
    },
    Avatars_small: {
        1 : {
            'avatar_id': 1,
            'background_position': '-6px 0px'
        },
        2 : {
            'avatar_id': 2,
            'background_position': '-42px 0px'
        },
        3 : {
            'avatar_id': 3,
            'background_position': '-79px 0px'
        },
        4 : {
            'avatar_id': 4,
            'background_position': '-6px -36px'
        },
        5 : {
            'avatar_id': 5,
            'background_position': '-42px -36px'
        },
        6 : {
            'avatar_id': 6,
            'background_position': '-79px -36px'
        },
        7 : {
            'avatar_id': 7,
            'background_position': '-6px -73px'
        },
        8 : {
            'avatar_id': 8,
            'background_position': '-42px -73px'
        },
        9 : {
            'avatar_id': 9,
            'background_position': '-79px -73px'
        }
    }
};

},{"keymirror":4}],10:[function(require,module,exports){
var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var dispatcher = require('./dispatcher');
var ActionTypes = require('./helperUtil').ActionTypes;
var current_user = {};
var users = {};
var currentThreadId = "0"; //default thread id
var user_messages = {};
var Store = assign({}, EventEmitter.prototype, {
    emitLogin: function(data) {
        current_user = data;
        this.emit(ActionTypes.LOGIN);
    },
    emitMessageSend: function(data){
        var threadId = data.type === "automate" ? "0" : currentThreadId;
        if(!user_messages[threadId]) user_messages[threadId] = [];
        user_messages[threadId].push(data);
        this.emit(ActionTypes.MESSAGE_SEND);
    },
    emitMessageBroadcast: function(data){
        var threadid = data.threadId;
        if(!user_messages[threadid]) user_messages[threadid] = [];
        user_messages[threadid].push(data);
        this.emit(ActionTypes.MESSAGE_BROADCAST, data);
    },
    addLoginListener: function(callback) {
        this.on(ActionTypes.LOGIN, callback);
    },
    removeLoginListener: function(callback) {
        this.removeListener(ActionTypes.LOGIN, callback);
    },
    addMessageListener: function(callback){
        this.on(ActionTypes.MESSAGE_SEND, callback);
    },
    removeMessageListener: function(callback){
        this.removeListener(ActionTypes.MESSAGE_SEND, callback);
    },
    addMessageBroadcastListener: function(callback){
        this.on(ActionTypes.MESSAGE_BROADCAST, callback);
    },
    removeMessageBroadcastListener: function(callback){
        this.removeListener(ActionTypes.MESSAGE_BROADCAST, callback);
    },
    addThreadListener: function(callback){
        this.on(ActionTypes.SWITCH_THREAD, callback);
    },
    removeThreadListener: function(callback){
        this.removeListener(ActionTypes.SWITCH_THREAD, callback);
    },
    getCurrentUser: function(){
        return current_user;
    },
    allMessage: function(){
        if(!user_messages[currentThreadId]) user_messages[currentThreadId] = [];
        return user_messages[currentThreadId];
    },
    addMessage: function(data){
        this.emitMessageSend(data);
    },
    getThreadId: function(){
        return currentThreadId;
    },
    switchChannel: function(data){
        currentThreadId = data.threadId;
        this.emit(ActionTypes.SWITCH_THREAD);
    },
    // remove messages when user log out
    removeMessages: function(removed_user_id){
        _.each(_.keys(user_messages), function(key){
            var split_ids = key.split('_');
            if(_.contains(split_ids, removed_user_id)){
                delete user_messages[key];
            }
        });
    }
});

Store.dispatchToken = dispatcher.register(function(data) {
    switch(data.actionTypes) {
        case ActionTypes.LOGIN:
            Store.emitLogin(data);
            break;
        case ActionTypes.MESSAGE_SEND:
            Store.emitMessageSend(data);
            break;
        case ActionTypes.MESSAGE_BROADCAST:
            Store.emitMessageBroadcast(data);
            break;
        case ActionTypes.SWITCH_THREAD:
            Store.switchChannel(data);
        default:
    }
});

module.exports = Store;
},{"./dispatcher":8,"./helperUtil":9,"events":6,"object-assign":5}],11:[function(require,module,exports){
var socket = io.connect();
var ENTER_KEY_CODE = 13;
var Store = require('./store');
var dispatcher = require('./dispatcher');
var helperUtil = require('./helperUtil');
var actionTypes = helperUtil.ActionTypes;
var avatars = helperUtil.Avatars;
var avatars_small = helperUtil.Avatars_small;
var AVATAR_SCROLL_LIMIT = 3;
var SCROLL_GAP_WIDTH = 171;
var UserList = React.createClass({displayName: "UserList",
	handleClick: function(event){
		var id = $(event.currentTarget).attr('data-id');
		this.props.notification[id] = false;
		_.each($(this.refs.userList.getDOMNode()).children(), function(child){
			var type = child.getAttribute('data-type');
			var is_click = child.getAttribute('data-id') === id;
			if(type === "home"){
				child.className = is_click ? "user-profile home active" : "user-profile home";
			}else if(type === "user"){
				child.className = is_click ? "user-profile active" : "user-profile";
			}
		});
		// I just use simple senderID_receiverID here as the key for the messages
		var threadId = id === "0" ? id : [id, Store.getCurrentUser().id].sort().join('_');
		dispatcher.dispatch({
			threadId: threadId,
			actionTypes : actionTypes.SWITCH_THREAD
		});
	},
	getName: function(user){
		return user.id === Store.getCurrentUser().id ? "Current User" : user.name;
	},
	getNotificationStyle: function(key){
		return this.props.notification[key] ? "inline-block" : "none";
	},
	render: function(){
		return(
			React.createElement("div", {className: 'users'}, 
				React.createElement("div", null, " Online Users "), 
				React.createElement("div", {className: 'home'}, React.createElement("i", null)), 
				React.createElement("div", {className: 'users-list', ref: 'userList'}, 
					React.createElement("div", {className: 'user-profile home active', "data-id": '0', "data-type": 'home', onClick: this.handleClick}, 
						React.createElement("i", {className: 'user-avatar home'}), 
						React.createElement("div", {className: 'user-name'}, " ", 'All Users', " "), 
						React.createElement("i", {className: "fa fa-commenting-o", style: {display: this.getNotificationStyle('0')}})
					), 
					this.props.users.map(function(user) {
						var style = { 'backgroundPosition': avatars_small[user.avatar].background_position };
						return (
							React.createElement("div", {className: 'user-profile', "data-type": 'user', "data-id": user.id, onClick: this.handleClick}, 
								React.createElement("div", {className: 'user-avatar', style: style}), 
								React.createElement("div", {className: 'user-name'}, " ",  this.getName(user), " "), 
								React.createElement("i", {className: "fa fa-commenting-o", style: {display: this.getNotificationStyle(user.id)}})
							));
					}.bind(this))
				)
			)
		)
	}
})
var Message = React.createClass({displayName: "Message",
	render: function(){
		// convert [:1] like string to emoji
		var convertMessage = function(message){
			var regex = /\[\:(.*?)\]/;
			var message = message;
			while(message.match(regex)){
				var emoji_id = message.match(regex)[1];
				var src = "..\/content\/emoji\/" + emoji_id + ".png";
				var emoji = "<img class=\'emoji-icon\' src=\"" + src + "\">";
				message = message.replace(regex, emoji);
			}
			return {__html: message};
		};
		if(this.props.type === "automate"){
			var output = (
				React.createElement("div", {className: "message automate"}, 
					React.createElement("div", {className: "automate-message"}, this.props.message)
				)
			)
		}else{
			var user = this.props.user;
			var style = { 'backgroundPosition': avatars_small[user.avatar].background_position };
			var output = (
				React.createElement("div", {className: "message"}, 
					React.createElement("div", {className: "user-avatar", style: style}), 
					React.createElement("div", {className: "user-name"}, " ",  user.name, " ", React.createElement("span", {className: 'time'}, "sent at ", this.props.time)), 
					(() => {
						if(this.props.type === 'image'){
							return (
								React.createElement("div", {className: "content"}, 
									React.createElement("img", {className: "sent-image", src: this.props.image})
								)
							)
						}else{
							return (
								React.createElement("div", {className: "content"}, 
									React.createElement("i", {className: "fa fa-play"}), 
									React.createElement("div", {className: "inline-message", dangerouslySetInnerHTML: convertMessage(this.props.message)})
								)
							)
						}
					})()
				)
			)
		}
		return output;

	}
});
var EmojiView = React.createClass({displayName: "EmojiView",
	render: function(){
		var style = this.props.isEmojiShow ? { display : "block"} : { display : "none"};
		return (
			React.createElement("div", {className: "emoji", style: style}, 
				
					_.range(2,34).map(function(row){
						return React.createElement("img", {src: '../content/emoji/' + row + '.png', "data-id": row, onClick: this.props.handleEmojiClick})
					}.bind(this))
					
			)
		);
	}
});
var MessageList = React.createClass({displayName: "MessageList",
	getInitialState: function(){
		return {
			message : "",
			isEmojiShow: false,
			image : ""
		}
	},
	componentDidMount: function() {
		React.findDOMNode(this.refs.textarea).focus();
	},
	componentDidUpdate: function(){
		this._scrollToBottom();
	},
	send: function(type){
		var data = {
			user : Store.getCurrentUser(),
			time : moment(new Date()).format('lll'),
			threadId: Store.getThreadId()
		};
		if(type === 'image'){
			var image = this.state.image;
			if(!_.isEmpty(image)){
				data.image = image;
				data.type = "image";
				this.setState({ image : "" });
			}
		}else if(type === 'text'){
			var message = this.state.message.trim();
			if(!_.isEmpty(message)){
				data.message = message;
				data.type = "text";
				this.setState({ message : "" });
			}
		}
		if(data.image || data.message){
			this.props.handleMessageSubmit(data);
			this._scrollToBottom();
		}
	},
	handleKeydown: function(event){
		if(event.keyCode === ENTER_KEY_CODE){
			this.send('text');
		}
	},
	_scrollToBottom: function(){
		var message_board = React.findDOMNode(this.refs.all_messages);
		$(message_board).stop().animate({
			scrollTop: message_board.scrollHeight
		}, 500);
	},
	handleChange: function(event){
		var value = event.target.value;
		if(value.indexOf("\n") > -1)  value = value.replace("\n","");
		this.setState({
			message : value
		});
	},
	handleEmojiClick: function(event){
		var emojiId = event.currentTarget.getAttribute('data-id');
		this.setState({
			message: this.state.message + "[:" + emojiId + "]",
			isEmojiShow: false
		});
		React.findDOMNode(this.refs.textarea).focus();
	},
	showHideEmoji: function(){
		var isShown = !this.state.isEmojiShow;
		this.setState({ isEmojiShow : isShown });
	},
	handleSubmit: function(e) {
		e.preventDefault();
	},
	handleFile: function(e) {
		var self = this;
		var reader = new FileReader();
		var file = e.target.files[0];

		reader.onload = function(upload) {
			self.setState({
				image: upload.target.result
			});
			self.send('image');
		}

		if(file) reader.readAsDataURL(file) ;
	},
	render: function(){
		var is_messages_empty = _.isEmpty(this.props.messages);
		var no_message_style = is_messages_empty ? { display : 'block'} : { display : 'none'};
		var message_style = is_messages_empty ? { display : 'none'} : { display : 'block'};
		var renderMessage = function(data){
			return React.createElement(Message, {user: data.user, message: data.message, image: data.image, time: data.time, type: data.type})
		}
		return (
			React.createElement("div", {className: "message-board"}, 
				React.createElement("div", null, " Conversation: "), 
				React.createElement("div", {className: 'messages'}, 
					React.createElement("div", {className: "no-message", style: no_message_style}, 
						"No new messages:)"
					), 
					React.createElement("div", {className: "has-message", style: message_style, ref: "all_messages"}, 
						 this.props.messages.map(renderMessage)
					)
				), 
				React.createElement("div", {className: "messages-composer"}, 
					React.createElement("textarea", {value: this.state.message, placeholder: "what do you want to say:)", onChange: this.handleChange, onKeyDown: this.handleKeydown, ref: "textarea"}), 
					React.createElement("div", {className: "btns"}, 
						React.createElement("div", {className: "enhance-btns"}, 
							React.createElement("i", {className: "fa fa-smile-o", onClick: this.showHideEmoji}), 
							React.createElement(EmojiView, {isEmojiShow: this.state.isEmojiShow, handleEmojiClick: this.handleEmojiClick}), 
							React.createElement("i", {className: "fa fa-picture-o"}, 
								React.createElement("form", {className: "imageUploader", onSubmit: this.handleSubmit, encType: "multipart/form-data"}, 
									React.createElement("input", {type: "file", onChange: this.handleFile})
								)
							)
						), 
						React.createElement("button", {className: "btn", type: "button", onClick: this.send}, 
							React.createElement("span", null, "Send")
						)
					)
				)
			)
		);
	}
});

var ChatWindow = React.createClass({displayName: "ChatWindow",
	getInitialState: function(){
		socket.on('broadcast:message', this.messageReceive);
		socket.on('user:join', this.userJoined);
		socket.on('user:disconnect', this.userLogout);
		return {users: [], messages:[], notification: {"0": false}};
	},
	componentDidMount: function(){
		$.get('/users', function(result) {
			var notification = {};
			var ids = _.map(result, function(res){ return res.id});
			_.each(ids, function(id){notification[id] = false});
			this.setState({users: result, notification: notification});
		}.bind(this));
		Store.addMessageListener(this._updateMessageView);
		Store.addThreadListener(this._updateMessageView);
		Store.addMessageBroadcastListener(this._onMessageChange);
	},
	componentWillUnmount: function(){
		Store.removeMessageListener(this._updateMessageView);
		Store.removeThreadListener(this._updateMessageView);
		Store.removeMessageBroadcastListener(this._onMessageChange);
	},
	messageReceive: function(data){
		data.actionTypes = actionTypes.MESSAGE_BROADCAST;
		dispatcher.dispatch(data);
	},
	userLogout: function(data){
		if(data){
			var logout_user_id = data.id;
			this.setState({
				users: _.reject(this.state.users, function(user){ return user.id === logout_user_id})
			});
			Store.removeMessages(logout_user_id);
			if(Store.getThreadId().indexOf(logout_user_id) > -1){
				dispatcher.dispatch({
					threadId: "0",
					actionTypes : actionTypes.SWITCH_THREAD
				});
			}
			dispatcher.dispatch({
				message : data.name +' has left the chatting room:(',
				type : 'automate',
				actionTypes : actionTypes.MESSAGE_SEND
			});
		}
	},
	userJoined: function(data){
		this.state.users.push(data);
		this.state.notification[data.id] = false;
		dispatcher.dispatch({
			message : data.name +' just joined, say hello!',
			type : 'automate',
			actionTypes : actionTypes.MESSAGE_SEND
		});
	},
	handleMessageSubmit : function(data){
		data.actionTypes = actionTypes.MESSAGE_SEND;
		dispatcher.dispatch(data);
		socket.emit('send:message', data);
	},
	render : function(){
		return (
			React.createElement("div", {id: 'chat-window'}, 
				React.createElement(UserList, {users: this.state.users, notification: this.state.notification}), 
				React.createElement("div", {className: 'message-container'}, 
					React.createElement(MessageList, {messages: this.state.messages, handleMessageSubmit: this.handleMessageSubmit})
				), 
				React.createElement(Contact, null)
			)
		);
	},
	_updateMessageView: function(){
		this.setState({messages: Store.allMessage()});
	},
	// show a notification when receiving messages if current thread is not the target thread
	_onMessageChange: function(data){
		var threadId = data.threadId;
		var splits = threadId.split("_");
		var current_user_id = Store.getCurrentUser().id.toString();
		if(threadId !== Store.getThreadId() && (_.contains(splits, current_user_id) || threadId === '0')){
			var id = null;
			if(threadId === "0"){
				id = threadId;
			}else{
				var without_current_user = _.without(splits, current_user_id);
				id = without_current_user[0];
			}
			this.state.notification[id] = true;
		}
		this._updateMessageView();
	}
});
var LoginForm = React.createClass({displayName: "LoginForm",
	avatar_index : 1,
	getInitialState: function(){
		return {
			btnDisplay: 'none',
			name : "",
			isNextStep : false
		}
  	},
	componentDidMount: function() {
		 React.findDOMNode(this.refs.login_input).focus();
 	},
	handleKeydown: function(event) {
		if(event.keyCode === ENTER_KEY_CODE){
			this.setState({isNextStep: true});
		}
  	},
	handleClick: function(){
		event.preventDefault();
		var self = this;
		var name = this.state.name.trim();
		var avatar = this.state.avatar;
		if (name) {
			var data = {name: name, avatar: avatar};
			socket.emit('login', data, function(res){
				if(!res){
					alert('Your name has been used by others, please use another name.');
					self.setState({isNextStep: false, btnDisplay: "none"});
				}else{
					$.ajax({
						type : "post",
						url: "/login",
						dataType: 'json',
						contentType: "application/json",
						data : JSON.stringify(data),
						success: function(user){
							user.actionTypes = actionTypes.LOGIN;
							dispatcher.dispatch(user);
							React.render(React.createElement(ChatWindow, null), $('body')[0]);
						}
					})
				}
			});
		}
	},
	handleChange: function(event){
		var text = event.target.value;
		this.setState({
			name : text
		});
	},
	avatarNavLeft: function(){
		if(this.avatar_index < AVATAR_SCROLL_LIMIT){
			$(React.findDOMNode(this.refs.avatarNav)).animate({'right':'+=' + SCROLL_GAP_WIDTH + 'px'});
			this.avatar_index++;
		}
	},
	avatarNavRight: function(){
		if(this.avatar_index > 1){
			$(React.findDOMNode(this.refs.avatarNav)).animate({'right':'-=' + SCROLL_GAP_WIDTH + 'px'});
			this.avatar_index--;
		}
	},
	// maybe not a react way, will find a good way to do this
	selectAvatar: function(event){
		var id = $(event.currentTarget).attr('data-id');
		_.each($(this.refs.avatarNav.getDOMNode()).children(), function(child){
			child.className = child.getAttribute('data-id') === id ? "avatar active" : "avatar";
		});
		this.setState({
			btnDisplay: 'block',
			avatar: id
		});
	},
  	render : function(){
	  	var style = this.props.isLogin ? { display: 'inline-block'} : { display: 'none'};
	  	var cx = React.addons.classSet;
	  	var introClasses = cx({
		  'introForm': true,
		  'fade': this.state.isNextStep
	  	});
	  	var avatarClasses = cx({
		  'avatarForm' : true,
		  'active': this.state.isNextStep
	  	});
		return (
			React.createElement("div", {id: 'login-window', style: style}, 
				React.createElement("div", {className: introClasses}, 
					React.createElement("div", {className: 'greeting'}, 
						React.createElement("i", {className: "fa fa-commenting-o"}), 
						React.createElement("div", {className: "inline"}, 'Hi, what’s your name?')
					), 
					React.createElement("div", {className: 'input'}, 
						React.createElement("i", {className: "fa fa-commenting-o"}), 
						React.createElement("div", {className: 'input'}, 
							React.createElement("input", {className: "inline", type: "text", value: this.state.name, ref: "login_input", disabled: this.state.isNextStep, onChange: this.handleChange, onKeyDown: this.handleKeydown})
						)
					)
				), 
				React.createElement("div", {className: avatarClasses, ref: "avatar"}, 
					React.createElement("div", null, 
						React.createElement("i", {className: "fa fa-commenting-o"}), 
						React.createElement("div", {className: "inline"}, 'Pick your favorite avatar.')
					), 
					React.createElement("div", {className: "avatar-selector"}, 
						React.createElement("i", {className: "nav fa fa-angle-left fa-lg", onClick: this.avatarNavLeft}), 
						React.createElement("div", {className: 'avatar-container-outer'}, 
							React.createElement("div", {className: 'avatar-container-inner', ref: "avatarNav"}, 
								_.values(avatars).map(function(avatar) {
									var style = {
										'backgroundPosition': avatar.background_position
									}
									return React.createElement("div", {key: avatar.avatar_id, "data-id": avatar.avatar_id, className: 'avatar', onClick: this.selectAvatar, style: style});
								}.bind(this))
							)
						), 
						React.createElement("i", {className: "nav fa fa-angle-right fa-lg", onClick: this.avatarNavRight})
					)
				), 
				React.createElement("button", {className: 'btn', type: "button", style: {display: this.state.btnDisplay}, onClick: this.handleClick}, 
					React.createElement("span", null, "Start chatting!")
				)
			)
			);
  	}
});
var Contact = React.createClass({displayName: "Contact",
	render: function(){
		return (
			React.createElement("div", {className: "contact"}, 
				React.createElement("i", {className: "fa fa-copyright"}, " "), 
				React.createElement("span", null, 
					"Made by ", React.createElement("a", {href: "https://github.com/jamesman11"}, "James Man")
				)
			)
		)
	}
})
var ChatApp = React.createClass({displayName: "ChatApp",
	getInitialState: function() {
    	return {isLogin: true};
  	},
	componentDidMount: function() {
		Store.addLoginListener(this._onLogin);
	},

	componentWillUnmount: function() {
		Store.removeLoginListener(this._onLogin);
	},
	render : function(){
		return (
			React.createElement("div", {className: 'main'}, 
				React.createElement(LoginForm, {isLogin: this.state.isLogin}), 
				React.createElement(Contact, null)
			)
		);
	},
	_onLogin: function() {
		this.setState({isLogin: false});
	}
})
React.render(React.createElement(ChatApp, null), $('body')[0]);

},{"./dispatcher":8,"./helperUtil":9,"./store":10}]},{},[11])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmx1eC9saWIvRGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L25vZGVfbW9kdWxlcy9mYmpzL2xpYi9pbnZhcmlhbnQuanMiLCJub2RlX21vZHVsZXMva2V5bWlycm9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9zY3JpcHRzL2Rpc3BhdGNoZXIuanMiLCJzcmMvc2NyaXB0cy9oZWxwZXJVdGlsLmpzIiwic3JjL3NjcmlwdHMvc3RvcmUuanMiLCJzcmMvc2NyaXB0cy93ZWNoYXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMuRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vbGliL0Rpc3BhdGNoZXInKTtcbiIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAoYykgMjAxNC0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIERpc3BhdGNoZXJcbiAqIFxuICogQHByZXZlbnRNdW5nZVxuICovXG5cbid1c2Ugc3RyaWN0JztcblxuZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcblxuZnVuY3Rpb24gX2NsYXNzQ2FsbENoZWNrKGluc3RhbmNlLCBDb25zdHJ1Y3RvcikgeyBpZiAoIShpbnN0YW5jZSBpbnN0YW5jZW9mIENvbnN0cnVjdG9yKSkgeyB0aHJvdyBuZXcgVHlwZUVycm9yKCdDYW5ub3QgY2FsbCBhIGNsYXNzIGFzIGEgZnVuY3Rpb24nKTsgfSB9XG5cbnZhciBpbnZhcmlhbnQgPSByZXF1aXJlKCdmYmpzL2xpYi9pbnZhcmlhbnQnKTtcblxudmFyIF9wcmVmaXggPSAnSURfJztcblxuLyoqXG4gKiBEaXNwYXRjaGVyIGlzIHVzZWQgdG8gYnJvYWRjYXN0IHBheWxvYWRzIHRvIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLiBUaGlzIGlzXG4gKiBkaWZmZXJlbnQgZnJvbSBnZW5lcmljIHB1Yi1zdWIgc3lzdGVtcyBpbiB0d28gd2F5czpcbiAqXG4gKiAgIDEpIENhbGxiYWNrcyBhcmUgbm90IHN1YnNjcmliZWQgdG8gcGFydGljdWxhciBldmVudHMuIEV2ZXJ5IHBheWxvYWQgaXNcbiAqICAgICAgZGlzcGF0Y2hlZCB0byBldmVyeSByZWdpc3RlcmVkIGNhbGxiYWNrLlxuICogICAyKSBDYWxsYmFja3MgY2FuIGJlIGRlZmVycmVkIGluIHdob2xlIG9yIHBhcnQgdW50aWwgb3RoZXIgY2FsbGJhY2tzIGhhdmVcbiAqICAgICAgYmVlbiBleGVjdXRlZC5cbiAqXG4gKiBGb3IgZXhhbXBsZSwgY29uc2lkZXIgdGhpcyBoeXBvdGhldGljYWwgZmxpZ2h0IGRlc3RpbmF0aW9uIGZvcm0sIHdoaWNoXG4gKiBzZWxlY3RzIGEgZGVmYXVsdCBjaXR5IHdoZW4gYSBjb3VudHJ5IGlzIHNlbGVjdGVkOlxuICpcbiAqICAgdmFyIGZsaWdodERpc3BhdGNoZXIgPSBuZXcgRGlzcGF0Y2hlcigpO1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY291bnRyeSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ291bnRyeVN0b3JlID0ge2NvdW50cnk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2Ygd2hpY2ggY2l0eSBpcyBzZWxlY3RlZFxuICogICB2YXIgQ2l0eVN0b3JlID0ge2NpdHk6IG51bGx9O1xuICpcbiAqICAgLy8gS2VlcHMgdHJhY2sgb2YgdGhlIGJhc2UgZmxpZ2h0IHByaWNlIG9mIHRoZSBzZWxlY3RlZCBjaXR5XG4gKiAgIHZhciBGbGlnaHRQcmljZVN0b3JlID0ge3ByaWNlOiBudWxsfVxuICpcbiAqIFdoZW4gYSB1c2VyIGNoYW5nZXMgdGhlIHNlbGVjdGVkIGNpdHksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NpdHktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENpdHk6ICdwYXJpcydcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGBDaXR5U3RvcmVgOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NpdHktdXBkYXRlJykge1xuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBwYXlsb2FkLnNlbGVjdGVkQ2l0eTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIHVzZXIgc2VsZWN0cyBhIGNvdW50cnksIHdlIGRpc3BhdGNoIHRoZSBwYXlsb2FkOlxuICpcbiAqICAgZmxpZ2h0RGlzcGF0Y2hlci5kaXNwYXRjaCh7XG4gKiAgICAgYWN0aW9uVHlwZTogJ2NvdW50cnktdXBkYXRlJyxcbiAqICAgICBzZWxlY3RlZENvdW50cnk6ICdhdXN0cmFsaWEnXG4gKiAgIH0pO1xuICpcbiAqIFRoaXMgcGF5bG9hZCBpcyBkaWdlc3RlZCBieSBib3RoIHN0b3JlczpcbiAqXG4gKiAgIENvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgQ291bnRyeVN0b3JlLmNvdW50cnkgPSBwYXlsb2FkLnNlbGVjdGVkQ291bnRyeTtcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFdoZW4gdGhlIGNhbGxiYWNrIHRvIHVwZGF0ZSBgQ291bnRyeVN0b3JlYCBpcyByZWdpc3RlcmVkLCB3ZSBzYXZlIGEgcmVmZXJlbmNlXG4gKiB0byB0aGUgcmV0dXJuZWQgdG9rZW4uIFVzaW5nIHRoaXMgdG9rZW4gd2l0aCBgd2FpdEZvcigpYCwgd2UgY2FuIGd1YXJhbnRlZVxuICogdGhhdCBgQ291bnRyeVN0b3JlYCBpcyB1cGRhdGVkIGJlZm9yZSB0aGUgY2FsbGJhY2sgdGhhdCB1cGRhdGVzIGBDaXR5U3RvcmVgXG4gKiBuZWVkcyB0byBxdWVyeSBpdHMgZGF0YS5cbiAqXG4gKiAgIENpdHlTdG9yZS5kaXNwYXRjaFRva2VuID0gZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgaWYgKHBheWxvYWQuYWN0aW9uVHlwZSA9PT0gJ2NvdW50cnktdXBkYXRlJykge1xuICogICAgICAgLy8gYENvdW50cnlTdG9yZS5jb3VudHJ5YCBtYXkgbm90IGJlIHVwZGF0ZWQuXG4gKiAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NvdW50cnlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIGlzIG5vdyBndWFyYW50ZWVkIHRvIGJlIHVwZGF0ZWQuXG4gKlxuICogICAgICAgLy8gU2VsZWN0IHRoZSBkZWZhdWx0IGNpdHkgZm9yIHRoZSBuZXcgY291bnRyeVxuICogICAgICAgQ2l0eVN0b3JlLmNpdHkgPSBnZXREZWZhdWx0Q2l0eUZvckNvdW50cnkoQ291bnRyeVN0b3JlLmNvdW50cnkpO1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogVGhlIHVzYWdlIG9mIGB3YWl0Rm9yKClgIGNhbiBiZSBjaGFpbmVkLCBmb3IgZXhhbXBsZTpcbiAqXG4gKiAgIEZsaWdodFByaWNlU3RvcmUuZGlzcGF0Y2hUb2tlbiA9XG4gKiAgICAgZmxpZ2h0RGlzcGF0Y2hlci5yZWdpc3RlcihmdW5jdGlvbihwYXlsb2FkKSB7XG4gKiAgICAgICBzd2l0Y2ggKHBheWxvYWQuYWN0aW9uVHlwZSkge1xuICogICAgICAgICBjYXNlICdjb3VudHJ5LXVwZGF0ZSc6XG4gKiAgICAgICAgIGNhc2UgJ2NpdHktdXBkYXRlJzpcbiAqICAgICAgICAgICBmbGlnaHREaXNwYXRjaGVyLndhaXRGb3IoW0NpdHlTdG9yZS5kaXNwYXRjaFRva2VuXSk7XG4gKiAgICAgICAgICAgRmxpZ2h0UHJpY2VTdG9yZS5wcmljZSA9XG4gKiAgICAgICAgICAgICBnZXRGbGlnaHRQcmljZVN0b3JlKENvdW50cnlTdG9yZS5jb3VudHJ5LCBDaXR5U3RvcmUuY2l0eSk7XG4gKiAgICAgICAgICAgYnJlYWs7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgYGNvdW50cnktdXBkYXRlYCBwYXlsb2FkIHdpbGwgYmUgZ3VhcmFudGVlZCB0byBpbnZva2UgdGhlIHN0b3JlcydcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzIGluIG9yZGVyOiBgQ291bnRyeVN0b3JlYCwgYENpdHlTdG9yZWAsIHRoZW5cbiAqIGBGbGlnaHRQcmljZVN0b3JlYC5cbiAqL1xuXG52YXIgRGlzcGF0Y2hlciA9IChmdW5jdGlvbiAoKSB7XG4gIGZ1bmN0aW9uIERpc3BhdGNoZXIoKSB7XG4gICAgX2NsYXNzQ2FsbENoZWNrKHRoaXMsIERpc3BhdGNoZXIpO1xuXG4gICAgdGhpcy5fY2FsbGJhY2tzID0ge307XG4gICAgdGhpcy5faXNEaXNwYXRjaGluZyA9IGZhbHNlO1xuICAgIHRoaXMuX2lzSGFuZGxlZCA9IHt9O1xuICAgIHRoaXMuX2lzUGVuZGluZyA9IHt9O1xuICAgIHRoaXMuX2xhc3RJRCA9IDE7XG4gIH1cblxuICAvKipcbiAgICogUmVnaXN0ZXJzIGEgY2FsbGJhY2sgdG8gYmUgaW52b2tlZCB3aXRoIGV2ZXJ5IGRpc3BhdGNoZWQgcGF5bG9hZC4gUmV0dXJuc1xuICAgKiBhIHRva2VuIHRoYXQgY2FuIGJlIHVzZWQgd2l0aCBgd2FpdEZvcigpYC5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUucmVnaXN0ZXIgPSBmdW5jdGlvbiByZWdpc3RlcihjYWxsYmFjaykge1xuICAgIHZhciBpZCA9IF9wcmVmaXggKyB0aGlzLl9sYXN0SUQrKztcbiAgICB0aGlzLl9jYWxsYmFja3NbaWRdID0gY2FsbGJhY2s7XG4gICAgcmV0dXJuIGlkO1xuICB9O1xuXG4gIC8qKlxuICAgKiBSZW1vdmVzIGEgY2FsbGJhY2sgYmFzZWQgb24gaXRzIHRva2VuLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS51bnJlZ2lzdGVyID0gZnVuY3Rpb24gdW5yZWdpc3RlcihpZCkge1xuICAgICF0aGlzLl9jYWxsYmFja3NbaWRdID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IGludmFyaWFudChmYWxzZSwgJ0Rpc3BhdGNoZXIudW5yZWdpc3RlciguLi4pOiBgJXNgIGRvZXMgbm90IG1hcCB0byBhIHJlZ2lzdGVyZWQgY2FsbGJhY2suJywgaWQpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICBkZWxldGUgdGhpcy5fY2FsbGJhY2tzW2lkXTtcbiAgfTtcblxuICAvKipcbiAgICogV2FpdHMgZm9yIHRoZSBjYWxsYmFja3Mgc3BlY2lmaWVkIHRvIGJlIGludm9rZWQgYmVmb3JlIGNvbnRpbnVpbmcgZXhlY3V0aW9uXG4gICAqIG9mIHRoZSBjdXJyZW50IGNhbGxiYWNrLiBUaGlzIG1ldGhvZCBzaG91bGQgb25seSBiZSB1c2VkIGJ5IGEgY2FsbGJhY2sgaW5cbiAgICogcmVzcG9uc2UgdG8gYSBkaXNwYXRjaGVkIHBheWxvYWQuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLndhaXRGb3IgPSBmdW5jdGlvbiB3YWl0Rm9yKGlkcykge1xuICAgICF0aGlzLl9pc0Rpc3BhdGNoaW5nID8gcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJyA/IGludmFyaWFudChmYWxzZSwgJ0Rpc3BhdGNoZXIud2FpdEZvciguLi4pOiBNdXN0IGJlIGludm9rZWQgd2hpbGUgZGlzcGF0Y2hpbmcuJykgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgIGZvciAodmFyIGlpID0gMDsgaWkgPCBpZHMubGVuZ3RoOyBpaSsrKSB7XG4gICAgICB2YXIgaWQgPSBpZHNbaWldO1xuICAgICAgaWYgKHRoaXMuX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgIXRoaXMuX2lzSGFuZGxlZFtpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IENpcmN1bGFyIGRlcGVuZGVuY3kgZGV0ZWN0ZWQgd2hpbGUgJyArICd3YWl0aW5nIGZvciBgJXNgLicsIGlkKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgIXRoaXMuX2NhbGxiYWNrc1tpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLCBpZCkgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgICAgdGhpcy5faW52b2tlQ2FsbGJhY2soaWQpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogRGlzcGF0Y2hlcyBhIHBheWxvYWQgdG8gYWxsIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5kaXNwYXRjaCA9IGZ1bmN0aW9uIGRpc3BhdGNoKHBheWxvYWQpIHtcbiAgICAhIXRoaXMuX2lzRGlzcGF0Y2hpbmcgPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2guZGlzcGF0Y2goLi4uKTogQ2Fubm90IGRpc3BhdGNoIGluIHRoZSBtaWRkbGUgb2YgYSBkaXNwYXRjaC4nKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgdGhpcy5fc3RhcnREaXNwYXRjaGluZyhwYXlsb2FkKTtcbiAgICB0cnkge1xuICAgICAgZm9yICh2YXIgaWQgaW4gdGhpcy5fY2FsbGJhY2tzKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc1BlbmRpbmdbaWRdKSB7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5faW52b2tlQ2FsbGJhY2soaWQpO1xuICAgICAgfVxuICAgIH0gZmluYWxseSB7XG4gICAgICB0aGlzLl9zdG9wRGlzcGF0Y2hpbmcoKTtcbiAgICB9XG4gIH07XG5cbiAgLyoqXG4gICAqIElzIHRoaXMgRGlzcGF0Y2hlciBjdXJyZW50bHkgZGlzcGF0Y2hpbmcuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmlzRGlzcGF0Y2hpbmcgPSBmdW5jdGlvbiBpc0Rpc3BhdGNoaW5nKCkge1xuICAgIHJldHVybiB0aGlzLl9pc0Rpc3BhdGNoaW5nO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDYWxsIHRoZSBjYWxsYmFjayBzdG9yZWQgd2l0aCB0aGUgZ2l2ZW4gaWQuIEFsc28gZG8gc29tZSBpbnRlcm5hbFxuICAgKiBib29ra2VlcGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9pbnZva2VDYWxsYmFjayA9IGZ1bmN0aW9uIF9pbnZva2VDYWxsYmFjayhpZCkge1xuICAgIHRoaXMuX2lzUGVuZGluZ1tpZF0gPSB0cnVlO1xuICAgIHRoaXMuX2NhbGxiYWNrc1tpZF0odGhpcy5fcGVuZGluZ1BheWxvYWQpO1xuICAgIHRoaXMuX2lzSGFuZGxlZFtpZF0gPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBTZXQgdXAgYm9va2tlZXBpbmcgbmVlZGVkIHdoZW4gZGlzcGF0Y2hpbmcuXG4gICAqXG4gICAqIEBpbnRlcm5hbFxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5fc3RhcnREaXNwYXRjaGluZyA9IGZ1bmN0aW9uIF9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpIHtcbiAgICBmb3IgKHZhciBpZCBpbiB0aGlzLl9jYWxsYmFja3MpIHtcbiAgICAgIHRoaXMuX2lzUGVuZGluZ1tpZF0gPSBmYWxzZTtcbiAgICAgIHRoaXMuX2lzSGFuZGxlZFtpZF0gPSBmYWxzZTtcbiAgICB9XG4gICAgdGhpcy5fcGVuZGluZ1BheWxvYWQgPSBwYXlsb2FkO1xuICAgIHRoaXMuX2lzRGlzcGF0Y2hpbmcgPSB0cnVlO1xuICB9O1xuXG4gIC8qKlxuICAgKiBDbGVhciBib29ra2VlcGluZyB1c2VkIGZvciBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9zdG9wRGlzcGF0Y2hpbmcgPSBmdW5jdGlvbiBfc3RvcERpc3BhdGNoaW5nKCkge1xuICAgIGRlbGV0ZSB0aGlzLl9wZW5kaW5nUGF5bG9hZDtcbiAgICB0aGlzLl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gIH07XG5cbiAgcmV0dXJuIERpc3BhdGNoZXI7XG59KSgpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERpc3BhdGNoZXI7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTltYkhWNEwyeHBZaTlFYVhOd1lYUmphR1Z5TG1weklsMHNJbTVoYldWeklqcGJYU3dpYldGd2NHbHVaM01pT2lJN1FVRkJRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRWlMQ0ptYVd4bElqb2laMlZ1WlhKaGRHVmtMbXB6SWl3aWMyOTFjbU5sVW05dmRDSTZJaUlzSW5OdmRYSmpaWE5EYjI1MFpXNTBJanBiSWk4cUtseHVJQ29nUTI5d2VYSnBaMmgwSUNoaktTQXlNREUwTFRJd01UVXNJRVpoWTJWaWIyOXJMQ0JKYm1NdVhHNGdLaUJCYkd3Z2NtbG5hSFJ6SUhKbGMyVnlkbVZrTGx4dUlDcGNiaUFxSUZSb2FYTWdjMjkxY21ObElHTnZaR1VnYVhNZ2JHbGpaVzV6WldRZ2RXNWtaWElnZEdobElFSlRSQzF6ZEhsc1pTQnNhV05sYm5ObElHWnZkVzVrSUdsdUlIUm9aVnh1SUNvZ1RFbERSVTVUUlNCbWFXeGxJR2x1SUhSb1pTQnliMjkwSUdScGNtVmpkRzl5ZVNCdlppQjBhR2x6SUhOdmRYSmpaU0IwY21WbExpQkJiaUJoWkdScGRHbHZibUZzSUdkeVlXNTBYRzRnS2lCdlppQndZWFJsYm5RZ2NtbG5hSFJ6SUdOaGJpQmlaU0JtYjNWdVpDQnBiaUIwYUdVZ1VFRlVSVTVVVXlCbWFXeGxJR2x1SUhSb1pTQnpZVzFsSUdScGNtVmpkRzl5ZVM1Y2JpQXFYRzRnS2lCQWNISnZkbWxrWlhOTmIyUjFiR1VnUkdsemNHRjBZMmhsY2x4dUlDb2dYRzRnS2lCQWNISmxkbVZ1ZEUxMWJtZGxYRzRnS2k5Y2JseHVKM1Z6WlNCemRISnBZM1FuTzF4dVhHNWxlSEJ2Y25SekxsOWZaWE5OYjJSMWJHVWdQU0IwY25WbE8xeHVYRzVtZFc1amRHbHZiaUJmWTJ4aGMzTkRZV3hzUTJobFkyc29hVzV6ZEdGdVkyVXNJRU52Ym5OMGNuVmpkRzl5S1NCN0lHbG1JQ2doS0dsdWMzUmhibU5sSUdsdWMzUmhibU5sYjJZZ1EyOXVjM1J5ZFdOMGIzSXBLU0I3SUhSb2NtOTNJRzVsZHlCVWVYQmxSWEp5YjNJb0owTmhibTV2ZENCallXeHNJR0VnWTJ4aGMzTWdZWE1nWVNCbWRXNWpkR2x2YmljcE95QjlJSDFjYmx4dWRtRnlJR2x1ZG1GeWFXRnVkQ0E5SUhKbGNYVnBjbVVvSjJaaWFuTXZiR2xpTDJsdWRtRnlhV0Z1ZENjcE8xeHVYRzUyWVhJZ1gzQnlaV1pwZUNBOUlDZEpSRjhuTzF4dVhHNHZLaXBjYmlBcUlFUnBjM0JoZEdOb1pYSWdhWE1nZFhObFpDQjBieUJpY205aFpHTmhjM1FnY0dGNWJHOWhaSE1nZEc4Z2NtVm5hWE4wWlhKbFpDQmpZV3hzWW1GamEzTXVJRlJvYVhNZ2FYTmNiaUFxSUdScFptWmxjbVZ1ZENCbWNtOXRJR2RsYm1WeWFXTWdjSFZpTFhOMVlpQnplWE4wWlcxeklHbHVJSFIzYnlCM1lYbHpPbHh1SUNwY2JpQXFJQ0FnTVNrZ1EyRnNiR0poWTJ0eklHRnlaU0J1YjNRZ2MzVmljMk55YVdKbFpDQjBieUJ3WVhKMGFXTjFiR0Z5SUdWMlpXNTBjeTRnUlhabGNua2djR0Y1Ykc5aFpDQnBjMXh1SUNvZ0lDQWdJQ0JrYVhOd1lYUmphR1ZrSUhSdklHVjJaWEo1SUhKbFoybHpkR1Z5WldRZ1kyRnNiR0poWTJzdVhHNGdLaUFnSURJcElFTmhiR3hpWVdOcmN5QmpZVzRnWW1VZ1pHVm1aWEp5WldRZ2FXNGdkMmh2YkdVZ2IzSWdjR0Z5ZENCMWJuUnBiQ0J2ZEdobGNpQmpZV3hzWW1GamEzTWdhR0YyWlZ4dUlDb2dJQ0FnSUNCaVpXVnVJR1Y0WldOMWRHVmtMbHh1SUNwY2JpQXFJRVp2Y2lCbGVHRnRjR3hsTENCamIyNXphV1JsY2lCMGFHbHpJR2g1Y0c5MGFHVjBhV05oYkNCbWJHbG5hSFFnWkdWemRHbHVZWFJwYjI0Z1ptOXliU3dnZDJocFkyaGNiaUFxSUhObGJHVmpkSE1nWVNCa1pXWmhkV3gwSUdOcGRIa2dkMmhsYmlCaElHTnZkVzUwY25rZ2FYTWdjMlZzWldOMFpXUTZYRzRnS2x4dUlDb2dJQ0IyWVhJZ1pteHBaMmgwUkdsemNHRjBZMmhsY2lBOUlHNWxkeUJFYVhOd1lYUmphR1Z5S0NrN1hHNGdLbHh1SUNvZ0lDQXZMeUJMWldWd2N5QjBjbUZqYXlCdlppQjNhR2xqYUNCamIzVnVkSEo1SUdseklITmxiR1ZqZEdWa1hHNGdLaUFnSUhaaGNpQkRiM1Z1ZEhKNVUzUnZjbVVnUFNCN1kyOTFiblJ5ZVRvZ2JuVnNiSDA3WEc0Z0tseHVJQ29nSUNBdkx5QkxaV1Z3Y3lCMGNtRmpheUJ2WmlCM2FHbGphQ0JqYVhSNUlHbHpJSE5sYkdWamRHVmtYRzRnS2lBZ0lIWmhjaUJEYVhSNVUzUnZjbVVnUFNCN1kybDBlVG9nYm5Wc2JIMDdYRzRnS2x4dUlDb2dJQ0F2THlCTFpXVndjeUIwY21GamF5QnZaaUIwYUdVZ1ltRnpaU0JtYkdsbmFIUWdjSEpwWTJVZ2IyWWdkR2hsSUhObGJHVmpkR1ZrSUdOcGRIbGNiaUFxSUNBZ2RtRnlJRVpzYVdkb2RGQnlhV05sVTNSdmNtVWdQU0I3Y0hKcFkyVTZJRzUxYkd4OVhHNGdLbHh1SUNvZ1YyaGxiaUJoSUhWelpYSWdZMmhoYm1kbGN5QjBhR1VnYzJWc1pXTjBaV1FnWTJsMGVTd2dkMlVnWkdsemNHRjBZMmdnZEdobElIQmhlV3h2WVdRNlhHNGdLbHh1SUNvZ0lDQm1iR2xuYUhSRWFYTndZWFJqYUdWeUxtUnBjM0JoZEdOb0tIdGNiaUFxSUNBZ0lDQmhZM1JwYjI1VWVYQmxPaUFuWTJsMGVTMTFjR1JoZEdVbkxGeHVJQ29nSUNBZ0lITmxiR1ZqZEdWa1EybDBlVG9nSjNCaGNtbHpKMXh1SUNvZ0lDQjlLVHRjYmlBcVhHNGdLaUJVYUdseklIQmhlV3h2WVdRZ2FYTWdaR2xuWlhOMFpXUWdZbmtnWUVOcGRIbFRkRzl5WldBNlhHNGdLbHh1SUNvZ0lDQm1iR2xuYUhSRWFYTndZWFJqYUdWeUxuSmxaMmx6ZEdWeUtHWjFibU4wYVc5dUtIQmhlV3h2WVdRcElIdGNiaUFxSUNBZ0lDQnBaaUFvY0dGNWJHOWhaQzVoWTNScGIyNVVlWEJsSUQwOVBTQW5ZMmwwZVMxMWNHUmhkR1VuS1NCN1hHNGdLaUFnSUNBZ0lDQkRhWFI1VTNSdmNtVXVZMmwwZVNBOUlIQmhlV3h2WVdRdWMyVnNaV04wWldSRGFYUjVPMXh1SUNvZ0lDQWdJSDFjYmlBcUlDQWdmU2s3WEc0Z0tseHVJQ29nVjJobGJpQjBhR1VnZFhObGNpQnpaV3hsWTNSeklHRWdZMjkxYm5SeWVTd2dkMlVnWkdsemNHRjBZMmdnZEdobElIQmhlV3h2WVdRNlhHNGdLbHh1SUNvZ0lDQm1iR2xuYUhSRWFYTndZWFJqYUdWeUxtUnBjM0JoZEdOb0tIdGNiaUFxSUNBZ0lDQmhZM1JwYjI1VWVYQmxPaUFuWTI5MWJuUnllUzExY0dSaGRHVW5MRnh1SUNvZ0lDQWdJSE5sYkdWamRHVmtRMjkxYm5SeWVUb2dKMkYxYzNSeVlXeHBZU2RjYmlBcUlDQWdmU2s3WEc0Z0tseHVJQ29nVkdocGN5QndZWGxzYjJGa0lHbHpJR1JwWjJWemRHVmtJR0o1SUdKdmRHZ2djM1J2Y21Wek9seHVJQ3BjYmlBcUlDQWdRMjkxYm5SeWVWTjBiM0psTG1ScGMzQmhkR05vVkc5clpXNGdQU0JtYkdsbmFIUkVhWE53WVhSamFHVnlMbkpsWjJsemRHVnlLR1oxYm1OMGFXOXVLSEJoZVd4dllXUXBJSHRjYmlBcUlDQWdJQ0JwWmlBb2NHRjViRzloWkM1aFkzUnBiMjVVZVhCbElEMDlQU0FuWTI5MWJuUnllUzExY0dSaGRHVW5LU0I3WEc0Z0tpQWdJQ0FnSUNCRGIzVnVkSEo1VTNSdmNtVXVZMjkxYm5SeWVTQTlJSEJoZVd4dllXUXVjMlZzWldOMFpXUkRiM1Z1ZEhKNU8xeHVJQ29nSUNBZ0lIMWNiaUFxSUNBZ2ZTazdYRzRnS2x4dUlDb2dWMmhsYmlCMGFHVWdZMkZzYkdKaFkyc2dkRzhnZFhCa1lYUmxJR0JEYjNWdWRISjVVM1J2Y21WZ0lHbHpJSEpsWjJsemRHVnlaV1FzSUhkbElITmhkbVVnWVNCeVpXWmxjbVZ1WTJWY2JpQXFJSFJ2SUhSb1pTQnlaWFIxY201bFpDQjBiMnRsYmk0Z1ZYTnBibWNnZEdocGN5QjBiMnRsYmlCM2FYUm9JR0IzWVdsMFJtOXlLQ2xnTENCM1pTQmpZVzRnWjNWaGNtRnVkR1ZsWEc0Z0tpQjBhR0YwSUdCRGIzVnVkSEo1VTNSdmNtVmdJR2x6SUhWd1pHRjBaV1FnWW1WbWIzSmxJSFJvWlNCallXeHNZbUZqYXlCMGFHRjBJSFZ3WkdGMFpYTWdZRU5wZEhsVGRHOXlaV0JjYmlBcUlHNWxaV1J6SUhSdklIRjFaWEo1SUdsMGN5QmtZWFJoTGx4dUlDcGNiaUFxSUNBZ1EybDBlVk4wYjNKbExtUnBjM0JoZEdOb1ZHOXJaVzRnUFNCbWJHbG5hSFJFYVhOd1lYUmphR1Z5TG5KbFoybHpkR1Z5S0daMWJtTjBhVzl1S0hCaGVXeHZZV1FwSUh0Y2JpQXFJQ0FnSUNCcFppQW9jR0Y1Ykc5aFpDNWhZM1JwYjI1VWVYQmxJRDA5UFNBblkyOTFiblJ5ZVMxMWNHUmhkR1VuS1NCN1hHNGdLaUFnSUNBZ0lDQXZMeUJnUTI5MWJuUnllVk4wYjNKbExtTnZkVzUwY25sZ0lHMWhlU0J1YjNRZ1ltVWdkWEJrWVhSbFpDNWNiaUFxSUNBZ0lDQWdJR1pzYVdkb2RFUnBjM0JoZEdOb1pYSXVkMkZwZEVadmNpaGJRMjkxYm5SeWVWTjBiM0psTG1ScGMzQmhkR05vVkc5clpXNWRLVHRjYmlBcUlDQWdJQ0FnSUM4dklHQkRiM1Z1ZEhKNVUzUnZjbVV1WTI5MWJuUnllV0FnYVhNZ2JtOTNJR2QxWVhKaGJuUmxaV1FnZEc4Z1ltVWdkWEJrWVhSbFpDNWNiaUFxWEc0Z0tpQWdJQ0FnSUNBdkx5QlRaV3hsWTNRZ2RHaGxJR1JsWm1GMWJIUWdZMmwwZVNCbWIzSWdkR2hsSUc1bGR5QmpiM1Z1ZEhKNVhHNGdLaUFnSUNBZ0lDQkRhWFI1VTNSdmNtVXVZMmwwZVNBOUlHZGxkRVJsWm1GMWJIUkRhWFI1Um05eVEyOTFiblJ5ZVNoRGIzVnVkSEo1VTNSdmNtVXVZMjkxYm5SeWVTazdYRzRnS2lBZ0lDQWdmVnh1SUNvZ0lDQjlLVHRjYmlBcVhHNGdLaUJVYUdVZ2RYTmhaMlVnYjJZZ1lIZGhhWFJHYjNJb0tXQWdZMkZ1SUdKbElHTm9ZV2x1WldRc0lHWnZjaUJsZUdGdGNHeGxPbHh1SUNwY2JpQXFJQ0FnUm14cFoyaDBVSEpwWTJWVGRHOXlaUzVrYVhOd1lYUmphRlJ2YTJWdUlEMWNiaUFxSUNBZ0lDQm1iR2xuYUhSRWFYTndZWFJqYUdWeUxuSmxaMmx6ZEdWeUtHWjFibU4wYVc5dUtIQmhlV3h2WVdRcElIdGNiaUFxSUNBZ0lDQWdJSE4zYVhSamFDQW9jR0Y1Ykc5aFpDNWhZM1JwYjI1VWVYQmxLU0I3WEc0Z0tpQWdJQ0FnSUNBZ0lHTmhjMlVnSjJOdmRXNTBjbmt0ZFhCa1lYUmxKenBjYmlBcUlDQWdJQ0FnSUNBZ1kyRnpaU0FuWTJsMGVTMTFjR1JoZEdVbk9seHVJQ29nSUNBZ0lDQWdJQ0FnSUdac2FXZG9kRVJwYzNCaGRHTm9aWEl1ZDJGcGRFWnZjaWhiUTJsMGVWTjBiM0psTG1ScGMzQmhkR05vVkc5clpXNWRLVHRjYmlBcUlDQWdJQ0FnSUNBZ0lDQkdiR2xuYUhSUWNtbGpaVk4wYjNKbExuQnlhV05sSUQxY2JpQXFJQ0FnSUNBZ0lDQWdJQ0FnSUdkbGRFWnNhV2RvZEZCeWFXTmxVM1J2Y21Vb1EyOTFiblJ5ZVZOMGIzSmxMbU52ZFc1MGNua3NJRU5wZEhsVGRHOXlaUzVqYVhSNUtUdGNiaUFxSUNBZ0lDQWdJQ0FnSUNCaWNtVmhhenRjYmlBcUlDQWdJQ0I5WEc0Z0tpQWdJSDBwTzF4dUlDcGNiaUFxSUZSb1pTQmdZMjkxYm5SeWVTMTFjR1JoZEdWZ0lIQmhlV3h2WVdRZ2QybHNiQ0JpWlNCbmRXRnlZVzUwWldWa0lIUnZJR2x1ZG05clpTQjBhR1VnYzNSdmNtVnpKMXh1SUNvZ2NtVm5hWE4wWlhKbFpDQmpZV3hzWW1GamEzTWdhVzRnYjNKa1pYSTZJR0JEYjNWdWRISjVVM1J2Y21WZ0xDQmdRMmwwZVZOMGIzSmxZQ3dnZEdobGJseHVJQ29nWUVac2FXZG9kRkJ5YVdObFUzUnZjbVZnTGx4dUlDb3ZYRzVjYm5aaGNpQkVhWE53WVhSamFHVnlJRDBnS0daMWJtTjBhVzl1SUNncElIdGNiaUFnWm5WdVkzUnBiMjRnUkdsemNHRjBZMmhsY2lncElIdGNiaUFnSUNCZlkyeGhjM05EWVd4c1EyaGxZMnNvZEdocGN5d2dSR2x6Y0dGMFkyaGxjaWs3WEc1Y2JpQWdJQ0IwYUdsekxsOWpZV3hzWW1GamEzTWdQU0I3ZlR0Y2JpQWdJQ0IwYUdsekxsOXBjMFJwYzNCaGRHTm9hVzVuSUQwZ1ptRnNjMlU3WEc0Z0lDQWdkR2hwY3k1ZmFYTklZVzVrYkdWa0lEMGdlMzA3WEc0Z0lDQWdkR2hwY3k1ZmFYTlFaVzVrYVc1bklEMGdlMzA3WEc0Z0lDQWdkR2hwY3k1ZmJHRnpkRWxFSUQwZ01UdGNiaUFnZlZ4dVhHNGdJQzhxS2x4dUlDQWdLaUJTWldkcGMzUmxjbk1nWVNCallXeHNZbUZqYXlCMGJ5QmlaU0JwYm5admEyVmtJSGRwZEdnZ1pYWmxjbmtnWkdsemNHRjBZMmhsWkNCd1lYbHNiMkZrTGlCU1pYUjFjbTV6WEc0Z0lDQXFJR0VnZEc5clpXNGdkR2hoZENCallXNGdZbVVnZFhObFpDQjNhWFJvSUdCM1lXbDBSbTl5S0NsZ0xseHVJQ0FnS2k5Y2JseHVJQ0JFYVhOd1lYUmphR1Z5TG5CeWIzUnZkSGx3WlM1eVpXZHBjM1JsY2lBOUlHWjFibU4wYVc5dUlISmxaMmx6ZEdWeUtHTmhiR3hpWVdOcktTQjdYRzRnSUNBZ2RtRnlJR2xrSUQwZ1gzQnlaV1pwZUNBcklIUm9hWE11WDJ4aGMzUkpSQ3NyTzF4dUlDQWdJSFJvYVhNdVgyTmhiR3hpWVdOcmMxdHBaRjBnUFNCallXeHNZbUZqYXp0Y2JpQWdJQ0J5WlhSMWNtNGdhV1E3WEc0Z0lIMDdYRzVjYmlBZ0x5b3FYRzRnSUNBcUlGSmxiVzkyWlhNZ1lTQmpZV3hzWW1GamF5QmlZWE5sWkNCdmJpQnBkSE1nZEc5clpXNHVYRzRnSUNBcUwxeHVYRzRnSUVScGMzQmhkR05vWlhJdWNISnZkRzkwZVhCbExuVnVjbVZuYVhOMFpYSWdQU0JtZFc1amRHbHZiaUIxYm5KbFoybHpkR1Z5S0dsa0tTQjdYRzRnSUNBZ0lYUm9hWE11WDJOaGJHeGlZV05yYzF0cFpGMGdQeUJ3Y205alpYTnpMbVZ1ZGk1T1QwUkZYMFZPVmlBaFBUMGdKM0J5YjJSMVkzUnBiMjRuSUQ4Z2FXNTJZWEpwWVc1MEtHWmhiSE5sTENBblJHbHpjR0YwWTJobGNpNTFibkpsWjJsemRHVnlLQzR1TGlrNklHQWxjMkFnWkc5bGN5QnViM1FnYldGd0lIUnZJR0VnY21WbmFYTjBaWEpsWkNCallXeHNZbUZqYXk0bkxDQnBaQ2tnT2lCcGJuWmhjbWxoYm5Rb1ptRnNjMlVwSURvZ2RXNWtaV1pwYm1Wa08xeHVJQ0FnSUdSbGJHVjBaU0IwYUdsekxsOWpZV3hzWW1GamEzTmJhV1JkTzF4dUlDQjlPMXh1WEc0Z0lDOHFLbHh1SUNBZ0tpQlhZV2wwY3lCbWIzSWdkR2hsSUdOaGJHeGlZV05yY3lCemNHVmphV1pwWldRZ2RHOGdZbVVnYVc1MmIydGxaQ0JpWldadmNtVWdZMjl1ZEdsdWRXbHVaeUJsZUdWamRYUnBiMjVjYmlBZ0lDb2diMllnZEdobElHTjFjbkpsYm5RZ1kyRnNiR0poWTJzdUlGUm9hWE1nYldWMGFHOWtJSE5vYjNWc1pDQnZibXg1SUdKbElIVnpaV1FnWW5rZ1lTQmpZV3hzWW1GamF5QnBibHh1SUNBZ0tpQnlaWE53YjI1elpTQjBieUJoSUdScGMzQmhkR05vWldRZ2NHRjViRzloWkM1Y2JpQWdJQ292WEc1Y2JpQWdSR2x6Y0dGMFkyaGxjaTV3Y205MGIzUjVjR1V1ZDJGcGRFWnZjaUE5SUdaMWJtTjBhVzl1SUhkaGFYUkdiM0lvYVdSektTQjdYRzRnSUNBZ0lYUm9hWE11WDJselJHbHpjR0YwWTJocGJtY2dQeUJ3Y205alpYTnpMbVZ1ZGk1T1QwUkZYMFZPVmlBaFBUMGdKM0J5YjJSMVkzUnBiMjRuSUQ4Z2FXNTJZWEpwWVc1MEtHWmhiSE5sTENBblJHbHpjR0YwWTJobGNpNTNZV2wwUm05eUtDNHVMaWs2SUUxMWMzUWdZbVVnYVc1MmIydGxaQ0IzYUdsc1pTQmthWE53WVhSamFHbHVaeTRuS1NBNklHbHVkbUZ5YVdGdWRDaG1ZV3h6WlNrZ09pQjFibVJsWm1sdVpXUTdYRzRnSUNBZ1ptOXlJQ2gyWVhJZ2FXa2dQU0F3T3lCcGFTQThJR2xrY3k1c1pXNW5kR2c3SUdscEt5c3BJSHRjYmlBZ0lDQWdJSFpoY2lCcFpDQTlJR2xrYzF0cGFWMDdYRzRnSUNBZ0lDQnBaaUFvZEdocGN5NWZhWE5RWlc1a2FXNW5XMmxrWFNrZ2UxeHVJQ0FnSUNBZ0lDQWhkR2hwY3k1ZmFYTklZVzVrYkdWa1cybGtYU0EvSUhCeWIyTmxjM011Wlc1MkxrNVBSRVZmUlU1V0lDRTlQU0FuY0hKdlpIVmpkR2x2YmljZ1B5QnBiblpoY21saGJuUW9abUZzYzJVc0lDZEVhWE53WVhSamFHVnlMbmRoYVhSR2IzSW9MaTR1S1RvZ1EybHlZM1ZzWVhJZ1pHVndaVzVrWlc1amVTQmtaWFJsWTNSbFpDQjNhR2xzWlNBbklDc2dKM2RoYVhScGJtY2dabTl5SUdBbGMyQXVKeXdnYVdRcElEb2dhVzUyWVhKcFlXNTBLR1poYkhObEtTQTZJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQWdJQ0FnWTI5dWRHbHVkV1U3WEc0Z0lDQWdJQ0I5WEc0Z0lDQWdJQ0FoZEdocGN5NWZZMkZzYkdKaFkydHpXMmxrWFNBL0lIQnliMk5sYzNNdVpXNTJMazVQUkVWZlJVNVdJQ0U5UFNBbmNISnZaSFZqZEdsdmJpY2dQeUJwYm5aaGNtbGhiblFvWm1Gc2MyVXNJQ2RFYVhOd1lYUmphR1Z5TG5kaGFYUkdiM0lvTGk0dUtUb2dZQ1Z6WUNCa2IyVnpJRzV2ZENCdFlYQWdkRzhnWVNCeVpXZHBjM1JsY21Wa0lHTmhiR3hpWVdOckxpY3NJR2xrS1NBNklHbHVkbUZ5YVdGdWRDaG1ZV3h6WlNrZ09pQjFibVJsWm1sdVpXUTdYRzRnSUNBZ0lDQjBhR2x6TGw5cGJuWnZhMlZEWVd4c1ltRmpheWhwWkNrN1hHNGdJQ0FnZlZ4dUlDQjlPMXh1WEc0Z0lDOHFLbHh1SUNBZ0tpQkVhWE53WVhSamFHVnpJR0VnY0dGNWJHOWhaQ0IwYnlCaGJHd2djbVZuYVhOMFpYSmxaQ0JqWVd4c1ltRmphM011WEc0Z0lDQXFMMXh1WEc0Z0lFUnBjM0JoZEdOb1pYSXVjSEp2ZEc5MGVYQmxMbVJwYzNCaGRHTm9JRDBnWm5WdVkzUnBiMjRnWkdsemNHRjBZMmdvY0dGNWJHOWhaQ2tnZTF4dUlDQWdJQ0VoZEdocGN5NWZhWE5FYVhOd1lYUmphR2x1WnlBL0lIQnliMk5sYzNNdVpXNTJMazVQUkVWZlJVNVdJQ0U5UFNBbmNISnZaSFZqZEdsdmJpY2dQeUJwYm5aaGNtbGhiblFvWm1Gc2MyVXNJQ2RFYVhOd1lYUmphQzVrYVhOd1lYUmphQ2d1TGk0cE9pQkRZVzV1YjNRZ1pHbHpjR0YwWTJnZ2FXNGdkR2hsSUcxcFpHUnNaU0J2WmlCaElHUnBjM0JoZEdOb0xpY3BJRG9nYVc1MllYSnBZVzUwS0daaGJITmxLU0E2SUhWdVpHVm1hVzVsWkR0Y2JpQWdJQ0IwYUdsekxsOXpkR0Z5ZEVScGMzQmhkR05vYVc1bktIQmhlV3h2WVdRcE8xeHVJQ0FnSUhSeWVTQjdYRzRnSUNBZ0lDQm1iM0lnS0haaGNpQnBaQ0JwYmlCMGFHbHpMbDlqWVd4c1ltRmphM01wSUh0Y2JpQWdJQ0FnSUNBZ2FXWWdLSFJvYVhNdVgybHpVR1Z1WkdsdVoxdHBaRjBwSUh0Y2JpQWdJQ0FnSUNBZ0lDQmpiMjUwYVc1MVpUdGNiaUFnSUNBZ0lDQWdmVnh1SUNBZ0lDQWdJQ0IwYUdsekxsOXBiblp2YTJWRFlXeHNZbUZqYXlocFpDazdYRzRnSUNBZ0lDQjlYRzRnSUNBZ2ZTQm1hVzVoYkd4NUlIdGNiaUFnSUNBZ0lIUm9hWE11WDNOMGIzQkVhWE53WVhSamFHbHVaeWdwTzF4dUlDQWdJSDFjYmlBZ2ZUdGNibHh1SUNBdktpcGNiaUFnSUNvZ1NYTWdkR2hwY3lCRWFYTndZWFJqYUdWeUlHTjFjbkpsYm5Sc2VTQmthWE53WVhSamFHbHVaeTVjYmlBZ0lDb3ZYRzVjYmlBZ1JHbHpjR0YwWTJobGNpNXdjbTkwYjNSNWNHVXVhWE5FYVhOd1lYUmphR2x1WnlBOUlHWjFibU4wYVc5dUlHbHpSR2x6Y0dGMFkyaHBibWNvS1NCN1hHNGdJQ0FnY21WMGRYSnVJSFJvYVhNdVgybHpSR2x6Y0dGMFkyaHBibWM3WEc0Z0lIMDdYRzVjYmlBZ0x5b3FYRzRnSUNBcUlFTmhiR3dnZEdobElHTmhiR3hpWVdOcklITjBiM0psWkNCM2FYUm9JSFJvWlNCbmFYWmxiaUJwWkM0Z1FXeHpieUJrYnlCemIyMWxJR2x1ZEdWeWJtRnNYRzRnSUNBcUlHSnZiMnRyWldWd2FXNW5MbHh1SUNBZ0tseHVJQ0FnS2lCQWFXNTBaWEp1WVd4Y2JpQWdJQ292WEc1Y2JpQWdSR2x6Y0dGMFkyaGxjaTV3Y205MGIzUjVjR1V1WDJsdWRtOXJaVU5oYkd4aVlXTnJJRDBnWm5WdVkzUnBiMjRnWDJsdWRtOXJaVU5oYkd4aVlXTnJLR2xrS1NCN1hHNGdJQ0FnZEdocGN5NWZhWE5RWlc1a2FXNW5XMmxrWFNBOUlIUnlkV1U3WEc0Z0lDQWdkR2hwY3k1ZlkyRnNiR0poWTJ0elcybGtYU2gwYUdsekxsOXdaVzVrYVc1blVHRjViRzloWkNrN1hHNGdJQ0FnZEdocGN5NWZhWE5JWVc1a2JHVmtXMmxrWFNBOUlIUnlkV1U3WEc0Z0lIMDdYRzVjYmlBZ0x5b3FYRzRnSUNBcUlGTmxkQ0IxY0NCaWIyOXJhMlZsY0dsdVp5QnVaV1ZrWldRZ2QyaGxiaUJrYVhOd1lYUmphR2x1Wnk1Y2JpQWdJQ3BjYmlBZ0lDb2dRR2x1ZEdWeWJtRnNYRzRnSUNBcUwxeHVYRzRnSUVScGMzQmhkR05vWlhJdWNISnZkRzkwZVhCbExsOXpkR0Z5ZEVScGMzQmhkR05vYVc1bklEMGdablZ1WTNScGIyNGdYM04wWVhKMFJHbHpjR0YwWTJocGJtY29jR0Y1Ykc5aFpDa2dlMXh1SUNBZ0lHWnZjaUFvZG1GeUlHbGtJR2x1SUhSb2FYTXVYMk5oYkd4aVlXTnJjeWtnZTF4dUlDQWdJQ0FnZEdocGN5NWZhWE5RWlc1a2FXNW5XMmxrWFNBOUlHWmhiSE5sTzF4dUlDQWdJQ0FnZEdocGN5NWZhWE5JWVc1a2JHVmtXMmxrWFNBOUlHWmhiSE5sTzF4dUlDQWdJSDFjYmlBZ0lDQjBhR2x6TGw5d1pXNWthVzVuVUdGNWJHOWhaQ0E5SUhCaGVXeHZZV1E3WEc0Z0lDQWdkR2hwY3k1ZmFYTkVhWE53WVhSamFHbHVaeUE5SUhSeWRXVTdYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUVOc1pXRnlJR0p2YjJ0clpXVndhVzVuSUhWelpXUWdabTl5SUdScGMzQmhkR05vYVc1bkxseHVJQ0FnS2x4dUlDQWdLaUJBYVc1MFpYSnVZV3hjYmlBZ0lDb3ZYRzVjYmlBZ1JHbHpjR0YwWTJobGNpNXdjbTkwYjNSNWNHVXVYM04wYjNCRWFYTndZWFJqYUdsdVp5QTlJR1oxYm1OMGFXOXVJRjl6ZEc5d1JHbHpjR0YwWTJocGJtY29LU0I3WEc0Z0lDQWdaR1ZzWlhSbElIUm9hWE11WDNCbGJtUnBibWRRWVhsc2IyRmtPMXh1SUNBZ0lIUm9hWE11WDJselJHbHpjR0YwWTJocGJtY2dQU0JtWVd4elpUdGNiaUFnZlR0Y2JseHVJQ0J5WlhSMWNtNGdSR2x6Y0dGMFkyaGxjanRjYm4wcEtDazdYRzVjYm0xdlpIVnNaUzVsZUhCdmNuUnpJRDBnUkdsemNHRjBZMmhsY2pzaVhYMD0iLCIoZnVuY3Rpb24gKHByb2Nlc3Mpe1xuLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE1LCBGYWNlYm9vaywgSW5jLlxuICogQWxsIHJpZ2h0cyByZXNlcnZlZC5cbiAqXG4gKiBUaGlzIHNvdXJjZSBjb2RlIGlzIGxpY2Vuc2VkIHVuZGVyIHRoZSBCU0Qtc3R5bGUgbGljZW5zZSBmb3VuZCBpbiB0aGVcbiAqIExJQ0VOU0UgZmlsZSBpbiB0aGUgcm9vdCBkaXJlY3Rvcnkgb2YgdGhpcyBzb3VyY2UgdHJlZS4gQW4gYWRkaXRpb25hbCBncmFudFxuICogb2YgcGF0ZW50IHJpZ2h0cyBjYW4gYmUgZm91bmQgaW4gdGhlIFBBVEVOVFMgZmlsZSBpbiB0aGUgc2FtZSBkaXJlY3RvcnkuXG4gKlxuICogQHByb3ZpZGVzTW9kdWxlIGludmFyaWFudFxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIFVzZSBpbnZhcmlhbnQoKSB0byBhc3NlcnQgc3RhdGUgd2hpY2ggeW91ciBwcm9ncmFtIGFzc3VtZXMgdG8gYmUgdHJ1ZS5cbiAqXG4gKiBQcm92aWRlIHNwcmludGYtc3R5bGUgZm9ybWF0IChvbmx5ICVzIGlzIHN1cHBvcnRlZCkgYW5kIGFyZ3VtZW50c1xuICogdG8gcHJvdmlkZSBpbmZvcm1hdGlvbiBhYm91dCB3aGF0IGJyb2tlIGFuZCB3aGF0IHlvdSB3ZXJlXG4gKiBleHBlY3RpbmcuXG4gKlxuICogVGhlIGludmFyaWFudCBtZXNzYWdlIHdpbGwgYmUgc3RyaXBwZWQgaW4gcHJvZHVjdGlvbiwgYnV0IHRoZSBpbnZhcmlhbnRcbiAqIHdpbGwgcmVtYWluIHRvIGVuc3VyZSBsb2dpYyBkb2VzIG5vdCBkaWZmZXIgaW4gcHJvZHVjdGlvbi5cbiAqL1xuXG52YXIgaW52YXJpYW50ID0gZnVuY3Rpb24gKGNvbmRpdGlvbiwgZm9ybWF0LCBhLCBiLCBjLCBkLCBlLCBmKSB7XG4gIGlmIChwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nKSB7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ2ludmFyaWFudCByZXF1aXJlcyBhbiBlcnJvciBtZXNzYWdlIGFyZ3VtZW50Jyk7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFjb25kaXRpb24pIHtcbiAgICB2YXIgZXJyb3I7XG4gICAgaWYgKGZvcm1hdCA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignTWluaWZpZWQgZXhjZXB0aW9uIG9jY3VycmVkOyB1c2UgdGhlIG5vbi1taW5pZmllZCBkZXYgZW52aXJvbm1lbnQgJyArICdmb3IgdGhlIGZ1bGwgZXJyb3IgbWVzc2FnZSBhbmQgYWRkaXRpb25hbCBoZWxwZnVsIHdhcm5pbmdzLicpO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgYXJncyA9IFthLCBiLCBjLCBkLCBlLCBmXTtcbiAgICAgIHZhciBhcmdJbmRleCA9IDA7XG4gICAgICBlcnJvciA9IG5ldyBFcnJvcignSW52YXJpYW50IFZpb2xhdGlvbjogJyArIGZvcm1hdC5yZXBsYWNlKC8lcy9nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBhcmdzW2FyZ0luZGV4KytdO1xuICAgICAgfSkpO1xuICAgIH1cblxuICAgIGVycm9yLmZyYW1lc1RvUG9wID0gMTsgLy8gd2UgZG9uJ3QgY2FyZSBhYm91dCBpbnZhcmlhbnQncyBvd24gZnJhbWVcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBpbnZhcmlhbnQ7XG59KS5jYWxsKHRoaXMscmVxdWlyZSgnX3Byb2Nlc3MnKSlcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtjaGFyc2V0OnV0Zi04O2Jhc2U2NCxleUoyWlhKemFXOXVJam96TENKemIzVnlZMlZ6SWpwYkltNXZaR1ZmYlc5a2RXeGxjeTltYkhWNEwyNXZaR1ZmYlc5a2RXeGxjeTltWW1wekwyeHBZaTlwYm5aaGNtbGhiblF1YW5NaVhTd2libUZ0WlhNaU9sdGRMQ0p0WVhCd2FXNW5jeUk2SWp0QlFVRkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQklpd2labWxzWlNJNkltZGxibVZ5WVhSbFpDNXFjeUlzSW5OdmRYSmpaVkp2YjNRaU9pSWlMQ0p6YjNWeVkyVnpRMjl1ZEdWdWRDSTZXeUl2S2lwY2JpQXFJRU52Y0hseWFXZG9kQ0F5TURFekxUSXdNVFVzSUVaaFkyVmliMjlyTENCSmJtTXVYRzRnS2lCQmJHd2djbWxuYUhSeklISmxjMlZ5ZG1Wa0xseHVJQ3BjYmlBcUlGUm9hWE1nYzI5MWNtTmxJR052WkdVZ2FYTWdiR2xqWlc1elpXUWdkVzVrWlhJZ2RHaGxJRUpUUkMxemRIbHNaU0JzYVdObGJuTmxJR1p2ZFc1a0lHbHVJSFJvWlZ4dUlDb2dURWxEUlU1VFJTQm1hV3hsSUdsdUlIUm9aU0J5YjI5MElHUnBjbVZqZEc5eWVTQnZaaUIwYUdseklITnZkWEpqWlNCMGNtVmxMaUJCYmlCaFpHUnBkR2x2Ym1Gc0lHZHlZVzUwWEc0Z0tpQnZaaUJ3WVhSbGJuUWdjbWxuYUhSeklHTmhiaUJpWlNCbWIzVnVaQ0JwYmlCMGFHVWdVRUZVUlU1VVV5Qm1hV3hsSUdsdUlIUm9aU0J6WVcxbElHUnBjbVZqZEc5eWVTNWNiaUFxWEc0Z0tpQkFjSEp2ZG1sa1pYTk5iMlIxYkdVZ2FXNTJZWEpwWVc1MFhHNGdLaTljYmx4dVhDSjFjMlVnYzNSeWFXTjBYQ0k3WEc1Y2JpOHFLbHh1SUNvZ1ZYTmxJR2x1ZG1GeWFXRnVkQ2dwSUhSdklHRnpjMlZ5ZENCemRHRjBaU0IzYUdsamFDQjViM1Z5SUhCeWIyZHlZVzBnWVhOemRXMWxjeUIwYnlCaVpTQjBjblZsTGx4dUlDcGNiaUFxSUZCeWIzWnBaR1VnYzNCeWFXNTBaaTF6ZEhsc1pTQm1iM0p0WVhRZ0tHOXViSGtnSlhNZ2FYTWdjM1Z3Y0c5eWRHVmtLU0JoYm1RZ1lYSm5kVzFsYm5SelhHNGdLaUIwYnlCd2NtOTJhV1JsSUdsdVptOXliV0YwYVc5dUlHRmliM1YwSUhkb1lYUWdZbkp2YTJVZ1lXNWtJSGRvWVhRZ2VXOTFJSGRsY21WY2JpQXFJR1Y0Y0dWamRHbHVaeTVjYmlBcVhHNGdLaUJVYUdVZ2FXNTJZWEpwWVc1MElHMWxjM05oWjJVZ2QybHNiQ0JpWlNCemRISnBjSEJsWkNCcGJpQndjbTlrZFdOMGFXOXVMQ0JpZFhRZ2RHaGxJR2x1ZG1GeWFXRnVkRnh1SUNvZ2QybHNiQ0J5WlcxaGFXNGdkRzhnWlc1emRYSmxJR3h2WjJsaklHUnZaWE1nYm05MElHUnBabVpsY2lCcGJpQndjbTlrZFdOMGFXOXVMbHh1SUNvdlhHNWNiblpoY2lCcGJuWmhjbWxoYm5RZ1BTQm1kVzVqZEdsdmJpQW9ZMjl1WkdsMGFXOXVMQ0JtYjNKdFlYUXNJR0VzSUdJc0lHTXNJR1FzSUdVc0lHWXBJSHRjYmlBZ2FXWWdLSEJ5YjJObGMzTXVaVzUyTGs1UFJFVmZSVTVXSUNFOVBTQW5jSEp2WkhWamRHbHZiaWNwSUh0Y2JpQWdJQ0JwWmlBb1ptOXliV0YwSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJSFJvY205M0lHNWxkeUJGY25KdmNpZ25hVzUyWVhKcFlXNTBJSEpsY1hWcGNtVnpJR0Z1SUdWeWNtOXlJRzFsYzNOaFoyVWdZWEpuZFcxbGJuUW5LVHRjYmlBZ0lDQjlYRzRnSUgxY2JseHVJQ0JwWmlBb0lXTnZibVJwZEdsdmJpa2dlMXh1SUNBZ0lIWmhjaUJsY25KdmNqdGNiaUFnSUNCcFppQW9abTl5YldGMElEMDlQU0IxYm1SbFptbHVaV1FwSUh0Y2JpQWdJQ0FnSUdWeWNtOXlJRDBnYm1WM0lFVnljbTl5S0NkTmFXNXBabWxsWkNCbGVHTmxjSFJwYjI0Z2IyTmpkWEp5WldRN0lIVnpaU0IwYUdVZ2JtOXVMVzFwYm1sbWFXVmtJR1JsZGlCbGJuWnBjbTl1YldWdWRDQW5JQ3NnSjJadmNpQjBhR1VnWm5Wc2JDQmxjbkp2Y2lCdFpYTnpZV2RsSUdGdVpDQmhaR1JwZEdsdmJtRnNJR2hsYkhCbWRXd2dkMkZ5Ym1sdVozTXVKeWs3WEc0Z0lDQWdmU0JsYkhObElIdGNiaUFnSUNBZ0lIWmhjaUJoY21keklEMGdXMkVzSUdJc0lHTXNJR1FzSUdVc0lHWmRPMXh1SUNBZ0lDQWdkbUZ5SUdGeVowbHVaR1Y0SUQwZ01EdGNiaUFnSUNBZ0lHVnljbTl5SUQwZ2JtVjNJRVZ5Y205eUtDZEpiblpoY21saGJuUWdWbWx2YkdGMGFXOXVPaUFuSUNzZ1ptOXliV0YwTG5KbGNHeGhZMlVvTHlWekwyY3NJR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdJQ0FnSUNBZ2NtVjBkWEp1SUdGeVozTmJZWEpuU1c1a1pYZ3JLMTA3WEc0Z0lDQWdJQ0I5S1NrN1hHNGdJQ0FnZlZ4dVhHNGdJQ0FnWlhKeWIzSXVabkpoYldWelZHOVFiM0FnUFNBeE95QXZMeUIzWlNCa2IyNG5kQ0JqWVhKbElHRmliM1YwSUdsdWRtRnlhV0Z1ZENkeklHOTNiaUJtY21GdFpWeHVJQ0FnSUhSb2NtOTNJR1Z5Y205eU8xeHVJQ0I5WEc1OU8xeHVYRzV0YjJSMWJHVXVaWGh3YjNKMGN5QTlJR2x1ZG1GeWFXRnVkRHNpWFgwPSIsIi8qKlxuICogQ29weXJpZ2h0IDIwMTMtMjAxNCBGYWNlYm9vaywgSW5jLlxuICpcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcbiAqXG4gKiBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcbiAqXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxuICpcbiAqL1xuXG5cInVzZSBzdHJpY3RcIjtcblxuLyoqXG4gKiBDb25zdHJ1Y3RzIGFuIGVudW1lcmF0aW9uIHdpdGgga2V5cyBlcXVhbCB0byB0aGVpciB2YWx1ZS5cbiAqXG4gKiBGb3IgZXhhbXBsZTpcbiAqXG4gKiAgIHZhciBDT0xPUlMgPSBrZXlNaXJyb3Ioe2JsdWU6IG51bGwsIHJlZDogbnVsbH0pO1xuICogICB2YXIgbXlDb2xvciA9IENPTE9SUy5ibHVlO1xuICogICB2YXIgaXNDb2xvclZhbGlkID0gISFDT0xPUlNbbXlDb2xvcl07XG4gKlxuICogVGhlIGxhc3QgbGluZSBjb3VsZCBub3QgYmUgcGVyZm9ybWVkIGlmIHRoZSB2YWx1ZXMgb2YgdGhlIGdlbmVyYXRlZCBlbnVtIHdlcmVcbiAqIG5vdCBlcXVhbCB0byB0aGVpciBrZXlzLlxuICpcbiAqICAgSW5wdXQ6ICB7a2V5MTogdmFsMSwga2V5MjogdmFsMn1cbiAqICAgT3V0cHV0OiB7a2V5MToga2V5MSwga2V5Mjoga2V5Mn1cbiAqXG4gKiBAcGFyYW0ge29iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtvYmplY3R9XG4gKi9cbnZhciBrZXlNaXJyb3IgPSBmdW5jdGlvbihvYmopIHtcbiAgdmFyIHJldCA9IHt9O1xuICB2YXIga2V5O1xuICBpZiAoIShvYmogaW5zdGFuY2VvZiBPYmplY3QgJiYgIUFycmF5LmlzQXJyYXkob2JqKSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ2tleU1pcnJvciguLi4pOiBBcmd1bWVudCBtdXN0IGJlIGFuIG9iamVjdC4nKTtcbiAgfVxuICBmb3IgKGtleSBpbiBvYmopIHtcbiAgICBpZiAoIW9iai5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG4gICAgICBjb250aW51ZTtcbiAgICB9XG4gICAgcmV0W2tleV0gPSBrZXk7XG4gIH1cbiAgcmV0dXJuIHJldDtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0ga2V5TWlycm9yO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBUb09iamVjdCh2YWwpIHtcblx0aWYgKHZhbCA9PSBudWxsKSB7XG5cdFx0dGhyb3cgbmV3IFR5cGVFcnJvcignT2JqZWN0LmFzc2lnbiBjYW5ub3QgYmUgY2FsbGVkIHdpdGggbnVsbCBvciB1bmRlZmluZWQnKTtcblx0fVxuXG5cdHJldHVybiBPYmplY3QodmFsKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0YXJnZXQsIHNvdXJjZSkge1xuXHR2YXIgcGVuZGluZ0V4Y2VwdGlvbjtcblx0dmFyIGZyb207XG5cdHZhciBrZXlzO1xuXHR2YXIgdG8gPSBUb09iamVjdCh0YXJnZXQpO1xuXG5cdGZvciAodmFyIHMgPSAxOyBzIDwgYXJndW1lbnRzLmxlbmd0aDsgcysrKSB7XG5cdFx0ZnJvbSA9IGFyZ3VtZW50c1tzXTtcblx0XHRrZXlzID0gT2JqZWN0LmtleXMoT2JqZWN0KGZyb20pKTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0dG9ba2V5c1tpXV0gPSBmcm9tW2tleXNbaV1dO1xuXHRcdFx0fSBjYXRjaCAoZXJyKSB7XG5cdFx0XHRcdGlmIChwZW5kaW5nRXhjZXB0aW9uID09PSB1bmRlZmluZWQpIHtcblx0XHRcdFx0XHRwZW5kaW5nRXhjZXB0aW9uID0gZXJyO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0aWYgKHBlbmRpbmdFeGNlcHRpb24pIHtcblx0XHR0aHJvdyBwZW5kaW5nRXhjZXB0aW9uO1xuXHR9XG5cblx0cmV0dXJuIHRvO1xufTtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiIsIi8vIHNoaW0gZm9yIHVzaW5nIHByb2Nlc3MgaW4gYnJvd3NlclxuXG52YXIgcHJvY2VzcyA9IG1vZHVsZS5leHBvcnRzID0ge307XG52YXIgcXVldWUgPSBbXTtcbnZhciBkcmFpbmluZyA9IGZhbHNlO1xuXG5mdW5jdGlvbiBkcmFpblF1ZXVlKCkge1xuICAgIGlmIChkcmFpbmluZykge1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGRyYWluaW5nID0gdHJ1ZTtcbiAgICB2YXIgY3VycmVudFF1ZXVlO1xuICAgIHZhciBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgd2hpbGUobGVuKSB7XG4gICAgICAgIGN1cnJlbnRRdWV1ZSA9IHF1ZXVlO1xuICAgICAgICBxdWV1ZSA9IFtdO1xuICAgICAgICB2YXIgaSA9IC0xO1xuICAgICAgICB3aGlsZSAoKytpIDwgbGVuKSB7XG4gICAgICAgICAgICBjdXJyZW50UXVldWVbaV0oKTtcbiAgICAgICAgfVxuICAgICAgICBsZW4gPSBxdWV1ZS5sZW5ndGg7XG4gICAgfVxuICAgIGRyYWluaW5nID0gZmFsc2U7XG59XG5wcm9jZXNzLm5leHRUaWNrID0gZnVuY3Rpb24gKGZ1bikge1xuICAgIHF1ZXVlLnB1c2goZnVuKTtcbiAgICBpZiAoIWRyYWluaW5nKSB7XG4gICAgICAgIHNldFRpbWVvdXQoZHJhaW5RdWV1ZSwgMCk7XG4gICAgfVxufTtcblxucHJvY2Vzcy50aXRsZSA9ICdicm93c2VyJztcbnByb2Nlc3MuYnJvd3NlciA9IHRydWU7XG5wcm9jZXNzLmVudiA9IHt9O1xucHJvY2Vzcy5hcmd2ID0gW107XG5wcm9jZXNzLnZlcnNpb24gPSAnJzsgLy8gZW1wdHkgc3RyaW5nIHRvIGF2b2lkIHJlZ2V4cCBpc3N1ZXNcbnByb2Nlc3MudmVyc2lvbnMgPSB7fTtcblxuZnVuY3Rpb24gbm9vcCgpIHt9XG5cbnByb2Nlc3Mub24gPSBub29wO1xucHJvY2Vzcy5hZGRMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLm9uY2UgPSBub29wO1xucHJvY2Vzcy5vZmYgPSBub29wO1xucHJvY2Vzcy5yZW1vdmVMaXN0ZW5lciA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUFsbExpc3RlbmVycyA9IG5vb3A7XG5wcm9jZXNzLmVtaXQgPSBub29wO1xuXG5wcm9jZXNzLmJpbmRpbmcgPSBmdW5jdGlvbiAobmFtZSkge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5iaW5kaW5nIGlzIG5vdCBzdXBwb3J0ZWQnKTtcbn07XG5cbi8vIFRPRE8oc2h0eWxtYW4pXG5wcm9jZXNzLmN3ZCA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuICcvJyB9O1xucHJvY2Vzcy5jaGRpciA9IGZ1bmN0aW9uIChkaXIpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ3Byb2Nlc3MuY2hkaXIgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcbnByb2Nlc3MudW1hc2sgPSBmdW5jdGlvbigpIHsgcmV0dXJuIDA7IH07XG4iLCJ2YXIgRGlzcGF0Y2hlciA9IHJlcXVpcmUoJ2ZsdXgnKS5EaXNwYXRjaGVyO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG5ldyBEaXNwYXRjaGVyKCk7IiwidmFyIGtleU1pcnJvciA9IHJlcXVpcmUoJ2tleW1pcnJvcicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgICBBY3Rpb25UeXBlczoga2V5TWlycm9yKHtcbiAgICAgICAgTE9HSU46IG51bGwsXG4gICAgICAgIE1FU1NBR0VfU0VORDogbnVsbCxcbiAgICAgICAgSU5ESVZJRFVBTF9NRVNTQUdFX1NFTkQ6IG51bGwsXG4gICAgICAgIFNXSVRDSF9USFJFQUQ6IG51bGwsXG4gICAgICAgIE1FU1NBR0VfQlJPQURDQVNUOiBudWxsXG4gICAgfSksXG4gICAgQXZhdGFyczoge1xuICAgICAgICAxIDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDEsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctMTJweCAtMnB4J1xuICAgICAgICB9LFxuICAgICAgICAyIDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDIsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNzJweCAwcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDMgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogMyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy0xMzJweCAwcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDQgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNCxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy0xMXB4IC02MnB4J1xuICAgICAgICB9LFxuICAgICAgICA1IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDUsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNzJweCAtNjFweCdcbiAgICAgICAgfSxcbiAgICAgICAgNiA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA2LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTEzMnB4IC02MXB4J1xuICAgICAgICB9LFxuICAgICAgICA3IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDcsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctMTJweCAtMTI0cHgnXG4gICAgICAgIH0sXG4gICAgICAgIDggOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogOCxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03MnB4IC0xMjJweCdcbiAgICAgICAgfSxcbiAgICAgICAgOSA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA5LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTEzMnB4IC0xMjNweCdcbiAgICAgICAgfVxuICAgIH0sXG4gICAgQXZhdGFyc19zbWFsbDoge1xuICAgICAgICAxIDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDEsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNnB4IDBweCdcbiAgICAgICAgfSxcbiAgICAgICAgMiA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiAyLFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTQycHggMHB4J1xuICAgICAgICB9LFxuICAgICAgICAzIDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDMsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNzlweCAwcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDQgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNCxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy02cHggLTM2cHgnXG4gICAgICAgIH0sXG4gICAgICAgIDUgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNSxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy00MnB4IC0zNnB4J1xuICAgICAgICB9LFxuICAgICAgICA2IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDYsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNzlweCAtMzZweCdcbiAgICAgICAgfSxcbiAgICAgICAgNyA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA3LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTZweCAtNzNweCdcbiAgICAgICAgfSxcbiAgICAgICAgOCA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA4LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTQycHggLTczcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDkgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogOSxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03OXB4IC03M3B4J1xuICAgICAgICB9XG4gICAgfVxufTtcbiIsInZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXI7XG52YXIgYXNzaWduID0gcmVxdWlyZSgnb2JqZWN0LWFzc2lnbicpO1xudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2Rpc3BhdGNoZXInKTtcbnZhciBBY3Rpb25UeXBlcyA9IHJlcXVpcmUoJy4vaGVscGVyVXRpbCcpLkFjdGlvblR5cGVzO1xudmFyIGN1cnJlbnRfdXNlciA9IHt9O1xudmFyIHVzZXJzID0ge307XG52YXIgY3VycmVudFRocmVhZElkID0gXCIwXCI7IC8vZGVmYXVsdCB0aHJlYWQgaWRcbnZhciB1c2VyX21lc3NhZ2VzID0ge307XG52YXIgU3RvcmUgPSBhc3NpZ24oe30sIEV2ZW50RW1pdHRlci5wcm90b3R5cGUsIHtcbiAgICBlbWl0TG9naW46IGZ1bmN0aW9uKGRhdGEpIHtcbiAgICAgICAgY3VycmVudF91c2VyID0gZGF0YTtcbiAgICAgICAgdGhpcy5lbWl0KEFjdGlvblR5cGVzLkxPR0lOKTtcbiAgICB9LFxuICAgIGVtaXRNZXNzYWdlU2VuZDogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHZhciB0aHJlYWRJZCA9IGRhdGEudHlwZSA9PT0gXCJhdXRvbWF0ZVwiID8gXCIwXCIgOiBjdXJyZW50VGhyZWFkSWQ7XG4gICAgICAgIGlmKCF1c2VyX21lc3NhZ2VzW3RocmVhZElkXSkgdXNlcl9tZXNzYWdlc1t0aHJlYWRJZF0gPSBbXTtcbiAgICAgICAgdXNlcl9tZXNzYWdlc1t0aHJlYWRJZF0ucHVzaChkYXRhKTtcbiAgICAgICAgdGhpcy5lbWl0KEFjdGlvblR5cGVzLk1FU1NBR0VfU0VORCk7XG4gICAgfSxcbiAgICBlbWl0TWVzc2FnZUJyb2FkY2FzdDogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHZhciB0aHJlYWRpZCA9IGRhdGEudGhyZWFkSWQ7XG4gICAgICAgIGlmKCF1c2VyX21lc3NhZ2VzW3RocmVhZGlkXSkgdXNlcl9tZXNzYWdlc1t0aHJlYWRpZF0gPSBbXTtcbiAgICAgICAgdXNlcl9tZXNzYWdlc1t0aHJlYWRpZF0ucHVzaChkYXRhKTtcbiAgICAgICAgdGhpcy5lbWl0KEFjdGlvblR5cGVzLk1FU1NBR0VfQlJPQURDQVNULCBkYXRhKTtcbiAgICB9LFxuICAgIGFkZExvZ2luTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMub24oQWN0aW9uVHlwZXMuTE9HSU4sIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIHJlbW92ZUxvZ2luTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoQWN0aW9uVHlwZXMuTE9HSU4sIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGFkZE1lc3NhZ2VMaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKEFjdGlvblR5cGVzLk1FU1NBR0VfU0VORCwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlTWVzc2FnZUxpc3RlbmVyOiBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoQWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5ELCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBhZGRNZXNzYWdlQnJvYWRjYXN0TGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5vbihBY3Rpb25UeXBlcy5NRVNTQUdFX0JST0FEQ0FTVCwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlTWVzc2FnZUJyb2FkY2FzdExpc3RlbmVyOiBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIoQWN0aW9uVHlwZXMuTUVTU0FHRV9CUk9BRENBU1QsIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGFkZFRocmVhZExpc3RlbmVyOiBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIHRoaXMub24oQWN0aW9uVHlwZXMuU1dJVENIX1RIUkVBRCwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlVGhyZWFkTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihBY3Rpb25UeXBlcy5TV0lUQ0hfVEhSRUFELCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICBnZXRDdXJyZW50VXNlcjogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRfdXNlcjtcbiAgICB9LFxuICAgIGFsbE1lc3NhZ2U6IGZ1bmN0aW9uKCl7XG4gICAgICAgIGlmKCF1c2VyX21lc3NhZ2VzW2N1cnJlbnRUaHJlYWRJZF0pIHVzZXJfbWVzc2FnZXNbY3VycmVudFRocmVhZElkXSA9IFtdO1xuICAgICAgICByZXR1cm4gdXNlcl9tZXNzYWdlc1tjdXJyZW50VGhyZWFkSWRdO1xuICAgIH0sXG4gICAgYWRkTWVzc2FnZTogZnVuY3Rpb24oZGF0YSl7XG4gICAgICAgIHRoaXMuZW1pdE1lc3NhZ2VTZW5kKGRhdGEpO1xuICAgIH0sXG4gICAgZ2V0VGhyZWFkSWQ6IGZ1bmN0aW9uKCl7XG4gICAgICAgIHJldHVybiBjdXJyZW50VGhyZWFkSWQ7XG4gICAgfSxcbiAgICBzd2l0Y2hDaGFubmVsOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgY3VycmVudFRocmVhZElkID0gZGF0YS50aHJlYWRJZDtcbiAgICAgICAgdGhpcy5lbWl0KEFjdGlvblR5cGVzLlNXSVRDSF9USFJFQUQpO1xuICAgIH0sXG4gICAgLy8gcmVtb3ZlIG1lc3NhZ2VzIHdoZW4gdXNlciBsb2cgb3V0XG4gICAgcmVtb3ZlTWVzc2FnZXM6IGZ1bmN0aW9uKHJlbW92ZWRfdXNlcl9pZCl7XG4gICAgICAgIF8uZWFjaChfLmtleXModXNlcl9tZXNzYWdlcyksIGZ1bmN0aW9uKGtleSl7XG4gICAgICAgICAgICB2YXIgc3BsaXRfaWRzID0ga2V5LnNwbGl0KCdfJyk7XG4gICAgICAgICAgICBpZihfLmNvbnRhaW5zKHNwbGl0X2lkcywgcmVtb3ZlZF91c2VyX2lkKSl7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHVzZXJfbWVzc2FnZXNba2V5XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxufSk7XG5cblN0b3JlLmRpc3BhdGNoVG9rZW4gPSBkaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKGRhdGEpIHtcbiAgICBzd2l0Y2goZGF0YS5hY3Rpb25UeXBlcykge1xuICAgICAgICBjYXNlIEFjdGlvblR5cGVzLkxPR0lOOlxuICAgICAgICAgICAgU3RvcmUuZW1pdExvZ2luKGRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5EOlxuICAgICAgICAgICAgU3RvcmUuZW1pdE1lc3NhZ2VTZW5kKGRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQWN0aW9uVHlwZXMuTUVTU0FHRV9CUk9BRENBU1Q6XG4gICAgICAgICAgICBTdG9yZS5lbWl0TWVzc2FnZUJyb2FkY2FzdChkYXRhKTtcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICBjYXNlIEFjdGlvblR5cGVzLlNXSVRDSF9USFJFQUQ6XG4gICAgICAgICAgICBTdG9yZS5zd2l0Y2hDaGFubmVsKGRhdGEpO1xuICAgICAgICBkZWZhdWx0OlxuICAgIH1cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFN0b3JlOyIsInZhciBzb2NrZXQgPSBpby5jb25uZWN0KCk7XG52YXIgRU5URVJfS0VZX0NPREUgPSAxMztcbnZhciBTdG9yZSA9IHJlcXVpcmUoJy4vc3RvcmUnKTtcbnZhciBkaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9kaXNwYXRjaGVyJyk7XG52YXIgaGVscGVyVXRpbCA9IHJlcXVpcmUoJy4vaGVscGVyVXRpbCcpO1xudmFyIGFjdGlvblR5cGVzID0gaGVscGVyVXRpbC5BY3Rpb25UeXBlcztcbnZhciBhdmF0YXJzID0gaGVscGVyVXRpbC5BdmF0YXJzO1xudmFyIGF2YXRhcnNfc21hbGwgPSBoZWxwZXJVdGlsLkF2YXRhcnNfc21hbGw7XG52YXIgQVZBVEFSX1NDUk9MTF9MSU1JVCA9IDM7XG52YXIgU0NST0xMX0dBUF9XSURUSCA9IDE3MTtcbnZhciBVc2VyTGlzdCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtkaXNwbGF5TmFtZTogXCJVc2VyTGlzdFwiLFxuXHRoYW5kbGVDbGljazogZnVuY3Rpb24oZXZlbnQpe1xuXHRcdHZhciBpZCA9ICQoZXZlbnQuY3VycmVudFRhcmdldCkuYXR0cignZGF0YS1pZCcpO1xuXHRcdHRoaXMucHJvcHMubm90aWZpY2F0aW9uW2lkXSA9IGZhbHNlO1xuXHRcdF8uZWFjaCgkKHRoaXMucmVmcy51c2VyTGlzdC5nZXRET01Ob2RlKCkpLmNoaWxkcmVuKCksIGZ1bmN0aW9uKGNoaWxkKXtcblx0XHRcdHZhciB0eXBlID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdkYXRhLXR5cGUnKTtcblx0XHRcdHZhciBpc19jbGljayA9IGNoaWxkLmdldEF0dHJpYnV0ZSgnZGF0YS1pZCcpID09PSBpZDtcblx0XHRcdGlmKHR5cGUgPT09IFwiaG9tZVwiKXtcblx0XHRcdFx0Y2hpbGQuY2xhc3NOYW1lID0gaXNfY2xpY2sgPyBcInVzZXItcHJvZmlsZSBob21lIGFjdGl2ZVwiIDogXCJ1c2VyLXByb2ZpbGUgaG9tZVwiO1xuXHRcdFx0fWVsc2UgaWYodHlwZSA9PT0gXCJ1c2VyXCIpe1xuXHRcdFx0XHRjaGlsZC5jbGFzc05hbWUgPSBpc19jbGljayA/IFwidXNlci1wcm9maWxlIGFjdGl2ZVwiIDogXCJ1c2VyLXByb2ZpbGVcIjtcblx0XHRcdH1cblx0XHR9KTtcblx0XHQvLyBJIGp1c3QgdXNlIHNpbXBsZSBzZW5kZXJJRF9yZWNlaXZlcklEIGhlcmUgYXMgdGhlIGtleSBmb3IgdGhlIG1lc3NhZ2VzXG5cdFx0dmFyIHRocmVhZElkID0gaWQgPT09IFwiMFwiID8gaWQgOiBbaWQsIFN0b3JlLmdldEN1cnJlbnRVc2VyKCkuaWRdLnNvcnQoKS5qb2luKCdfJyk7XG5cdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHR0aHJlYWRJZDogdGhyZWFkSWQsXG5cdFx0XHRhY3Rpb25UeXBlcyA6IGFjdGlvblR5cGVzLlNXSVRDSF9USFJFQURcblx0XHR9KTtcblx0fSxcblx0Z2V0TmFtZTogZnVuY3Rpb24odXNlcil7XG5cdFx0cmV0dXJuIHVzZXIuaWQgPT09IFN0b3JlLmdldEN1cnJlbnRVc2VyKCkuaWQgPyBcIkN1cnJlbnQgVXNlclwiIDogdXNlci5uYW1lO1xuXHR9LFxuXHRnZXROb3RpZmljYXRpb25TdHlsZTogZnVuY3Rpb24oa2V5KXtcblx0XHRyZXR1cm4gdGhpcy5wcm9wcy5ub3RpZmljYXRpb25ba2V5XSA/IFwiaW5saW5lLWJsb2NrXCIgOiBcIm5vbmVcIjtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpe1xuXHRcdHJldHVybihcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXJzJ30sIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIG51bGwsIFwiIE9ubGluZSBVc2VycyBcIiksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdob21lJ30sIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIG51bGwpKSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXJzLWxpc3QnLCByZWY6ICd1c2VyTGlzdCd9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICd1c2VyLXByb2ZpbGUgaG9tZSBhY3RpdmUnLCBcImRhdGEtaWRcIjogJzAnLCBcImRhdGEtdHlwZVwiOiAnaG9tZScsIG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ2xpY2t9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6ICd1c2VyLWF2YXRhciBob21lJ30pLCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXItbmFtZSd9LCBcIiBcIiwgJ0FsbCBVc2VycycsIFwiIFwiKSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLWNvbW1lbnRpbmctb1wiLCBzdHlsZToge2Rpc3BsYXk6IHRoaXMuZ2V0Tm90aWZpY2F0aW9uU3R5bGUoJzAnKX19KVxuXHRcdFx0XHRcdCksIFxuXHRcdFx0XHRcdHRoaXMucHJvcHMudXNlcnMubWFwKGZ1bmN0aW9uKHVzZXIpIHtcblx0XHRcdFx0XHRcdHZhciBzdHlsZSA9IHsgJ2JhY2tncm91bmRQb3NpdGlvbic6IGF2YXRhcnNfc21hbGxbdXNlci5hdmF0YXJdLmJhY2tncm91bmRfcG9zaXRpb24gfTtcblx0XHRcdFx0XHRcdHJldHVybiAoXG5cdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXItcHJvZmlsZScsIFwiZGF0YS10eXBlXCI6ICd1c2VyJywgXCJkYXRhLWlkXCI6IHVzZXIuaWQsIG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ2xpY2t9LCBcblx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICd1c2VyLWF2YXRhcicsIHN0eWxlOiBzdHlsZX0pLCBcblx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICd1c2VyLW5hbWUnfSwgXCIgXCIsICB0aGlzLmdldE5hbWUodXNlciksIFwiIFwiKSwgXG5cdFx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1jb21tZW50aW5nLW9cIiwgc3R5bGU6IHtkaXNwbGF5OiB0aGlzLmdldE5vdGlmaWNhdGlvblN0eWxlKHVzZXIuaWQpfX0pXG5cdFx0XHRcdFx0XHRcdCkpO1xuXHRcdFx0XHRcdH0uYmluZCh0aGlzKSlcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdClcblx0fVxufSlcbnZhciBNZXNzYWdlID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIk1lc3NhZ2VcIixcblx0cmVuZGVyOiBmdW5jdGlvbigpe1xuXHRcdC8vIGNvbnZlcnQgWzoxXSBsaWtlIHN0cmluZyB0byBlbW9qaVxuXHRcdHZhciBjb252ZXJ0TWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuXHRcdFx0dmFyIHJlZ2V4ID0gL1xcW1xcOiguKj8pXFxdLztcblx0XHRcdHZhciBtZXNzYWdlID0gbWVzc2FnZTtcblx0XHRcdHdoaWxlKG1lc3NhZ2UubWF0Y2gocmVnZXgpKXtcblx0XHRcdFx0dmFyIGVtb2ppX2lkID0gbWVzc2FnZS5tYXRjaChyZWdleClbMV07XG5cdFx0XHRcdHZhciBzcmMgPSBcIi4uXFwvY29udGVudFxcL2Vtb2ppXFwvXCIgKyBlbW9qaV9pZCArIFwiLnBuZ1wiO1xuXHRcdFx0XHR2YXIgZW1vamkgPSBcIjxpbWcgY2xhc3M9XFwnZW1vamktaWNvblxcJyBzcmM9XFxcIlwiICsgc3JjICsgXCJcXFwiPlwiO1xuXHRcdFx0XHRtZXNzYWdlID0gbWVzc2FnZS5yZXBsYWNlKHJlZ2V4LCBlbW9qaSk7XG5cdFx0XHR9XG5cdFx0XHRyZXR1cm4ge19faHRtbDogbWVzc2FnZX07XG5cdFx0fTtcblx0XHRpZih0aGlzLnByb3BzLnR5cGUgPT09IFwiYXV0b21hdGVcIil7XG5cdFx0XHR2YXIgb3V0cHV0ID0gKFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwibWVzc2FnZSBhdXRvbWF0ZVwifSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImF1dG9tYXRlLW1lc3NhZ2VcIn0sIHRoaXMucHJvcHMubWVzc2FnZSlcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdH1lbHNle1xuXHRcdFx0dmFyIHVzZXIgPSB0aGlzLnByb3BzLnVzZXI7XG5cdFx0XHR2YXIgc3R5bGUgPSB7ICdiYWNrZ3JvdW5kUG9zaXRpb24nOiBhdmF0YXJzX3NtYWxsW3VzZXIuYXZhdGFyXS5iYWNrZ3JvdW5kX3Bvc2l0aW9uIH07XG5cdFx0XHR2YXIgb3V0cHV0ID0gKFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwibWVzc2FnZVwifSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcInVzZXItYXZhdGFyXCIsIHN0eWxlOiBzdHlsZX0pLCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwidXNlci1uYW1lXCJ9LCBcIiBcIiwgIHVzZXIubmFtZSwgXCIgXCIsIFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIHtjbGFzc05hbWU6ICd0aW1lJ30sIFwic2VudCBhdCBcIiwgdGhpcy5wcm9wcy50aW1lKSksIFxuXHRcdFx0XHRcdCgoKSA9PiB7XG5cdFx0XHRcdFx0XHRpZih0aGlzLnByb3BzLnR5cGUgPT09ICdpbWFnZScpe1xuXHRcdFx0XHRcdFx0XHRyZXR1cm4gKFxuXHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJjb250ZW50XCJ9LCBcblx0XHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIiwge2NsYXNzTmFtZTogXCJzZW50LWltYWdlXCIsIHNyYzogdGhpcy5wcm9wcy5pbWFnZX0pXG5cdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHRcdFx0cmV0dXJuIChcblx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiY29udGVudFwifSwgXG5cdFx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLXBsYXlcIn0pLCBcblx0XHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJpbmxpbmUtbWVzc2FnZVwiLCBkYW5nZXJvdXNseVNldElubmVySFRNTDogY29udmVydE1lc3NhZ2UodGhpcy5wcm9wcy5tZXNzYWdlKX0pXG5cdFx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSkoKVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0fVxuXHRcdHJldHVybiBvdXRwdXQ7XG5cblx0fVxufSk7XG52YXIgRW1vamlWaWV3ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIkVtb2ppVmlld1wiLFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIHN0eWxlID0gdGhpcy5wcm9wcy5pc0Vtb2ppU2hvdyA/IHsgZGlzcGxheSA6IFwiYmxvY2tcIn0gOiB7IGRpc3BsYXkgOiBcIm5vbmVcIn07XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJlbW9qaVwiLCBzdHlsZTogc3R5bGV9LCBcblx0XHRcdFx0XG5cdFx0XHRcdFx0Xy5yYW5nZSgyLDM0KS5tYXAoZnVuY3Rpb24ocm93KXtcblx0XHRcdFx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW1nXCIsIHtzcmM6ICcuLi9jb250ZW50L2Vtb2ppLycgKyByb3cgKyAnLnBuZycsIFwiZGF0YS1pZFwiOiByb3csIG9uQ2xpY2s6IHRoaXMucHJvcHMuaGFuZGxlRW1vamlDbGlja30pXG5cdFx0XHRcdFx0fS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdFxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pO1xudmFyIE1lc3NhZ2VMaXN0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIk1lc3NhZ2VMaXN0XCIsXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bWVzc2FnZSA6IFwiXCIsXG5cdFx0XHRpc0Vtb2ppU2hvdzogZmFsc2UsXG5cdFx0XHRpbWFnZSA6IFwiXCJcblx0XHR9XG5cdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRSZWFjdC5maW5kRE9NTm9kZSh0aGlzLnJlZnMudGV4dGFyZWEpLmZvY3VzKCk7XG5cdH0sXG5cdGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24oKXtcblx0XHR0aGlzLl9zY3JvbGxUb0JvdHRvbSgpO1xuXHR9LFxuXHRzZW5kOiBmdW5jdGlvbih0eXBlKXtcblx0XHR2YXIgZGF0YSA9IHtcblx0XHRcdHVzZXIgOiBTdG9yZS5nZXRDdXJyZW50VXNlcigpLFxuXHRcdFx0dGltZSA6IG1vbWVudChuZXcgRGF0ZSgpKS5mb3JtYXQoJ2xsbCcpLFxuXHRcdFx0dGhyZWFkSWQ6IFN0b3JlLmdldFRocmVhZElkKClcblx0XHR9O1xuXHRcdGlmKHR5cGUgPT09ICdpbWFnZScpe1xuXHRcdFx0dmFyIGltYWdlID0gdGhpcy5zdGF0ZS5pbWFnZTtcblx0XHRcdGlmKCFfLmlzRW1wdHkoaW1hZ2UpKXtcblx0XHRcdFx0ZGF0YS5pbWFnZSA9IGltYWdlO1xuXHRcdFx0XHRkYXRhLnR5cGUgPSBcImltYWdlXCI7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdGUoeyBpbWFnZSA6IFwiXCIgfSk7XG5cdFx0XHR9XG5cdFx0fWVsc2UgaWYodHlwZSA9PT0gJ3RleHQnKXtcblx0XHRcdHZhciBtZXNzYWdlID0gdGhpcy5zdGF0ZS5tZXNzYWdlLnRyaW0oKTtcblx0XHRcdGlmKCFfLmlzRW1wdHkobWVzc2FnZSkpe1xuXHRcdFx0XHRkYXRhLm1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRcdFx0XHRkYXRhLnR5cGUgPSBcInRleHRcIjtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7IG1lc3NhZ2UgOiBcIlwiIH0pO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRpZihkYXRhLmltYWdlIHx8IGRhdGEubWVzc2FnZSl7XG5cdFx0XHR0aGlzLnByb3BzLmhhbmRsZU1lc3NhZ2VTdWJtaXQoZGF0YSk7XG5cdFx0XHR0aGlzLl9zY3JvbGxUb0JvdHRvbSgpO1xuXHRcdH1cblx0fSxcblx0aGFuZGxlS2V5ZG93bjogZnVuY3Rpb24oZXZlbnQpe1xuXHRcdGlmKGV2ZW50LmtleUNvZGUgPT09IEVOVEVSX0tFWV9DT0RFKXtcblx0XHRcdHRoaXMuc2VuZCgndGV4dCcpO1xuXHRcdH1cblx0fSxcblx0X3Njcm9sbFRvQm90dG9tOiBmdW5jdGlvbigpe1xuXHRcdHZhciBtZXNzYWdlX2JvYXJkID0gUmVhY3QuZmluZERPTU5vZGUodGhpcy5yZWZzLmFsbF9tZXNzYWdlcyk7XG5cdFx0JChtZXNzYWdlX2JvYXJkKS5zdG9wKCkuYW5pbWF0ZSh7XG5cdFx0XHRzY3JvbGxUb3A6IG1lc3NhZ2VfYm9hcmQuc2Nyb2xsSGVpZ2h0XG5cdFx0fSwgNTAwKTtcblx0fSxcblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbihldmVudCl7XG5cdFx0dmFyIHZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXHRcdGlmKHZhbHVlLmluZGV4T2YoXCJcXG5cIikgPiAtMSkgIHZhbHVlID0gdmFsdWUucmVwbGFjZShcIlxcblwiLFwiXCIpO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0bWVzc2FnZSA6IHZhbHVlXG5cdFx0fSk7XG5cdH0sXG5cdGhhbmRsZUVtb2ppQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHR2YXIgZW1vamlJZCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRtZXNzYWdlOiB0aGlzLnN0YXRlLm1lc3NhZ2UgKyBcIls6XCIgKyBlbW9qaUlkICsgXCJdXCIsXG5cdFx0XHRpc0Vtb2ppU2hvdzogZmFsc2Vcblx0XHR9KTtcblx0XHRSZWFjdC5maW5kRE9NTm9kZSh0aGlzLnJlZnMudGV4dGFyZWEpLmZvY3VzKCk7XG5cdH0sXG5cdHNob3dIaWRlRW1vamk6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGlzU2hvd24gPSAhdGhpcy5zdGF0ZS5pc0Vtb2ppU2hvdztcblx0XHR0aGlzLnNldFN0YXRlKHsgaXNFbW9qaVNob3cgOiBpc1Nob3duIH0pO1xuXHR9LFxuXHRoYW5kbGVTdWJtaXQ6IGZ1bmN0aW9uKGUpIHtcblx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdH0sXG5cdGhhbmRsZUZpbGU6IGZ1bmN0aW9uKGUpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIHJlYWRlciA9IG5ldyBGaWxlUmVhZGVyKCk7XG5cdFx0dmFyIGZpbGUgPSBlLnRhcmdldC5maWxlc1swXTtcblxuXHRcdHJlYWRlci5vbmxvYWQgPSBmdW5jdGlvbih1cGxvYWQpIHtcblx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRpbWFnZTogdXBsb2FkLnRhcmdldC5yZXN1bHRcblx0XHRcdH0pO1xuXHRcdFx0c2VsZi5zZW5kKCdpbWFnZScpO1xuXHRcdH1cblxuXHRcdGlmKGZpbGUpIHJlYWRlci5yZWFkQXNEYXRhVVJMKGZpbGUpIDtcblx0fSxcblx0cmVuZGVyOiBmdW5jdGlvbigpe1xuXHRcdHZhciBpc19tZXNzYWdlc19lbXB0eSA9IF8uaXNFbXB0eSh0aGlzLnByb3BzLm1lc3NhZ2VzKTtcblx0XHR2YXIgbm9fbWVzc2FnZV9zdHlsZSA9IGlzX21lc3NhZ2VzX2VtcHR5ID8geyBkaXNwbGF5IDogJ2Jsb2NrJ30gOiB7IGRpc3BsYXkgOiAnbm9uZSd9O1xuXHRcdHZhciBtZXNzYWdlX3N0eWxlID0gaXNfbWVzc2FnZXNfZW1wdHkgPyB7IGRpc3BsYXkgOiAnbm9uZSd9IDogeyBkaXNwbGF5IDogJ2Jsb2NrJ307XG5cdFx0dmFyIHJlbmRlck1lc3NhZ2UgPSBmdW5jdGlvbihkYXRhKXtcblx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KE1lc3NhZ2UsIHt1c2VyOiBkYXRhLnVzZXIsIG1lc3NhZ2U6IGRhdGEubWVzc2FnZSwgaW1hZ2U6IGRhdGEuaW1hZ2UsIHRpbWU6IGRhdGEudGltZSwgdHlwZTogZGF0YS50eXBlfSlcblx0XHR9XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJtZXNzYWdlLWJvYXJkXCJ9LCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCBudWxsLCBcIiBDb252ZXJzYXRpb246IFwiKSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ21lc3NhZ2VzJ30sIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJuby1tZXNzYWdlXCIsIHN0eWxlOiBub19tZXNzYWdlX3N0eWxlfSwgXG5cdFx0XHRcdFx0XHRcIk5vIG5ldyBtZXNzYWdlczopXCJcblx0XHRcdFx0XHQpLCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiaGFzLW1lc3NhZ2VcIiwgc3R5bGU6IG1lc3NhZ2Vfc3R5bGUsIHJlZjogXCJhbGxfbWVzc2FnZXNcIn0sIFxuXHRcdFx0XHRcdFx0IHRoaXMucHJvcHMubWVzc2FnZXMubWFwKHJlbmRlck1lc3NhZ2UpXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcIm1lc3NhZ2VzLWNvbXBvc2VyXCJ9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwidGV4dGFyZWFcIiwge3ZhbHVlOiB0aGlzLnN0YXRlLm1lc3NhZ2UsIHBsYWNlaG9sZGVyOiBcIndoYXQgZG8geW91IHdhbnQgdG8gc2F5OilcIiwgb25DaGFuZ2U6IHRoaXMuaGFuZGxlQ2hhbmdlLCBvbktleURvd246IHRoaXMuaGFuZGxlS2V5ZG93biwgcmVmOiBcInRleHRhcmVhXCJ9KSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImJ0bnNcIn0sIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImVuaGFuY2UtYnRuc1wifSwgXG5cdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwiZmEgZmEtc21pbGUtb1wiLCBvbkNsaWNrOiB0aGlzLnNob3dIaWRlRW1vaml9KSwgXG5cdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoRW1vamlWaWV3LCB7aXNFbW9qaVNob3c6IHRoaXMuc3RhdGUuaXNFbW9qaVNob3csIGhhbmRsZUVtb2ppQ2xpY2s6IHRoaXMuaGFuZGxlRW1vamlDbGlja30pLCBcblx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1waWN0dXJlLW9cIn0sIFxuXHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIsIHtjbGFzc05hbWU6IFwiaW1hZ2VVcGxvYWRlclwiLCBvblN1Ym1pdDogdGhpcy5oYW5kbGVTdWJtaXQsIGVuY1R5cGU6IFwibXVsdGlwYXJ0L2Zvcm0tZGF0YVwifSwgXG5cdFx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge3R5cGU6IFwiZmlsZVwiLCBvbkNoYW5nZTogdGhpcy5oYW5kbGVGaWxlfSlcblx0XHRcdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHRcdCksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiLCB7Y2xhc3NOYW1lOiBcImJ0blwiLCB0eXBlOiBcImJ1dHRvblwiLCBvbkNsaWNrOiB0aGlzLnNlbmR9LCBcblx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwgbnVsbCwgXCJTZW5kXCIpXG5cdFx0XHRcdFx0XHQpXG5cdFx0XHRcdFx0KVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KTtcblx0fVxufSk7XG5cbnZhciBDaGF0V2luZG93ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIkNoYXRXaW5kb3dcIixcblx0Z2V0SW5pdGlhbFN0YXRlOiBmdW5jdGlvbigpe1xuXHRcdHNvY2tldC5vbignYnJvYWRjYXN0Om1lc3NhZ2UnLCB0aGlzLm1lc3NhZ2VSZWNlaXZlKTtcblx0XHRzb2NrZXQub24oJ3VzZXI6am9pbicsIHRoaXMudXNlckpvaW5lZCk7XG5cdFx0c29ja2V0Lm9uKCd1c2VyOmRpc2Nvbm5lY3QnLCB0aGlzLnVzZXJMb2dvdXQpO1xuXHRcdHJldHVybiB7dXNlcnM6IFtdLCBtZXNzYWdlczpbXSwgbm90aWZpY2F0aW9uOiB7XCIwXCI6IGZhbHNlfX07XG5cdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpe1xuXHRcdCQuZ2V0KCcvdXNlcnMnLCBmdW5jdGlvbihyZXN1bHQpIHtcblx0XHRcdHZhciBub3RpZmljYXRpb24gPSB7fTtcblx0XHRcdHZhciBpZHMgPSBfLm1hcChyZXN1bHQsIGZ1bmN0aW9uKHJlcyl7IHJldHVybiByZXMuaWR9KTtcblx0XHRcdF8uZWFjaChpZHMsIGZ1bmN0aW9uKGlkKXtub3RpZmljYXRpb25baWRdID0gZmFsc2V9KTtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe3VzZXJzOiByZXN1bHQsIG5vdGlmaWNhdGlvbjogbm90aWZpY2F0aW9ufSk7XG5cdFx0fS5iaW5kKHRoaXMpKTtcblx0XHRTdG9yZS5hZGRNZXNzYWdlTGlzdGVuZXIodGhpcy5fdXBkYXRlTWVzc2FnZVZpZXcpO1xuXHRcdFN0b3JlLmFkZFRocmVhZExpc3RlbmVyKHRoaXMuX3VwZGF0ZU1lc3NhZ2VWaWV3KTtcblx0XHRTdG9yZS5hZGRNZXNzYWdlQnJvYWRjYXN0TGlzdGVuZXIodGhpcy5fb25NZXNzYWdlQ2hhbmdlKTtcblx0fSxcblx0Y29tcG9uZW50V2lsbFVubW91bnQ6IGZ1bmN0aW9uKCl7XG5cdFx0U3RvcmUucmVtb3ZlTWVzc2FnZUxpc3RlbmVyKHRoaXMuX3VwZGF0ZU1lc3NhZ2VWaWV3KTtcblx0XHRTdG9yZS5yZW1vdmVUaHJlYWRMaXN0ZW5lcih0aGlzLl91cGRhdGVNZXNzYWdlVmlldyk7XG5cdFx0U3RvcmUucmVtb3ZlTWVzc2FnZUJyb2FkY2FzdExpc3RlbmVyKHRoaXMuX29uTWVzc2FnZUNoYW5nZSk7XG5cdH0sXG5cdG1lc3NhZ2VSZWNlaXZlOiBmdW5jdGlvbihkYXRhKXtcblx0XHRkYXRhLmFjdGlvblR5cGVzID0gYWN0aW9uVHlwZXMuTUVTU0FHRV9CUk9BRENBU1Q7XG5cdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaChkYXRhKTtcblx0fSxcblx0dXNlckxvZ291dDogZnVuY3Rpb24oZGF0YSl7XG5cdFx0aWYoZGF0YSl7XG5cdFx0XHR2YXIgbG9nb3V0X3VzZXJfaWQgPSBkYXRhLmlkO1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdHVzZXJzOiBfLnJlamVjdCh0aGlzLnN0YXRlLnVzZXJzLCBmdW5jdGlvbih1c2VyKXsgcmV0dXJuIHVzZXIuaWQgPT09IGxvZ291dF91c2VyX2lkfSlcblx0XHRcdH0pO1xuXHRcdFx0U3RvcmUucmVtb3ZlTWVzc2FnZXMobG9nb3V0X3VzZXJfaWQpO1xuXHRcdFx0aWYoU3RvcmUuZ2V0VGhyZWFkSWQoKS5pbmRleE9mKGxvZ291dF91c2VyX2lkKSA+IC0xKXtcblx0XHRcdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHRcdFx0dGhyZWFkSWQ6IFwiMFwiLFxuXHRcdFx0XHRcdGFjdGlvblR5cGVzIDogYWN0aW9uVHlwZXMuU1dJVENIX1RIUkVBRFxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGRpc3BhdGNoZXIuZGlzcGF0Y2goe1xuXHRcdFx0XHRtZXNzYWdlIDogZGF0YS5uYW1lICsnIGhhcyBsZWZ0IHRoZSBjaGF0dGluZyByb29tOignLFxuXHRcdFx0XHR0eXBlIDogJ2F1dG9tYXRlJyxcblx0XHRcdFx0YWN0aW9uVHlwZXMgOiBhY3Rpb25UeXBlcy5NRVNTQUdFX1NFTkRcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0dXNlckpvaW5lZDogZnVuY3Rpb24oZGF0YSl7XG5cdFx0dGhpcy5zdGF0ZS51c2Vycy5wdXNoKGRhdGEpO1xuXHRcdHRoaXMuc3RhdGUubm90aWZpY2F0aW9uW2RhdGEuaWRdID0gZmFsc2U7XG5cdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaCh7XG5cdFx0XHRtZXNzYWdlIDogZGF0YS5uYW1lICsnIGp1c3Qgam9pbmVkLCBzYXkgaGVsbG8hJyxcblx0XHRcdHR5cGUgOiAnYXV0b21hdGUnLFxuXHRcdFx0YWN0aW9uVHlwZXMgOiBhY3Rpb25UeXBlcy5NRVNTQUdFX1NFTkRcblx0XHR9KTtcblx0fSxcblx0aGFuZGxlTWVzc2FnZVN1Ym1pdCA6IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdGRhdGEuYWN0aW9uVHlwZXMgPSBhY3Rpb25UeXBlcy5NRVNTQUdFX1NFTkQ7XG5cdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaChkYXRhKTtcblx0XHRzb2NrZXQuZW1pdCgnc2VuZDptZXNzYWdlJywgZGF0YSk7XG5cdH0sXG5cdHJlbmRlciA6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2lkOiAnY2hhdC13aW5kb3cnfSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoVXNlckxpc3QsIHt1c2VyczogdGhpcy5zdGF0ZS51c2Vycywgbm90aWZpY2F0aW9uOiB0aGlzLnN0YXRlLm5vdGlmaWNhdGlvbn0pLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnbWVzc2FnZS1jb250YWluZXInfSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChNZXNzYWdlTGlzdCwge21lc3NhZ2VzOiB0aGlzLnN0YXRlLm1lc3NhZ2VzLCBoYW5kbGVNZXNzYWdlU3VibWl0OiB0aGlzLmhhbmRsZU1lc3NhZ2VTdWJtaXR9KVxuXHRcdFx0XHQpLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChDb250YWN0LCBudWxsKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH0sXG5cdF91cGRhdGVNZXNzYWdlVmlldzogZnVuY3Rpb24oKXtcblx0XHR0aGlzLnNldFN0YXRlKHttZXNzYWdlczogU3RvcmUuYWxsTWVzc2FnZSgpfSk7XG5cdH0sXG5cdC8vIHNob3cgYSBub3RpZmljYXRpb24gd2hlbiByZWNlaXZpbmcgbWVzc2FnZXMgaWYgY3VycmVudCB0aHJlYWQgaXMgbm90IHRoZSB0YXJnZXQgdGhyZWFkXG5cdF9vbk1lc3NhZ2VDaGFuZ2U6IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHZhciB0aHJlYWRJZCA9IGRhdGEudGhyZWFkSWQ7XG5cdFx0dmFyIHNwbGl0cyA9IHRocmVhZElkLnNwbGl0KFwiX1wiKTtcblx0XHR2YXIgY3VycmVudF91c2VyX2lkID0gU3RvcmUuZ2V0Q3VycmVudFVzZXIoKS5pZC50b1N0cmluZygpO1xuXHRcdGlmKHRocmVhZElkICE9PSBTdG9yZS5nZXRUaHJlYWRJZCgpICYmIChfLmNvbnRhaW5zKHNwbGl0cywgY3VycmVudF91c2VyX2lkKSB8fCB0aHJlYWRJZCA9PT0gJzAnKSl7XG5cdFx0XHR2YXIgaWQgPSBudWxsO1xuXHRcdFx0aWYodGhyZWFkSWQgPT09IFwiMFwiKXtcblx0XHRcdFx0aWQgPSB0aHJlYWRJZDtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR2YXIgd2l0aG91dF9jdXJyZW50X3VzZXIgPSBfLndpdGhvdXQoc3BsaXRzLCBjdXJyZW50X3VzZXJfaWQpO1xuXHRcdFx0XHRpZCA9IHdpdGhvdXRfY3VycmVudF91c2VyWzBdO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5zdGF0ZS5ub3RpZmljYXRpb25baWRdID0gdHJ1ZTtcblx0XHR9XG5cdFx0dGhpcy5fdXBkYXRlTWVzc2FnZVZpZXcoKTtcblx0fVxufSk7XG52YXIgTG9naW5Gb3JtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIkxvZ2luRm9ybVwiLFxuXHRhdmF0YXJfaW5kZXggOiAxLFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGJ0bkRpc3BsYXk6ICdub25lJyxcblx0XHRcdG5hbWUgOiBcIlwiLFxuXHRcdFx0aXNOZXh0U3RlcCA6IGZhbHNlXG5cdFx0fVxuICBcdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHQgUmVhY3QuZmluZERPTU5vZGUodGhpcy5yZWZzLmxvZ2luX2lucHV0KS5mb2N1cygpO1xuIFx0fSxcblx0aGFuZGxlS2V5ZG93bjogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZihldmVudC5rZXlDb2RlID09PSBFTlRFUl9LRVlfQ09ERSl7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtpc05leHRTdGVwOiB0cnVlfSk7XG5cdFx0fVxuICBcdH0sXG5cdGhhbmRsZUNsaWNrOiBmdW5jdGlvbigpe1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBuYW1lID0gdGhpcy5zdGF0ZS5uYW1lLnRyaW0oKTtcblx0XHR2YXIgYXZhdGFyID0gdGhpcy5zdGF0ZS5hdmF0YXI7XG5cdFx0aWYgKG5hbWUpIHtcblx0XHRcdHZhciBkYXRhID0ge25hbWU6IG5hbWUsIGF2YXRhcjogYXZhdGFyfTtcblx0XHRcdHNvY2tldC5lbWl0KCdsb2dpbicsIGRhdGEsIGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMpe1xuXHRcdFx0XHRcdGFsZXJ0KCdZb3VyIG5hbWUgaGFzIGJlZW4gdXNlZCBieSBvdGhlcnMsIHBsZWFzZSB1c2UgYW5vdGhlciBuYW1lLicpO1xuXHRcdFx0XHRcdHNlbGYuc2V0U3RhdGUoe2lzTmV4dFN0ZXA6IGZhbHNlLCBidG5EaXNwbGF5OiBcIm5vbmVcIn0pO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHQkLmFqYXgoe1xuXHRcdFx0XHRcdFx0dHlwZSA6IFwicG9zdFwiLFxuXHRcdFx0XHRcdFx0dXJsOiBcIi9sb2dpblwiLFxuXHRcdFx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0XHRcdGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcblx0XHRcdFx0XHRcdGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRcdFx0XHR1c2VyLmFjdGlvblR5cGVzID0gYWN0aW9uVHlwZXMuTE9HSU47XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoZXIuZGlzcGF0Y2godXNlcik7XG5cdFx0XHRcdFx0XHRcdFJlYWN0LnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KENoYXRXaW5kb3csIG51bGwpLCAkKCdib2R5JylbMF0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbihldmVudCl7XG5cdFx0dmFyIHRleHQgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRuYW1lIDogdGV4dFxuXHRcdH0pO1xuXHR9LFxuXHRhdmF0YXJOYXZMZWZ0OiBmdW5jdGlvbigpe1xuXHRcdGlmKHRoaXMuYXZhdGFyX2luZGV4IDwgQVZBVEFSX1NDUk9MTF9MSU1JVCl7XG5cdFx0XHQkKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMucmVmcy5hdmF0YXJOYXYpKS5hbmltYXRlKHsncmlnaHQnOicrPScgKyBTQ1JPTExfR0FQX1dJRFRIICsgJ3B4J30pO1xuXHRcdFx0dGhpcy5hdmF0YXJfaW5kZXgrKztcblx0XHR9XG5cdH0sXG5cdGF2YXRhck5hdlJpZ2h0OiBmdW5jdGlvbigpe1xuXHRcdGlmKHRoaXMuYXZhdGFyX2luZGV4ID4gMSl7XG5cdFx0XHQkKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMucmVmcy5hdmF0YXJOYXYpKS5hbmltYXRlKHsncmlnaHQnOictPScgKyBTQ1JPTExfR0FQX1dJRFRIICsgJ3B4J30pO1xuXHRcdFx0dGhpcy5hdmF0YXJfaW5kZXgtLTtcblx0XHR9XG5cdH0sXG5cdC8vIG1heWJlIG5vdCBhIHJlYWN0IHdheSwgd2lsbCBmaW5kIGEgZ29vZCB3YXkgdG8gZG8gdGhpc1xuXHRzZWxlY3RBdmF0YXI6IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHR2YXIgaWQgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRfLmVhY2goJCh0aGlzLnJlZnMuYXZhdGFyTmF2LmdldERPTU5vZGUoKSkuY2hpbGRyZW4oKSwgZnVuY3Rpb24oY2hpbGQpe1xuXHRcdFx0Y2hpbGQuY2xhc3NOYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJykgPT09IGlkID8gXCJhdmF0YXIgYWN0aXZlXCIgOiBcImF2YXRhclwiO1xuXHRcdH0pO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0YnRuRGlzcGxheTogJ2Jsb2NrJyxcblx0XHRcdGF2YXRhcjogaWRcblx0XHR9KTtcblx0fSxcbiAgXHRyZW5kZXIgOiBmdW5jdGlvbigpe1xuXHQgIFx0dmFyIHN0eWxlID0gdGhpcy5wcm9wcy5pc0xvZ2luID8geyBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30gOiB7IGRpc3BsYXk6ICdub25lJ307XG5cdCAgXHR2YXIgY3ggPSBSZWFjdC5hZGRvbnMuY2xhc3NTZXQ7XG5cdCAgXHR2YXIgaW50cm9DbGFzc2VzID0gY3goe1xuXHRcdCAgJ2ludHJvRm9ybSc6IHRydWUsXG5cdFx0ICAnZmFkZSc6IHRoaXMuc3RhdGUuaXNOZXh0U3RlcFxuXHQgIFx0fSk7XG5cdCAgXHR2YXIgYXZhdGFyQ2xhc3NlcyA9IGN4KHtcblx0XHQgICdhdmF0YXJGb3JtJyA6IHRydWUsXG5cdFx0ICAnYWN0aXZlJzogdGhpcy5zdGF0ZS5pc05leHRTdGVwXG5cdCAgXHR9KTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7aWQ6ICdsb2dpbi13aW5kb3cnLCBzdHlsZTogc3R5bGV9LCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBpbnRyb0NsYXNzZXN9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdncmVldGluZyd9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwiZmEgZmEtY29tbWVudGluZy1vXCJ9KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiaW5saW5lXCJ9LCAnSGksIHdoYXTigJlzIHlvdXIgbmFtZT8nKVxuXHRcdFx0XHRcdCksIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ2lucHV0J30sIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1jb21tZW50aW5nLW9cIn0pLCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ2lucHV0J30sIFxuXHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge2NsYXNzTmFtZTogXCJpbmxpbmVcIiwgdHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiB0aGlzLnN0YXRlLm5hbWUsIHJlZjogXCJsb2dpbl9pbnB1dFwiLCBkaXNhYmxlZDogdGhpcy5zdGF0ZS5pc05leHRTdGVwLCBvbkNoYW5nZTogdGhpcy5oYW5kbGVDaGFuZ2UsIG9uS2V5RG93bjogdGhpcy5oYW5kbGVLZXlkb3dufSlcblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IGF2YXRhckNsYXNzZXMsIHJlZjogXCJhdmF0YXJcIn0sIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLWNvbW1lbnRpbmctb1wifSksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImlubGluZVwifSwgJ1BpY2sgeW91ciBmYXZvcml0ZSBhdmF0YXIuJylcblx0XHRcdFx0XHQpLCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiYXZhdGFyLXNlbGVjdG9yXCJ9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwibmF2IGZhIGZhLWFuZ2xlLWxlZnQgZmEtbGdcIiwgb25DbGljazogdGhpcy5hdmF0YXJOYXZMZWZ0fSksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnYXZhdGFyLWNvbnRhaW5lci1vdXRlcid9LCBcblx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnYXZhdGFyLWNvbnRhaW5lci1pbm5lcicsIHJlZjogXCJhdmF0YXJOYXZcIn0sIFxuXHRcdFx0XHRcdFx0XHRcdF8udmFsdWVzKGF2YXRhcnMpLm1hcChmdW5jdGlvbihhdmF0YXIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBzdHlsZSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0J2JhY2tncm91bmRQb3NpdGlvbic6IGF2YXRhci5iYWNrZ3JvdW5kX3Bvc2l0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7a2V5OiBhdmF0YXIuYXZhdGFyX2lkLCBcImRhdGEtaWRcIjogYXZhdGFyLmF2YXRhcl9pZCwgY2xhc3NOYW1lOiAnYXZhdGFyJywgb25DbGljazogdGhpcy5zZWxlY3RBdmF0YXIsIHN0eWxlOiBzdHlsZX0pO1xuXHRcdFx0XHRcdFx0XHRcdH0uYmluZCh0aGlzKSlcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcIm5hdiBmYSBmYS1hbmdsZS1yaWdodCBmYS1sZ1wiLCBvbkNsaWNrOiB0aGlzLmF2YXRhck5hdlJpZ2h0fSlcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIsIHtjbGFzc05hbWU6ICdidG4nLCB0eXBlOiBcImJ1dHRvblwiLCBzdHlsZToge2Rpc3BsYXk6IHRoaXMuc3RhdGUuYnRuRGlzcGxheX0sIG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ2xpY2t9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBcIlN0YXJ0IGNoYXR0aW5nIVwiKVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0XHQpO1xuICBcdH1cbn0pO1xudmFyIENvbnRhY3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6IFwiQ29udGFjdFwiLFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJjb250YWN0XCJ9LCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1jb3B5cmlnaHRcIn0sIFwiIFwiKSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFxuXHRcdFx0XHRcdFwiTWFkZSBieSBcIiwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge2hyZWY6IFwiaHR0cHM6Ly9naXRodWIuY29tL2phbWVzbWFuMTFcIn0sIFwiSmFtZXMgTWFuXCIpXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpXG5cdH1cbn0pXG52YXIgQ2hhdEFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtkaXNwbGF5TmFtZTogXCJDaGF0QXBwXCIsXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgXHRyZXR1cm4ge2lzTG9naW46IHRydWV9O1xuICBcdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRTdG9yZS5hZGRMb2dpbkxpc3RlbmVyKHRoaXMuX29uTG9naW4pO1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRTdG9yZS5yZW1vdmVMb2dpbkxpc3RlbmVyKHRoaXMuX29uTG9naW4pO1xuXHR9LFxuXHRyZW5kZXIgOiBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAoXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdtYWluJ30sIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KExvZ2luRm9ybSwge2lzTG9naW46IHRoaXMuc3RhdGUuaXNMb2dpbn0pLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChDb250YWN0LCBudWxsKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH0sXG5cdF9vbkxvZ2luOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtpc0xvZ2luOiBmYWxzZX0pO1xuXHR9XG59KVxuUmVhY3QucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ2hhdEFwcCwgbnVsbCksICQoJ2JvZHknKVswXSk7XG4iXX0=
