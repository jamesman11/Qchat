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
					React.createElement("div", {className: "content"}, 
						React.createElement("i", {className: "fa fa-play"}), 
						React.createElement("div", {className: "inline-message", dangerouslySetInnerHTML: convertMessage(this.props.message)})
					)
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
			isEmojiShow: false
		}
	},
	componentDidMount: function() {
		React.findDOMNode(this.refs.textarea).focus();
	},
	componentDidUpdate: function(){
		this._scrollToBottom();
	},
	send: function(){
		var message = this.state.message.trim();
		if(!_.isEmpty(message)){
			var data = {
				message : message,
				user : Store.getCurrentUser(),
				time : moment(new Date()).format('lll'),
				threadId: Store.getThreadId()
			}
			this.props.handleMessageSubmit(data);
			this._scrollToBottom();
			this.setState({
				message : ""
			});
		}
	},
	handleKeydown: function(event){
		if(event.keyCode === ENTER_KEY_CODE){
			this.send();
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
	render: function(){
		var is_messages_empty = _.isEmpty(this.props.messages);
		var no_message_style = is_messages_empty ? { display : 'block'} : { display : 'none'};
		var message_style = is_messages_empty ? { display : 'none'} : { display : 'block'};
		var renderMessage = function(message){
			return React.createElement(Message, {user: message.user, message: message.message, time: message.time, type: message.type})
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
							React.createElement("i", {className: "fa fa-picture-o", onClick: ""})
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
			this.setState({
				users: _.reject(this.state.users, function(user){ return user.id === data.id})
			});
			Store.removeMessages(data.id);
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
		data.actionTypes = actionTypes.MESSAGE_SEND
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwibm9kZV9tb2R1bGVzL2ZsdXgvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZmx1eC9saWIvRGlzcGF0Y2hlci5qcyIsIm5vZGVfbW9kdWxlcy9mbHV4L25vZGVfbW9kdWxlcy9mYmpzL2xpYi9pbnZhcmlhbnQuanMiLCJub2RlX21vZHVsZXMva2V5bWlycm9yL2luZGV4LmpzIiwibm9kZV9tb2R1bGVzL29iamVjdC1hc3NpZ24vaW5kZXguanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2V2ZW50cy9ldmVudHMuanMiLCJub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL3Byb2Nlc3MvYnJvd3Nlci5qcyIsInNyYy9zY3JpcHRzL2Rpc3BhdGNoZXIuanMiLCJzcmMvc2NyaXB0cy9oZWxwZXJVdGlsLmpzIiwic3JjL3NjcmlwdHMvc3RvcmUuanMiLCJzcmMvc2NyaXB0cy93ZWNoYXQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6T0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbkRBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxREE7QUFDQTtBQUNBOztBQ0ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzlGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cy5EaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9saWIvRGlzcGF0Y2hlcicpO1xuIiwiKGZ1bmN0aW9uIChwcm9jZXNzKXtcbi8qKlxuICogQ29weXJpZ2h0IChjKSAyMDE0LTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgRGlzcGF0Y2hlclxuICogXG4gKiBAcHJldmVudE11bmdlXG4gKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5leHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xuXG5mdW5jdGlvbiBfY2xhc3NDYWxsQ2hlY2soaW5zdGFuY2UsIENvbnN0cnVjdG9yKSB7IGlmICghKGluc3RhbmNlIGluc3RhbmNlb2YgQ29uc3RydWN0b3IpKSB7IHRocm93IG5ldyBUeXBlRXJyb3IoJ0Nhbm5vdCBjYWxsIGEgY2xhc3MgYXMgYSBmdW5jdGlvbicpOyB9IH1cblxudmFyIGludmFyaWFudCA9IHJlcXVpcmUoJ2ZianMvbGliL2ludmFyaWFudCcpO1xuXG52YXIgX3ByZWZpeCA9ICdJRF8nO1xuXG4vKipcbiAqIERpc3BhdGNoZXIgaXMgdXNlZCB0byBicm9hZGNhc3QgcGF5bG9hZHMgdG8gcmVnaXN0ZXJlZCBjYWxsYmFja3MuIFRoaXMgaXNcbiAqIGRpZmZlcmVudCBmcm9tIGdlbmVyaWMgcHViLXN1YiBzeXN0ZW1zIGluIHR3byB3YXlzOlxuICpcbiAqICAgMSkgQ2FsbGJhY2tzIGFyZSBub3Qgc3Vic2NyaWJlZCB0byBwYXJ0aWN1bGFyIGV2ZW50cy4gRXZlcnkgcGF5bG9hZCBpc1xuICogICAgICBkaXNwYXRjaGVkIHRvIGV2ZXJ5IHJlZ2lzdGVyZWQgY2FsbGJhY2suXG4gKiAgIDIpIENhbGxiYWNrcyBjYW4gYmUgZGVmZXJyZWQgaW4gd2hvbGUgb3IgcGFydCB1bnRpbCBvdGhlciBjYWxsYmFja3MgaGF2ZVxuICogICAgICBiZWVuIGV4ZWN1dGVkLlxuICpcbiAqIEZvciBleGFtcGxlLCBjb25zaWRlciB0aGlzIGh5cG90aGV0aWNhbCBmbGlnaHQgZGVzdGluYXRpb24gZm9ybSwgd2hpY2hcbiAqIHNlbGVjdHMgYSBkZWZhdWx0IGNpdHkgd2hlbiBhIGNvdW50cnkgaXMgc2VsZWN0ZWQ6XG4gKlxuICogICB2YXIgZmxpZ2h0RGlzcGF0Y2hlciA9IG5ldyBEaXNwYXRjaGVyKCk7XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjb3VudHJ5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDb3VudHJ5U3RvcmUgPSB7Y291bnRyeTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB3aGljaCBjaXR5IGlzIHNlbGVjdGVkXG4gKiAgIHZhciBDaXR5U3RvcmUgPSB7Y2l0eTogbnVsbH07XG4gKlxuICogICAvLyBLZWVwcyB0cmFjayBvZiB0aGUgYmFzZSBmbGlnaHQgcHJpY2Ugb2YgdGhlIHNlbGVjdGVkIGNpdHlcbiAqICAgdmFyIEZsaWdodFByaWNlU3RvcmUgPSB7cHJpY2U6IG51bGx9XG4gKlxuICogV2hlbiBhIHVzZXIgY2hhbmdlcyB0aGUgc2VsZWN0ZWQgY2l0eSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY2l0eS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ2l0eTogJ3BhcmlzJ1xuICogICB9KTtcbiAqXG4gKiBUaGlzIHBheWxvYWQgaXMgZGlnZXN0ZWQgYnkgYENpdHlTdG9yZWA6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY2l0eS11cGRhdGUnKSB7XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IHBheWxvYWQuc2VsZWN0ZWRDaXR5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgdXNlciBzZWxlY3RzIGEgY291bnRyeSwgd2UgZGlzcGF0Y2ggdGhlIHBheWxvYWQ6XG4gKlxuICogICBmbGlnaHREaXNwYXRjaGVyLmRpc3BhdGNoKHtcbiAqICAgICBhY3Rpb25UeXBlOiAnY291bnRyeS11cGRhdGUnLFxuICogICAgIHNlbGVjdGVkQ291bnRyeTogJ2F1c3RyYWxpYSdcbiAqICAgfSk7XG4gKlxuICogVGhpcyBwYXlsb2FkIGlzIGRpZ2VzdGVkIGJ5IGJvdGggc3RvcmVzOlxuICpcbiAqICAgQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICBDb3VudHJ5U3RvcmUuY291bnRyeSA9IHBheWxvYWQuc2VsZWN0ZWRDb3VudHJ5O1xuICogICAgIH1cbiAqICAgfSk7XG4gKlxuICogV2hlbiB0aGUgY2FsbGJhY2sgdG8gdXBkYXRlIGBDb3VudHJ5U3RvcmVgIGlzIHJlZ2lzdGVyZWQsIHdlIHNhdmUgYSByZWZlcmVuY2VcbiAqIHRvIHRoZSByZXR1cm5lZCB0b2tlbi4gVXNpbmcgdGhpcyB0b2tlbiB3aXRoIGB3YWl0Rm9yKClgLCB3ZSBjYW4gZ3VhcmFudGVlXG4gKiB0aGF0IGBDb3VudHJ5U3RvcmVgIGlzIHVwZGF0ZWQgYmVmb3JlIHRoZSBjYWxsYmFjayB0aGF0IHVwZGF0ZXMgYENpdHlTdG9yZWBcbiAqIG5lZWRzIHRvIHF1ZXJ5IGl0cyBkYXRhLlxuICpcbiAqICAgQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW4gPSBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICBpZiAocGF5bG9hZC5hY3Rpb25UeXBlID09PSAnY291bnRyeS11cGRhdGUnKSB7XG4gKiAgICAgICAvLyBgQ291bnRyeVN0b3JlLmNvdW50cnlgIG1heSBub3QgYmUgdXBkYXRlZC5cbiAqICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ291bnRyeVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgIC8vIGBDb3VudHJ5U3RvcmUuY291bnRyeWAgaXMgbm93IGd1YXJhbnRlZWQgdG8gYmUgdXBkYXRlZC5cbiAqXG4gKiAgICAgICAvLyBTZWxlY3QgdGhlIGRlZmF1bHQgY2l0eSBmb3IgdGhlIG5ldyBjb3VudHJ5XG4gKiAgICAgICBDaXR5U3RvcmUuY2l0eSA9IGdldERlZmF1bHRDaXR5Rm9yQ291bnRyeShDb3VudHJ5U3RvcmUuY291bnRyeSk7XG4gKiAgICAgfVxuICogICB9KTtcbiAqXG4gKiBUaGUgdXNhZ2Ugb2YgYHdhaXRGb3IoKWAgY2FuIGJlIGNoYWluZWQsIGZvciBleGFtcGxlOlxuICpcbiAqICAgRmxpZ2h0UHJpY2VTdG9yZS5kaXNwYXRjaFRva2VuID1cbiAqICAgICBmbGlnaHREaXNwYXRjaGVyLnJlZ2lzdGVyKGZ1bmN0aW9uKHBheWxvYWQpIHtcbiAqICAgICAgIHN3aXRjaCAocGF5bG9hZC5hY3Rpb25UeXBlKSB7XG4gKiAgICAgICAgIGNhc2UgJ2NvdW50cnktdXBkYXRlJzpcbiAqICAgICAgICAgY2FzZSAnY2l0eS11cGRhdGUnOlxuICogICAgICAgICAgIGZsaWdodERpc3BhdGNoZXIud2FpdEZvcihbQ2l0eVN0b3JlLmRpc3BhdGNoVG9rZW5dKTtcbiAqICAgICAgICAgICBGbGlnaHRQcmljZVN0b3JlLnByaWNlID1cbiAqICAgICAgICAgICAgIGdldEZsaWdodFByaWNlU3RvcmUoQ291bnRyeVN0b3JlLmNvdW50cnksIENpdHlTdG9yZS5jaXR5KTtcbiAqICAgICAgICAgICBicmVhaztcbiAqICAgICB9XG4gKiAgIH0pO1xuICpcbiAqIFRoZSBgY291bnRyeS11cGRhdGVgIHBheWxvYWQgd2lsbCBiZSBndWFyYW50ZWVkIHRvIGludm9rZSB0aGUgc3RvcmVzJ1xuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MgaW4gb3JkZXI6IGBDb3VudHJ5U3RvcmVgLCBgQ2l0eVN0b3JlYCwgdGhlblxuICogYEZsaWdodFByaWNlU3RvcmVgLlxuICovXG5cbnZhciBEaXNwYXRjaGVyID0gKGZ1bmN0aW9uICgpIHtcbiAgZnVuY3Rpb24gRGlzcGF0Y2hlcigpIHtcbiAgICBfY2xhc3NDYWxsQ2hlY2sodGhpcywgRGlzcGF0Y2hlcik7XG5cbiAgICB0aGlzLl9jYWxsYmFja3MgPSB7fTtcbiAgICB0aGlzLl9pc0Rpc3BhdGNoaW5nID0gZmFsc2U7XG4gICAgdGhpcy5faXNIYW5kbGVkID0ge307XG4gICAgdGhpcy5faXNQZW5kaW5nID0ge307XG4gICAgdGhpcy5fbGFzdElEID0gMTtcbiAgfVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlcnMgYSBjYWxsYmFjayB0byBiZSBpbnZva2VkIHdpdGggZXZlcnkgZGlzcGF0Y2hlZCBwYXlsb2FkLiBSZXR1cm5zXG4gICAqIGEgdG9rZW4gdGhhdCBjYW4gYmUgdXNlZCB3aXRoIGB3YWl0Rm9yKClgLlxuICAgKi9cblxuICBEaXNwYXRjaGVyLnByb3RvdHlwZS5yZWdpc3RlciA9IGZ1bmN0aW9uIHJlZ2lzdGVyKGNhbGxiYWNrKSB7XG4gICAgdmFyIGlkID0gX3ByZWZpeCArIHRoaXMuX2xhc3RJRCsrO1xuICAgIHRoaXMuX2NhbGxiYWNrc1tpZF0gPSBjYWxsYmFjaztcbiAgICByZXR1cm4gaWQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFJlbW92ZXMgYSBjYWxsYmFjayBiYXNlZCBvbiBpdHMgdG9rZW4uXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLnVucmVnaXN0ZXIgPSBmdW5jdGlvbiB1bnJlZ2lzdGVyKGlkKSB7XG4gICAgIXRoaXMuX2NhbGxiYWNrc1tpZF0gPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci51bnJlZ2lzdGVyKC4uLik6IGAlc2AgZG9lcyBub3QgbWFwIHRvIGEgcmVnaXN0ZXJlZCBjYWxsYmFjay4nLCBpZCkgOiBpbnZhcmlhbnQoZmFsc2UpIDogdW5kZWZpbmVkO1xuICAgIGRlbGV0ZSB0aGlzLl9jYWxsYmFja3NbaWRdO1xuICB9O1xuXG4gIC8qKlxuICAgKiBXYWl0cyBmb3IgdGhlIGNhbGxiYWNrcyBzcGVjaWZpZWQgdG8gYmUgaW52b2tlZCBiZWZvcmUgY29udGludWluZyBleGVjdXRpb25cbiAgICogb2YgdGhlIGN1cnJlbnQgY2FsbGJhY2suIFRoaXMgbWV0aG9kIHNob3VsZCBvbmx5IGJlIHVzZWQgYnkgYSBjYWxsYmFjayBpblxuICAgKiByZXNwb25zZSB0byBhIGRpc3BhdGNoZWQgcGF5bG9hZC5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUud2FpdEZvciA9IGZ1bmN0aW9uIHdhaXRGb3IoaWRzKSB7XG4gICAgIXRoaXMuX2lzRGlzcGF0Y2hpbmcgPyBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nID8gaW52YXJpYW50KGZhbHNlLCAnRGlzcGF0Y2hlci53YWl0Rm9yKC4uLik6IE11c3QgYmUgaW52b2tlZCB3aGlsZSBkaXNwYXRjaGluZy4nKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgZm9yICh2YXIgaWkgPSAwOyBpaSA8IGlkcy5sZW5ndGg7IGlpKyspIHtcbiAgICAgIHZhciBpZCA9IGlkc1tpaV07XG4gICAgICBpZiAodGhpcy5faXNQZW5kaW5nW2lkXSkge1xuICAgICAgICAhdGhpcy5faXNIYW5kbGVkW2lkXSA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogQ2lyY3VsYXIgZGVwZW5kZW5jeSBkZXRlY3RlZCB3aGlsZSAnICsgJ3dhaXRpbmcgZm9yIGAlc2AuJywgaWQpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICAhdGhpcy5fY2FsbGJhY2tzW2lkXSA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaGVyLndhaXRGb3IoLi4uKTogYCVzYCBkb2VzIG5vdCBtYXAgdG8gYSByZWdpc3RlcmVkIGNhbGxiYWNrLicsIGlkKSA6IGludmFyaWFudChmYWxzZSkgOiB1bmRlZmluZWQ7XG4gICAgICB0aGlzLl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgfVxuICB9O1xuXG4gIC8qKlxuICAgKiBEaXNwYXRjaGVzIGEgcGF5bG9hZCB0byBhbGwgcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLmRpc3BhdGNoID0gZnVuY3Rpb24gZGlzcGF0Y2gocGF5bG9hZCkge1xuICAgICEhdGhpcy5faXNEaXNwYXRjaGluZyA/IHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicgPyBpbnZhcmlhbnQoZmFsc2UsICdEaXNwYXRjaC5kaXNwYXRjaCguLi4pOiBDYW5ub3QgZGlzcGF0Y2ggaW4gdGhlIG1pZGRsZSBvZiBhIGRpc3BhdGNoLicpIDogaW52YXJpYW50KGZhbHNlKSA6IHVuZGVmaW5lZDtcbiAgICB0aGlzLl9zdGFydERpc3BhdGNoaW5nKHBheWxvYWQpO1xuICAgIHRyeSB7XG4gICAgICBmb3IgKHZhciBpZCBpbiB0aGlzLl9jYWxsYmFja3MpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzUGVuZGluZ1tpZF0pIHtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLl9pbnZva2VDYWxsYmFjayhpZCk7XG4gICAgICB9XG4gICAgfSBmaW5hbGx5IHtcbiAgICAgIHRoaXMuX3N0b3BEaXNwYXRjaGluZygpO1xuICAgIH1cbiAgfTtcblxuICAvKipcbiAgICogSXMgdGhpcyBEaXNwYXRjaGVyIGN1cnJlbnRseSBkaXNwYXRjaGluZy5cbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuaXNEaXNwYXRjaGluZyA9IGZ1bmN0aW9uIGlzRGlzcGF0Y2hpbmcoKSB7XG4gICAgcmV0dXJuIHRoaXMuX2lzRGlzcGF0Y2hpbmc7XG4gIH07XG5cbiAgLyoqXG4gICAqIENhbGwgdGhlIGNhbGxiYWNrIHN0b3JlZCB3aXRoIHRoZSBnaXZlbiBpZC4gQWxzbyBkbyBzb21lIGludGVybmFsXG4gICAqIGJvb2trZWVwaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuX2ludm9rZUNhbGxiYWNrID0gZnVuY3Rpb24gX2ludm9rZUNhbGxiYWNrKGlkKSB7XG4gICAgdGhpcy5faXNQZW5kaW5nW2lkXSA9IHRydWU7XG4gICAgdGhpcy5fY2FsbGJhY2tzW2lkXSh0aGlzLl9wZW5kaW5nUGF5bG9hZCk7XG4gICAgdGhpcy5faXNIYW5kbGVkW2lkXSA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIFNldCB1cCBib29ra2VlcGluZyBuZWVkZWQgd2hlbiBkaXNwYXRjaGluZy5cbiAgICpcbiAgICogQGludGVybmFsXG4gICAqL1xuXG4gIERpc3BhdGNoZXIucHJvdG90eXBlLl9zdGFydERpc3BhdGNoaW5nID0gZnVuY3Rpb24gX3N0YXJ0RGlzcGF0Y2hpbmcocGF5bG9hZCkge1xuICAgIGZvciAodmFyIGlkIGluIHRoaXMuX2NhbGxiYWNrcykge1xuICAgICAgdGhpcy5faXNQZW5kaW5nW2lkXSA9IGZhbHNlO1xuICAgICAgdGhpcy5faXNIYW5kbGVkW2lkXSA9IGZhbHNlO1xuICAgIH1cbiAgICB0aGlzLl9wZW5kaW5nUGF5bG9hZCA9IHBheWxvYWQ7XG4gICAgdGhpcy5faXNEaXNwYXRjaGluZyA9IHRydWU7XG4gIH07XG5cbiAgLyoqXG4gICAqIENsZWFyIGJvb2trZWVwaW5nIHVzZWQgZm9yIGRpc3BhdGNoaW5nLlxuICAgKlxuICAgKiBAaW50ZXJuYWxcbiAgICovXG5cbiAgRGlzcGF0Y2hlci5wcm90b3R5cGUuX3N0b3BEaXNwYXRjaGluZyA9IGZ1bmN0aW9uIF9zdG9wRGlzcGF0Y2hpbmcoKSB7XG4gICAgZGVsZXRlIHRoaXMuX3BlbmRpbmdQYXlsb2FkO1xuICAgIHRoaXMuX2lzRGlzcGF0Y2hpbmcgPSBmYWxzZTtcbiAgfTtcblxuICByZXR1cm4gRGlzcGF0Y2hlcjtcbn0pKCk7XG5cbm1vZHVsZS5leHBvcnRzID0gRGlzcGF0Y2hlcjtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OW1iSFY0TDJ4cFlpOUVhWE53WVhSamFHVnlMbXB6SWwwc0ltNWhiV1Z6SWpwYlhTd2liV0Z3Y0dsdVozTWlPaUk3UVVGQlFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFaUxDSm1hV3hsSWpvaVoyVnVaWEpoZEdWa0xtcHpJaXdpYzI5MWNtTmxVbTl2ZENJNklpSXNJbk52ZFhKalpYTkRiMjUwWlc1MElqcGJJaThxS2x4dUlDb2dRMjl3ZVhKcFoyaDBJQ2hqS1NBeU1ERTBMVEl3TVRVc0lFWmhZMlZpYjI5ckxDQkpibU11WEc0Z0tpQkJiR3dnY21sbmFIUnpJSEpsYzJWeWRtVmtMbHh1SUNwY2JpQXFJRlJvYVhNZ2MyOTFjbU5sSUdOdlpHVWdhWE1nYkdsalpXNXpaV1FnZFc1a1pYSWdkR2hsSUVKVFJDMXpkSGxzWlNCc2FXTmxibk5sSUdadmRXNWtJR2x1SUhSb1pWeHVJQ29nVEVsRFJVNVRSU0JtYVd4bElHbHVJSFJvWlNCeWIyOTBJR1JwY21WamRHOXllU0J2WmlCMGFHbHpJSE52ZFhKalpTQjBjbVZsTGlCQmJpQmhaR1JwZEdsdmJtRnNJR2R5WVc1MFhHNGdLaUJ2WmlCd1lYUmxiblFnY21sbmFIUnpJR05oYmlCaVpTQm1iM1Z1WkNCcGJpQjBhR1VnVUVGVVJVNVVVeUJtYVd4bElHbHVJSFJvWlNCellXMWxJR1JwY21WamRHOXllUzVjYmlBcVhHNGdLaUJBY0hKdmRtbGtaWE5OYjJSMWJHVWdSR2x6Y0dGMFkyaGxjbHh1SUNvZ1hHNGdLaUJBY0hKbGRtVnVkRTExYm1kbFhHNGdLaTljYmx4dUozVnpaU0J6ZEhKcFkzUW5PMXh1WEc1bGVIQnZjblJ6TGw5ZlpYTk5iMlIxYkdVZ1BTQjBjblZsTzF4dVhHNW1kVzVqZEdsdmJpQmZZMnhoYzNORFlXeHNRMmhsWTJzb2FXNXpkR0Z1WTJVc0lFTnZibk4wY25WamRHOXlLU0I3SUdsbUlDZ2hLR2x1YzNSaGJtTmxJR2x1YzNSaGJtTmxiMllnUTI5dWMzUnlkV04wYjNJcEtTQjdJSFJvY205M0lHNWxkeUJVZVhCbFJYSnliM0lvSjBOaGJtNXZkQ0JqWVd4c0lHRWdZMnhoYzNNZ1lYTWdZU0JtZFc1amRHbHZiaWNwT3lCOUlIMWNibHh1ZG1GeUlHbHVkbUZ5YVdGdWRDQTlJSEpsY1hWcGNtVW9KMlppYW5NdmJHbGlMMmx1ZG1GeWFXRnVkQ2NwTzF4dVhHNTJZWElnWDNCeVpXWnBlQ0E5SUNkSlJGOG5PMXh1WEc0dktpcGNiaUFxSUVScGMzQmhkR05vWlhJZ2FYTWdkWE5sWkNCMGJ5QmljbTloWkdOaGMzUWdjR0Y1Ykc5aFpITWdkRzhnY21WbmFYTjBaWEpsWkNCallXeHNZbUZqYTNNdUlGUm9hWE1nYVhOY2JpQXFJR1JwWm1abGNtVnVkQ0JtY205dElHZGxibVZ5YVdNZ2NIVmlMWE4xWWlCemVYTjBaVzF6SUdsdUlIUjNieUIzWVhsek9seHVJQ3BjYmlBcUlDQWdNU2tnUTJGc2JHSmhZMnR6SUdGeVpTQnViM1FnYzNWaWMyTnlhV0psWkNCMGJ5QndZWEowYVdOMWJHRnlJR1YyWlc1MGN5NGdSWFpsY25rZ2NHRjViRzloWkNCcGMxeHVJQ29nSUNBZ0lDQmthWE53WVhSamFHVmtJSFJ2SUdWMlpYSjVJSEpsWjJsemRHVnlaV1FnWTJGc2JHSmhZMnN1WEc0Z0tpQWdJRElwSUVOaGJHeGlZV05yY3lCallXNGdZbVVnWkdWbVpYSnlaV1FnYVc0Z2QyaHZiR1VnYjNJZ2NHRnlkQ0IxYm5ScGJDQnZkR2hsY2lCallXeHNZbUZqYTNNZ2FHRjJaVnh1SUNvZ0lDQWdJQ0JpWldWdUlHVjRaV04xZEdWa0xseHVJQ3BjYmlBcUlFWnZjaUJsZUdGdGNHeGxMQ0JqYjI1emFXUmxjaUIwYUdseklHaDVjRzkwYUdWMGFXTmhiQ0JtYkdsbmFIUWdaR1Z6ZEdsdVlYUnBiMjRnWm05eWJTd2dkMmhwWTJoY2JpQXFJSE5sYkdWamRITWdZU0JrWldaaGRXeDBJR05wZEhrZ2QyaGxiaUJoSUdOdmRXNTBjbmtnYVhNZ2MyVnNaV04wWldRNlhHNGdLbHh1SUNvZ0lDQjJZWElnWm14cFoyaDBSR2x6Y0dGMFkyaGxjaUE5SUc1bGR5QkVhWE53WVhSamFHVnlLQ2s3WEc0Z0tseHVJQ29nSUNBdkx5QkxaV1Z3Y3lCMGNtRmpheUJ2WmlCM2FHbGphQ0JqYjNWdWRISjVJR2x6SUhObGJHVmpkR1ZrWEc0Z0tpQWdJSFpoY2lCRGIzVnVkSEo1VTNSdmNtVWdQU0I3WTI5MWJuUnllVG9nYm5Wc2JIMDdYRzRnS2x4dUlDb2dJQ0F2THlCTFpXVndjeUIwY21GamF5QnZaaUIzYUdsamFDQmphWFI1SUdseklITmxiR1ZqZEdWa1hHNGdLaUFnSUhaaGNpQkRhWFI1VTNSdmNtVWdQU0I3WTJsMGVUb2diblZzYkgwN1hHNGdLbHh1SUNvZ0lDQXZMeUJMWldWd2N5QjBjbUZqYXlCdlppQjBhR1VnWW1GelpTQm1iR2xuYUhRZ2NISnBZMlVnYjJZZ2RHaGxJSE5sYkdWamRHVmtJR05wZEhsY2JpQXFJQ0FnZG1GeUlFWnNhV2RvZEZCeWFXTmxVM1J2Y21VZ1BTQjdjSEpwWTJVNklHNTFiR3g5WEc0Z0tseHVJQ29nVjJobGJpQmhJSFZ6WlhJZ1kyaGhibWRsY3lCMGFHVWdjMlZzWldOMFpXUWdZMmwwZVN3Z2QyVWdaR2x6Y0dGMFkyZ2dkR2hsSUhCaGVXeHZZV1E2WEc0Z0tseHVJQ29nSUNCbWJHbG5hSFJFYVhOd1lYUmphR1Z5TG1ScGMzQmhkR05vS0h0Y2JpQXFJQ0FnSUNCaFkzUnBiMjVVZVhCbE9pQW5ZMmwwZVMxMWNHUmhkR1VuTEZ4dUlDb2dJQ0FnSUhObGJHVmpkR1ZrUTJsMGVUb2dKM0JoY21sekoxeHVJQ29nSUNCOUtUdGNiaUFxWEc0Z0tpQlVhR2x6SUhCaGVXeHZZV1FnYVhNZ1pHbG5aWE4wWldRZ1lua2dZRU5wZEhsVGRHOXlaV0E2WEc0Z0tseHVJQ29nSUNCbWJHbG5hSFJFYVhOd1lYUmphR1Z5TG5KbFoybHpkR1Z5S0daMWJtTjBhVzl1S0hCaGVXeHZZV1FwSUh0Y2JpQXFJQ0FnSUNCcFppQW9jR0Y1Ykc5aFpDNWhZM1JwYjI1VWVYQmxJRDA5UFNBblkybDBlUzExY0dSaGRHVW5LU0I3WEc0Z0tpQWdJQ0FnSUNCRGFYUjVVM1J2Y21VdVkybDBlU0E5SUhCaGVXeHZZV1F1YzJWc1pXTjBaV1JEYVhSNU8xeHVJQ29nSUNBZ0lIMWNiaUFxSUNBZ2ZTazdYRzRnS2x4dUlDb2dWMmhsYmlCMGFHVWdkWE5sY2lCelpXeGxZM1J6SUdFZ1kyOTFiblJ5ZVN3Z2QyVWdaR2x6Y0dGMFkyZ2dkR2hsSUhCaGVXeHZZV1E2WEc0Z0tseHVJQ29nSUNCbWJHbG5hSFJFYVhOd1lYUmphR1Z5TG1ScGMzQmhkR05vS0h0Y2JpQXFJQ0FnSUNCaFkzUnBiMjVVZVhCbE9pQW5ZMjkxYm5SeWVTMTFjR1JoZEdVbkxGeHVJQ29nSUNBZ0lITmxiR1ZqZEdWa1EyOTFiblJ5ZVRvZ0oyRjFjM1J5WVd4cFlTZGNiaUFxSUNBZ2ZTazdYRzRnS2x4dUlDb2dWR2hwY3lCd1lYbHNiMkZrSUdseklHUnBaMlZ6ZEdWa0lHSjVJR0p2ZEdnZ2MzUnZjbVZ6T2x4dUlDcGNiaUFxSUNBZ1EyOTFiblJ5ZVZOMGIzSmxMbVJwYzNCaGRHTm9WRzlyWlc0Z1BTQm1iR2xuYUhSRWFYTndZWFJqYUdWeUxuSmxaMmx6ZEdWeUtHWjFibU4wYVc5dUtIQmhlV3h2WVdRcElIdGNiaUFxSUNBZ0lDQnBaaUFvY0dGNWJHOWhaQzVoWTNScGIyNVVlWEJsSUQwOVBTQW5ZMjkxYm5SeWVTMTFjR1JoZEdVbktTQjdYRzRnS2lBZ0lDQWdJQ0JEYjNWdWRISjVVM1J2Y21VdVkyOTFiblJ5ZVNBOUlIQmhlV3h2WVdRdWMyVnNaV04wWldSRGIzVnVkSEo1TzF4dUlDb2dJQ0FnSUgxY2JpQXFJQ0FnZlNrN1hHNGdLbHh1SUNvZ1YyaGxiaUIwYUdVZ1kyRnNiR0poWTJzZ2RHOGdkWEJrWVhSbElHQkRiM1Z1ZEhKNVUzUnZjbVZnSUdseklISmxaMmx6ZEdWeVpXUXNJSGRsSUhOaGRtVWdZU0J5WldabGNtVnVZMlZjYmlBcUlIUnZJSFJvWlNCeVpYUjFjbTVsWkNCMGIydGxiaTRnVlhOcGJtY2dkR2hwY3lCMGIydGxiaUIzYVhSb0lHQjNZV2wwUm05eUtDbGdMQ0IzWlNCallXNGdaM1ZoY21GdWRHVmxYRzRnS2lCMGFHRjBJR0JEYjNWdWRISjVVM1J2Y21WZ0lHbHpJSFZ3WkdGMFpXUWdZbVZtYjNKbElIUm9aU0JqWVd4c1ltRmpheUIwYUdGMElIVndaR0YwWlhNZ1lFTnBkSGxUZEc5eVpXQmNiaUFxSUc1bFpXUnpJSFJ2SUhGMVpYSjVJR2wwY3lCa1lYUmhMbHh1SUNwY2JpQXFJQ0FnUTJsMGVWTjBiM0psTG1ScGMzQmhkR05vVkc5clpXNGdQU0JtYkdsbmFIUkVhWE53WVhSamFHVnlMbkpsWjJsemRHVnlLR1oxYm1OMGFXOXVLSEJoZVd4dllXUXBJSHRjYmlBcUlDQWdJQ0JwWmlBb2NHRjViRzloWkM1aFkzUnBiMjVVZVhCbElEMDlQU0FuWTI5MWJuUnllUzExY0dSaGRHVW5LU0I3WEc0Z0tpQWdJQ0FnSUNBdkx5QmdRMjkxYm5SeWVWTjBiM0psTG1OdmRXNTBjbmxnSUcxaGVTQnViM1FnWW1VZ2RYQmtZWFJsWkM1Y2JpQXFJQ0FnSUNBZ0lHWnNhV2RvZEVScGMzQmhkR05vWlhJdWQyRnBkRVp2Y2loYlEyOTFiblJ5ZVZOMGIzSmxMbVJwYzNCaGRHTm9WRzlyWlc1ZEtUdGNiaUFxSUNBZ0lDQWdJQzh2SUdCRGIzVnVkSEo1VTNSdmNtVXVZMjkxYm5SeWVXQWdhWE1nYm05M0lHZDFZWEpoYm5SbFpXUWdkRzhnWW1VZ2RYQmtZWFJsWkM1Y2JpQXFYRzRnS2lBZ0lDQWdJQ0F2THlCVFpXeGxZM1FnZEdobElHUmxabUYxYkhRZ1kybDBlU0JtYjNJZ2RHaGxJRzVsZHlCamIzVnVkSEo1WEc0Z0tpQWdJQ0FnSUNCRGFYUjVVM1J2Y21VdVkybDBlU0E5SUdkbGRFUmxabUYxYkhSRGFYUjVSbTl5UTI5MWJuUnllU2hEYjNWdWRISjVVM1J2Y21VdVkyOTFiblJ5ZVNrN1hHNGdLaUFnSUNBZ2ZWeHVJQ29nSUNCOUtUdGNiaUFxWEc0Z0tpQlVhR1VnZFhOaFoyVWdiMllnWUhkaGFYUkdiM0lvS1dBZ1kyRnVJR0psSUdOb1lXbHVaV1FzSUdadmNpQmxlR0Z0Y0d4bE9seHVJQ3BjYmlBcUlDQWdSbXhwWjJoMFVISnBZMlZUZEc5eVpTNWthWE53WVhSamFGUnZhMlZ1SUQxY2JpQXFJQ0FnSUNCbWJHbG5hSFJFYVhOd1lYUmphR1Z5TG5KbFoybHpkR1Z5S0daMWJtTjBhVzl1S0hCaGVXeHZZV1FwSUh0Y2JpQXFJQ0FnSUNBZ0lITjNhWFJqYUNBb2NHRjViRzloWkM1aFkzUnBiMjVVZVhCbEtTQjdYRzRnS2lBZ0lDQWdJQ0FnSUdOaGMyVWdKMk52ZFc1MGNua3RkWEJrWVhSbEp6cGNiaUFxSUNBZ0lDQWdJQ0FnWTJGelpTQW5ZMmwwZVMxMWNHUmhkR1VuT2x4dUlDb2dJQ0FnSUNBZ0lDQWdJR1pzYVdkb2RFUnBjM0JoZEdOb1pYSXVkMkZwZEVadmNpaGJRMmwwZVZOMGIzSmxMbVJwYzNCaGRHTm9WRzlyWlc1ZEtUdGNiaUFxSUNBZ0lDQWdJQ0FnSUNCR2JHbG5hSFJRY21salpWTjBiM0psTG5CeWFXTmxJRDFjYmlBcUlDQWdJQ0FnSUNBZ0lDQWdJR2RsZEVac2FXZG9kRkJ5YVdObFUzUnZjbVVvUTI5MWJuUnllVk4wYjNKbExtTnZkVzUwY25rc0lFTnBkSGxUZEc5eVpTNWphWFI1S1R0Y2JpQXFJQ0FnSUNBZ0lDQWdJQ0JpY21WaGF6dGNiaUFxSUNBZ0lDQjlYRzRnS2lBZ0lIMHBPMXh1SUNwY2JpQXFJRlJvWlNCZ1kyOTFiblJ5ZVMxMWNHUmhkR1ZnSUhCaGVXeHZZV1FnZDJsc2JDQmlaU0JuZFdGeVlXNTBaV1ZrSUhSdklHbHVkbTlyWlNCMGFHVWdjM1J2Y21WekoxeHVJQ29nY21WbmFYTjBaWEpsWkNCallXeHNZbUZqYTNNZ2FXNGdiM0prWlhJNklHQkRiM1Z1ZEhKNVUzUnZjbVZnTENCZ1EybDBlVk4wYjNKbFlDd2dkR2hsYmx4dUlDb2dZRVpzYVdkb2RGQnlhV05sVTNSdmNtVmdMbHh1SUNvdlhHNWNiblpoY2lCRWFYTndZWFJqYUdWeUlEMGdLR1oxYm1OMGFXOXVJQ2dwSUh0Y2JpQWdablZ1WTNScGIyNGdSR2x6Y0dGMFkyaGxjaWdwSUh0Y2JpQWdJQ0JmWTJ4aGMzTkRZV3hzUTJobFkyc29kR2hwY3l3Z1JHbHpjR0YwWTJobGNpazdYRzVjYmlBZ0lDQjBhR2x6TGw5allXeHNZbUZqYTNNZ1BTQjdmVHRjYmlBZ0lDQjBhR2x6TGw5cGMwUnBjM0JoZEdOb2FXNW5JRDBnWm1Gc2MyVTdYRzRnSUNBZ2RHaHBjeTVmYVhOSVlXNWtiR1ZrSUQwZ2UzMDdYRzRnSUNBZ2RHaHBjeTVmYVhOUVpXNWthVzVuSUQwZ2UzMDdYRzRnSUNBZ2RHaHBjeTVmYkdGemRFbEVJRDBnTVR0Y2JpQWdmVnh1WEc0Z0lDOHFLbHh1SUNBZ0tpQlNaV2RwYzNSbGNuTWdZU0JqWVd4c1ltRmpheUIwYnlCaVpTQnBiblp2YTJWa0lIZHBkR2dnWlhabGNua2daR2x6Y0dGMFkyaGxaQ0J3WVhsc2IyRmtMaUJTWlhSMWNtNXpYRzRnSUNBcUlHRWdkRzlyWlc0Z2RHaGhkQ0JqWVc0Z1ltVWdkWE5sWkNCM2FYUm9JR0IzWVdsMFJtOXlLQ2xnTGx4dUlDQWdLaTljYmx4dUlDQkVhWE53WVhSamFHVnlMbkJ5YjNSdmRIbHdaUzV5WldkcGMzUmxjaUE5SUdaMWJtTjBhVzl1SUhKbFoybHpkR1Z5S0dOaGJHeGlZV05yS1NCN1hHNGdJQ0FnZG1GeUlHbGtJRDBnWDNCeVpXWnBlQ0FySUhSb2FYTXVYMnhoYzNSSlJDc3JPMXh1SUNBZ0lIUm9hWE11WDJOaGJHeGlZV05yYzF0cFpGMGdQU0JqWVd4c1ltRmphenRjYmlBZ0lDQnlaWFIxY200Z2FXUTdYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUZKbGJXOTJaWE1nWVNCallXeHNZbUZqYXlCaVlYTmxaQ0J2YmlCcGRITWdkRzlyWlc0dVhHNGdJQ0FxTDF4dVhHNGdJRVJwYzNCaGRHTm9aWEl1Y0hKdmRHOTBlWEJsTG5WdWNtVm5hWE4wWlhJZ1BTQm1kVzVqZEdsdmJpQjFibkpsWjJsemRHVnlLR2xrS1NCN1hHNGdJQ0FnSVhSb2FYTXVYMk5oYkd4aVlXTnJjMXRwWkYwZ1B5QndjbTlqWlhOekxtVnVkaTVPVDBSRlgwVk9WaUFoUFQwZ0ozQnliMlIxWTNScGIyNG5JRDhnYVc1MllYSnBZVzUwS0daaGJITmxMQ0FuUkdsemNHRjBZMmhsY2k1MWJuSmxaMmx6ZEdWeUtDNHVMaWs2SUdBbGMyQWdaRzlsY3lCdWIzUWdiV0Z3SUhSdklHRWdjbVZuYVhOMFpYSmxaQ0JqWVd4c1ltRmpheTRuTENCcFpDa2dPaUJwYm5aaGNtbGhiblFvWm1Gc2MyVXBJRG9nZFc1a1pXWnBibVZrTzF4dUlDQWdJR1JsYkdWMFpTQjBhR2x6TGw5allXeHNZbUZqYTNOYmFXUmRPMXh1SUNCOU8xeHVYRzRnSUM4cUtseHVJQ0FnS2lCWFlXbDBjeUJtYjNJZ2RHaGxJR05oYkd4aVlXTnJjeUJ6Y0dWamFXWnBaV1FnZEc4Z1ltVWdhVzUyYjJ0bFpDQmlaV1p2Y21VZ1kyOXVkR2x1ZFdsdVp5QmxlR1ZqZFhScGIyNWNiaUFnSUNvZ2IyWWdkR2hsSUdOMWNuSmxiblFnWTJGc2JHSmhZMnN1SUZSb2FYTWdiV1YwYUc5a0lITm9iM1ZzWkNCdmJteDVJR0psSUhWelpXUWdZbmtnWVNCallXeHNZbUZqYXlCcGJseHVJQ0FnS2lCeVpYTndiMjV6WlNCMGJ5QmhJR1JwYzNCaGRHTm9aV1FnY0dGNWJHOWhaQzVjYmlBZ0lDb3ZYRzVjYmlBZ1JHbHpjR0YwWTJobGNpNXdjbTkwYjNSNWNHVXVkMkZwZEVadmNpQTlJR1oxYm1OMGFXOXVJSGRoYVhSR2IzSW9hV1J6S1NCN1hHNGdJQ0FnSVhSb2FYTXVYMmx6UkdsemNHRjBZMmhwYm1jZ1B5QndjbTlqWlhOekxtVnVkaTVPVDBSRlgwVk9WaUFoUFQwZ0ozQnliMlIxWTNScGIyNG5JRDhnYVc1MllYSnBZVzUwS0daaGJITmxMQ0FuUkdsemNHRjBZMmhsY2k1M1lXbDBSbTl5S0M0dUxpazZJRTExYzNRZ1ltVWdhVzUyYjJ0bFpDQjNhR2xzWlNCa2FYTndZWFJqYUdsdVp5NG5LU0E2SUdsdWRtRnlhV0Z1ZENobVlXeHpaU2tnT2lCMWJtUmxabWx1WldRN1hHNGdJQ0FnWm05eUlDaDJZWElnYVdrZ1BTQXdPeUJwYVNBOElHbGtjeTVzWlc1bmRHZzdJR2xwS3lzcElIdGNiaUFnSUNBZ0lIWmhjaUJwWkNBOUlHbGtjMXRwYVYwN1hHNGdJQ0FnSUNCcFppQW9kR2hwY3k1ZmFYTlFaVzVrYVc1blcybGtYU2tnZTF4dUlDQWdJQ0FnSUNBaGRHaHBjeTVmYVhOSVlXNWtiR1ZrVzJsa1hTQS9JSEJ5YjJObGMzTXVaVzUyTGs1UFJFVmZSVTVXSUNFOVBTQW5jSEp2WkhWamRHbHZiaWNnUHlCcGJuWmhjbWxoYm5Rb1ptRnNjMlVzSUNkRWFYTndZWFJqYUdWeUxuZGhhWFJHYjNJb0xpNHVLVG9nUTJseVkzVnNZWElnWkdWd1pXNWtaVzVqZVNCa1pYUmxZM1JsWkNCM2FHbHNaU0FuSUNzZ0ozZGhhWFJwYm1jZ1ptOXlJR0FsYzJBdUp5d2dhV1FwSURvZ2FXNTJZWEpwWVc1MEtHWmhiSE5sS1NBNklIVnVaR1ZtYVc1bFpEdGNiaUFnSUNBZ0lDQWdZMjl1ZEdsdWRXVTdYRzRnSUNBZ0lDQjlYRzRnSUNBZ0lDQWhkR2hwY3k1ZlkyRnNiR0poWTJ0elcybGtYU0EvSUhCeWIyTmxjM011Wlc1MkxrNVBSRVZmUlU1V0lDRTlQU0FuY0hKdlpIVmpkR2x2YmljZ1B5QnBiblpoY21saGJuUW9abUZzYzJVc0lDZEVhWE53WVhSamFHVnlMbmRoYVhSR2IzSW9MaTR1S1RvZ1lDVnpZQ0JrYjJWeklHNXZkQ0J0WVhBZ2RHOGdZU0J5WldkcGMzUmxjbVZrSUdOaGJHeGlZV05yTGljc0lHbGtLU0E2SUdsdWRtRnlhV0Z1ZENobVlXeHpaU2tnT2lCMWJtUmxabWx1WldRN1hHNGdJQ0FnSUNCMGFHbHpMbDlwYm5admEyVkRZV3hzWW1GamF5aHBaQ2s3WEc0Z0lDQWdmVnh1SUNCOU8xeHVYRzRnSUM4cUtseHVJQ0FnS2lCRWFYTndZWFJqYUdWeklHRWdjR0Y1Ykc5aFpDQjBieUJoYkd3Z2NtVm5hWE4wWlhKbFpDQmpZV3hzWW1GamEzTXVYRzRnSUNBcUwxeHVYRzRnSUVScGMzQmhkR05vWlhJdWNISnZkRzkwZVhCbExtUnBjM0JoZEdOb0lEMGdablZ1WTNScGIyNGdaR2x6Y0dGMFkyZ29jR0Y1Ykc5aFpDa2dlMXh1SUNBZ0lDRWhkR2hwY3k1ZmFYTkVhWE53WVhSamFHbHVaeUEvSUhCeWIyTmxjM011Wlc1MkxrNVBSRVZmUlU1V0lDRTlQU0FuY0hKdlpIVmpkR2x2YmljZ1B5QnBiblpoY21saGJuUW9abUZzYzJVc0lDZEVhWE53WVhSamFDNWthWE53WVhSamFDZ3VMaTRwT2lCRFlXNXViM1FnWkdsemNHRjBZMmdnYVc0Z2RHaGxJRzFwWkdSc1pTQnZaaUJoSUdScGMzQmhkR05vTGljcElEb2dhVzUyWVhKcFlXNTBLR1poYkhObEtTQTZJSFZ1WkdWbWFXNWxaRHRjYmlBZ0lDQjBhR2x6TGw5emRHRnlkRVJwYzNCaGRHTm9hVzVuS0hCaGVXeHZZV1FwTzF4dUlDQWdJSFJ5ZVNCN1hHNGdJQ0FnSUNCbWIzSWdLSFpoY2lCcFpDQnBiaUIwYUdsekxsOWpZV3hzWW1GamEzTXBJSHRjYmlBZ0lDQWdJQ0FnYVdZZ0tIUm9hWE11WDJselVHVnVaR2x1WjF0cFpGMHBJSHRjYmlBZ0lDQWdJQ0FnSUNCamIyNTBhVzUxWlR0Y2JpQWdJQ0FnSUNBZ2ZWeHVJQ0FnSUNBZ0lDQjBhR2x6TGw5cGJuWnZhMlZEWVd4c1ltRmpheWhwWkNrN1hHNGdJQ0FnSUNCOVhHNGdJQ0FnZlNCbWFXNWhiR3g1SUh0Y2JpQWdJQ0FnSUhSb2FYTXVYM04wYjNCRWFYTndZWFJqYUdsdVp5Z3BPMXh1SUNBZ0lIMWNiaUFnZlR0Y2JseHVJQ0F2S2lwY2JpQWdJQ29nU1hNZ2RHaHBjeUJFYVhOd1lYUmphR1Z5SUdOMWNuSmxiblJzZVNCa2FYTndZWFJqYUdsdVp5NWNiaUFnSUNvdlhHNWNiaUFnUkdsemNHRjBZMmhsY2k1d2NtOTBiM1I1Y0dVdWFYTkVhWE53WVhSamFHbHVaeUE5SUdaMWJtTjBhVzl1SUdselJHbHpjR0YwWTJocGJtY29LU0I3WEc0Z0lDQWdjbVYwZFhKdUlIUm9hWE11WDJselJHbHpjR0YwWTJocGJtYzdYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUVOaGJHd2dkR2hsSUdOaGJHeGlZV05ySUhOMGIzSmxaQ0IzYVhSb0lIUm9aU0JuYVhabGJpQnBaQzRnUVd4emJ5QmtieUJ6YjIxbElHbHVkR1Z5Ym1Gc1hHNGdJQ0FxSUdKdmIydHJaV1Z3YVc1bkxseHVJQ0FnS2x4dUlDQWdLaUJBYVc1MFpYSnVZV3hjYmlBZ0lDb3ZYRzVjYmlBZ1JHbHpjR0YwWTJobGNpNXdjbTkwYjNSNWNHVXVYMmx1ZG05clpVTmhiR3hpWVdOcklEMGdablZ1WTNScGIyNGdYMmx1ZG05clpVTmhiR3hpWVdOcktHbGtLU0I3WEc0Z0lDQWdkR2hwY3k1ZmFYTlFaVzVrYVc1blcybGtYU0E5SUhSeWRXVTdYRzRnSUNBZ2RHaHBjeTVmWTJGc2JHSmhZMnR6VzJsa1hTaDBhR2x6TGw5d1pXNWthVzVuVUdGNWJHOWhaQ2s3WEc0Z0lDQWdkR2hwY3k1ZmFYTklZVzVrYkdWa1cybGtYU0E5SUhSeWRXVTdYRzRnSUgwN1hHNWNiaUFnTHlvcVhHNGdJQ0FxSUZObGRDQjFjQ0JpYjI5cmEyVmxjR2x1WnlCdVpXVmtaV1FnZDJobGJpQmthWE53WVhSamFHbHVaeTVjYmlBZ0lDcGNiaUFnSUNvZ1FHbHVkR1Z5Ym1Gc1hHNGdJQ0FxTDF4dVhHNGdJRVJwYzNCaGRHTm9aWEl1Y0hKdmRHOTBlWEJsTGw5emRHRnlkRVJwYzNCaGRHTm9hVzVuSUQwZ1puVnVZM1JwYjI0Z1gzTjBZWEowUkdsemNHRjBZMmhwYm1jb2NHRjViRzloWkNrZ2UxeHVJQ0FnSUdadmNpQW9kbUZ5SUdsa0lHbHVJSFJvYVhNdVgyTmhiR3hpWVdOcmN5a2dlMXh1SUNBZ0lDQWdkR2hwY3k1ZmFYTlFaVzVrYVc1blcybGtYU0E5SUdaaGJITmxPMXh1SUNBZ0lDQWdkR2hwY3k1ZmFYTklZVzVrYkdWa1cybGtYU0E5SUdaaGJITmxPMXh1SUNBZ0lIMWNiaUFnSUNCMGFHbHpMbDl3Wlc1a2FXNW5VR0Y1Ykc5aFpDQTlJSEJoZVd4dllXUTdYRzRnSUNBZ2RHaHBjeTVmYVhORWFYTndZWFJqYUdsdVp5QTlJSFJ5ZFdVN1hHNGdJSDA3WEc1Y2JpQWdMeW9xWEc0Z0lDQXFJRU5zWldGeUlHSnZiMnRyWldWd2FXNW5JSFZ6WldRZ1ptOXlJR1JwYzNCaGRHTm9hVzVuTGx4dUlDQWdLbHh1SUNBZ0tpQkFhVzUwWlhKdVlXeGNiaUFnSUNvdlhHNWNiaUFnUkdsemNHRjBZMmhsY2k1d2NtOTBiM1I1Y0dVdVgzTjBiM0JFYVhOd1lYUmphR2x1WnlBOUlHWjFibU4wYVc5dUlGOXpkRzl3UkdsemNHRjBZMmhwYm1jb0tTQjdYRzRnSUNBZ1pHVnNaWFJsSUhSb2FYTXVYM0JsYm1ScGJtZFFZWGxzYjJGa08xeHVJQ0FnSUhSb2FYTXVYMmx6UkdsemNHRjBZMmhwYm1jZ1BTQm1ZV3h6WlR0Y2JpQWdmVHRjYmx4dUlDQnlaWFIxY200Z1JHbHpjR0YwWTJobGNqdGNibjBwS0NrN1hHNWNibTF2WkhWc1pTNWxlSEJ2Y25SeklEMGdSR2x6Y0dGMFkyaGxjanNpWFgwPSIsIihmdW5jdGlvbiAocHJvY2Vzcyl7XG4vKipcbiAqIENvcHlyaWdodCAyMDEzLTIwMTUsIEZhY2Vib29rLCBJbmMuXG4gKiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIFRoaXMgc291cmNlIGNvZGUgaXMgbGljZW5zZWQgdW5kZXIgdGhlIEJTRC1zdHlsZSBsaWNlbnNlIGZvdW5kIGluIHRoZVxuICogTElDRU5TRSBmaWxlIGluIHRoZSByb290IGRpcmVjdG9yeSBvZiB0aGlzIHNvdXJjZSB0cmVlLiBBbiBhZGRpdGlvbmFsIGdyYW50XG4gKiBvZiBwYXRlbnQgcmlnaHRzIGNhbiBiZSBmb3VuZCBpbiB0aGUgUEFURU5UUyBmaWxlIGluIHRoZSBzYW1lIGRpcmVjdG9yeS5cbiAqXG4gKiBAcHJvdmlkZXNNb2R1bGUgaW52YXJpYW50XG4gKi9cblxuXCJ1c2Ugc3RyaWN0XCI7XG5cbi8qKlxuICogVXNlIGludmFyaWFudCgpIHRvIGFzc2VydCBzdGF0ZSB3aGljaCB5b3VyIHByb2dyYW0gYXNzdW1lcyB0byBiZSB0cnVlLlxuICpcbiAqIFByb3ZpZGUgc3ByaW50Zi1zdHlsZSBmb3JtYXQgKG9ubHkgJXMgaXMgc3VwcG9ydGVkKSBhbmQgYXJndW1lbnRzXG4gKiB0byBwcm92aWRlIGluZm9ybWF0aW9uIGFib3V0IHdoYXQgYnJva2UgYW5kIHdoYXQgeW91IHdlcmVcbiAqIGV4cGVjdGluZy5cbiAqXG4gKiBUaGUgaW52YXJpYW50IG1lc3NhZ2Ugd2lsbCBiZSBzdHJpcHBlZCBpbiBwcm9kdWN0aW9uLCBidXQgdGhlIGludmFyaWFudFxuICogd2lsbCByZW1haW4gdG8gZW5zdXJlIGxvZ2ljIGRvZXMgbm90IGRpZmZlciBpbiBwcm9kdWN0aW9uLlxuICovXG5cbnZhciBpbnZhcmlhbnQgPSBmdW5jdGlvbiAoY29uZGl0aW9uLCBmb3JtYXQsIGEsIGIsIGMsIGQsIGUsIGYpIHtcbiAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcignaW52YXJpYW50IHJlcXVpcmVzIGFuIGVycm9yIG1lc3NhZ2UgYXJndW1lbnQnKTtcbiAgICB9XG4gIH1cblxuICBpZiAoIWNvbmRpdGlvbikge1xuICAgIHZhciBlcnJvcjtcbiAgICBpZiAoZm9ybWF0ID09PSB1bmRlZmluZWQpIHtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdNaW5pZmllZCBleGNlcHRpb24gb2NjdXJyZWQ7IHVzZSB0aGUgbm9uLW1pbmlmaWVkIGRldiBlbnZpcm9ubWVudCAnICsgJ2ZvciB0aGUgZnVsbCBlcnJvciBtZXNzYWdlIGFuZCBhZGRpdGlvbmFsIGhlbHBmdWwgd2FybmluZ3MuJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHZhciBhcmdzID0gW2EsIGIsIGMsIGQsIGUsIGZdO1xuICAgICAgdmFyIGFyZ0luZGV4ID0gMDtcbiAgICAgIGVycm9yID0gbmV3IEVycm9yKCdJbnZhcmlhbnQgVmlvbGF0aW9uOiAnICsgZm9ybWF0LnJlcGxhY2UoLyVzL2csIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGFyZ3NbYXJnSW5kZXgrK107XG4gICAgICB9KSk7XG4gICAgfVxuXG4gICAgZXJyb3IuZnJhbWVzVG9Qb3AgPSAxOyAvLyB3ZSBkb24ndCBjYXJlIGFib3V0IGludmFyaWFudCdzIG93biBmcmFtZVxuICAgIHRocm93IGVycm9yO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IGludmFyaWFudDtcbn0pLmNhbGwodGhpcyxyZXF1aXJlKCdfcHJvY2VzcycpKVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9ZGF0YTphcHBsaWNhdGlvbi9qc29uO2NoYXJzZXQ6dXRmLTg7YmFzZTY0LGV5SjJaWEp6YVc5dUlqb3pMQ0p6YjNWeVkyVnpJanBiSW01dlpHVmZiVzlrZFd4bGN5OW1iSFY0TDI1dlpHVmZiVzlrZFd4bGN5OW1ZbXB6TDJ4cFlpOXBiblpoY21saGJuUXVhbk1pWFN3aWJtRnRaWE1pT2x0ZExDSnRZWEJ3YVc1bmN5STZJanRCUVVGQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CTzBGQlEwRTdRVUZEUVR0QlFVTkJPMEZCUTBFN1FVRkRRVHRCUVVOQk8wRkJRMEU3UVVGRFFUdEJRVU5CSWl3aVptbHNaU0k2SW1kbGJtVnlZWFJsWkM1cWN5SXNJbk52ZFhKalpWSnZiM1FpT2lJaUxDSnpiM1Z5WTJWelEyOXVkR1Z1ZENJNld5SXZLaXBjYmlBcUlFTnZjSGx5YVdkb2RDQXlNREV6TFRJd01UVXNJRVpoWTJWaWIyOXJMQ0JKYm1NdVhHNGdLaUJCYkd3Z2NtbG5hSFJ6SUhKbGMyVnlkbVZrTGx4dUlDcGNiaUFxSUZSb2FYTWdjMjkxY21ObElHTnZaR1VnYVhNZ2JHbGpaVzV6WldRZ2RXNWtaWElnZEdobElFSlRSQzF6ZEhsc1pTQnNhV05sYm5ObElHWnZkVzVrSUdsdUlIUm9aVnh1SUNvZ1RFbERSVTVUUlNCbWFXeGxJR2x1SUhSb1pTQnliMjkwSUdScGNtVmpkRzl5ZVNCdlppQjBhR2x6SUhOdmRYSmpaU0IwY21WbExpQkJiaUJoWkdScGRHbHZibUZzSUdkeVlXNTBYRzRnS2lCdlppQndZWFJsYm5RZ2NtbG5hSFJ6SUdOaGJpQmlaU0JtYjNWdVpDQnBiaUIwYUdVZ1VFRlVSVTVVVXlCbWFXeGxJR2x1SUhSb1pTQnpZVzFsSUdScGNtVmpkRzl5ZVM1Y2JpQXFYRzRnS2lCQWNISnZkbWxrWlhOTmIyUjFiR1VnYVc1MllYSnBZVzUwWEc0Z0tpOWNibHh1WENKMWMyVWdjM1J5YVdOMFhDSTdYRzVjYmk4cUtseHVJQ29nVlhObElHbHVkbUZ5YVdGdWRDZ3BJSFJ2SUdGemMyVnlkQ0J6ZEdGMFpTQjNhR2xqYUNCNWIzVnlJSEJ5YjJkeVlXMGdZWE56ZFcxbGN5QjBieUJpWlNCMGNuVmxMbHh1SUNwY2JpQXFJRkJ5YjNacFpHVWdjM0J5YVc1MFppMXpkSGxzWlNCbWIzSnRZWFFnS0c5dWJIa2dKWE1nYVhNZ2MzVndjRzl5ZEdWa0tTQmhibVFnWVhKbmRXMWxiblJ6WEc0Z0tpQjBieUJ3Y205MmFXUmxJR2x1Wm05eWJXRjBhVzl1SUdGaWIzVjBJSGRvWVhRZ1luSnZhMlVnWVc1a0lIZG9ZWFFnZVc5MUlIZGxjbVZjYmlBcUlHVjRjR1ZqZEdsdVp5NWNiaUFxWEc0Z0tpQlVhR1VnYVc1MllYSnBZVzUwSUcxbGMzTmhaMlVnZDJsc2JDQmlaU0J6ZEhKcGNIQmxaQ0JwYmlCd2NtOWtkV04wYVc5dUxDQmlkWFFnZEdobElHbHVkbUZ5YVdGdWRGeHVJQ29nZDJsc2JDQnlaVzFoYVc0Z2RHOGdaVzV6ZFhKbElHeHZaMmxqSUdSdlpYTWdibTkwSUdScFptWmxjaUJwYmlCd2NtOWtkV04wYVc5dUxseHVJQ292WEc1Y2JuWmhjaUJwYm5aaGNtbGhiblFnUFNCbWRXNWpkR2x2YmlBb1kyOXVaR2wwYVc5dUxDQm1iM0p0WVhRc0lHRXNJR0lzSUdNc0lHUXNJR1VzSUdZcElIdGNiaUFnYVdZZ0tIQnliMk5sYzNNdVpXNTJMazVQUkVWZlJVNVdJQ0U5UFNBbmNISnZaSFZqZEdsdmJpY3BJSHRjYmlBZ0lDQnBaaUFvWm05eWJXRjBJRDA5UFNCMWJtUmxabWx1WldRcElIdGNiaUFnSUNBZ0lIUm9jbTkzSUc1bGR5QkZjbkp2Y2lnbmFXNTJZWEpwWVc1MElISmxjWFZwY21WeklHRnVJR1Z5Y205eUlHMWxjM05oWjJVZ1lYSm5kVzFsYm5RbktUdGNiaUFnSUNCOVhHNGdJSDFjYmx4dUlDQnBaaUFvSVdOdmJtUnBkR2x2YmlrZ2UxeHVJQ0FnSUhaaGNpQmxjbkp2Y2p0Y2JpQWdJQ0JwWmlBb1ptOXliV0YwSUQwOVBTQjFibVJsWm1sdVpXUXBJSHRjYmlBZ0lDQWdJR1Z5Y205eUlEMGdibVYzSUVWeWNtOXlLQ2ROYVc1cFptbGxaQ0JsZUdObGNIUnBiMjRnYjJOamRYSnlaV1E3SUhWelpTQjBhR1VnYm05dUxXMXBibWxtYVdWa0lHUmxkaUJsYm5acGNtOXViV1Z1ZENBbklDc2dKMlp2Y2lCMGFHVWdablZzYkNCbGNuSnZjaUJ0WlhOellXZGxJR0Z1WkNCaFpHUnBkR2x2Ym1Gc0lHaGxiSEJtZFd3Z2QyRnlibWx1WjNNdUp5azdYRzRnSUNBZ2ZTQmxiSE5sSUh0Y2JpQWdJQ0FnSUhaaGNpQmhjbWR6SUQwZ1cyRXNJR0lzSUdNc0lHUXNJR1VzSUdaZE8xeHVJQ0FnSUNBZ2RtRnlJR0Z5WjBsdVpHVjRJRDBnTUR0Y2JpQWdJQ0FnSUdWeWNtOXlJRDBnYm1WM0lFVnljbTl5S0NkSmJuWmhjbWxoYm5RZ1ZtbHZiR0YwYVc5dU9pQW5JQ3NnWm05eWJXRjBMbkpsY0d4aFkyVW9MeVZ6TDJjc0lHWjFibU4wYVc5dUlDZ3BJSHRjYmlBZ0lDQWdJQ0FnY21WMGRYSnVJR0Z5WjNOYllYSm5TVzVrWlhncksxMDdYRzRnSUNBZ0lDQjlLU2s3WEc0Z0lDQWdmVnh1WEc0Z0lDQWdaWEp5YjNJdVpuSmhiV1Z6Vkc5UWIzQWdQU0F4T3lBdkx5QjNaU0JrYjI0bmRDQmpZWEpsSUdGaWIzVjBJR2x1ZG1GeWFXRnVkQ2R6SUc5M2JpQm1jbUZ0WlZ4dUlDQWdJSFJvY205M0lHVnljbTl5TzF4dUlDQjlYRzU5TzF4dVhHNXRiMlIxYkdVdVpYaHdiM0owY3lBOUlHbHVkbUZ5YVdGdWREc2lYWDA9IiwiLyoqXG4gKiBDb3B5cmlnaHQgMjAxMy0yMDE0IEZhY2Vib29rLCBJbmMuXG4gKlxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxuICpcbiAqIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxuICpcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXG4gKlxuICovXG5cblwidXNlIHN0cmljdFwiO1xuXG4vKipcbiAqIENvbnN0cnVjdHMgYW4gZW51bWVyYXRpb24gd2l0aCBrZXlzIGVxdWFsIHRvIHRoZWlyIHZhbHVlLlxuICpcbiAqIEZvciBleGFtcGxlOlxuICpcbiAqICAgdmFyIENPTE9SUyA9IGtleU1pcnJvcih7Ymx1ZTogbnVsbCwgcmVkOiBudWxsfSk7XG4gKiAgIHZhciBteUNvbG9yID0gQ09MT1JTLmJsdWU7XG4gKiAgIHZhciBpc0NvbG9yVmFsaWQgPSAhIUNPTE9SU1tteUNvbG9yXTtcbiAqXG4gKiBUaGUgbGFzdCBsaW5lIGNvdWxkIG5vdCBiZSBwZXJmb3JtZWQgaWYgdGhlIHZhbHVlcyBvZiB0aGUgZ2VuZXJhdGVkIGVudW0gd2VyZVxuICogbm90IGVxdWFsIHRvIHRoZWlyIGtleXMuXG4gKlxuICogICBJbnB1dDogIHtrZXkxOiB2YWwxLCBrZXkyOiB2YWwyfVxuICogICBPdXRwdXQ6IHtrZXkxOiBrZXkxLCBrZXkyOiBrZXkyfVxuICpcbiAqIEBwYXJhbSB7b2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge29iamVjdH1cbiAqL1xudmFyIGtleU1pcnJvciA9IGZ1bmN0aW9uKG9iaikge1xuICB2YXIgcmV0ID0ge307XG4gIHZhciBrZXk7XG4gIGlmICghKG9iaiBpbnN0YW5jZW9mIE9iamVjdCAmJiAhQXJyYXkuaXNBcnJheShvYmopKSkge1xuICAgIHRocm93IG5ldyBFcnJvcigna2V5TWlycm9yKC4uLik6IEFyZ3VtZW50IG11c3QgYmUgYW4gb2JqZWN0LicpO1xuICB9XG4gIGZvciAoa2V5IGluIG9iaikge1xuICAgIGlmICghb2JqLmhhc093blByb3BlcnR5KGtleSkpIHtcbiAgICAgIGNvbnRpbnVlO1xuICAgIH1cbiAgICByZXRba2V5XSA9IGtleTtcbiAgfVxuICByZXR1cm4gcmV0O1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBrZXlNaXJyb3I7XG4iLCIndXNlIHN0cmljdCc7XG5cbmZ1bmN0aW9uIFRvT2JqZWN0KHZhbCkge1xuXHRpZiAodmFsID09IG51bGwpIHtcblx0XHR0aHJvdyBuZXcgVHlwZUVycm9yKCdPYmplY3QuYXNzaWduIGNhbm5vdCBiZSBjYWxsZWQgd2l0aCBudWxsIG9yIHVuZGVmaW5lZCcpO1xuXHR9XG5cblx0cmV0dXJuIE9iamVjdCh2YWwpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHRhcmdldCwgc291cmNlKSB7XG5cdHZhciBwZW5kaW5nRXhjZXB0aW9uO1xuXHR2YXIgZnJvbTtcblx0dmFyIGtleXM7XG5cdHZhciB0byA9IFRvT2JqZWN0KHRhcmdldCk7XG5cblx0Zm9yICh2YXIgcyA9IDE7IHMgPCBhcmd1bWVudHMubGVuZ3RoOyBzKyspIHtcblx0XHRmcm9tID0gYXJndW1lbnRzW3NdO1xuXHRcdGtleXMgPSBPYmplY3Qua2V5cyhPYmplY3QoZnJvbSkpO1xuXG5cdFx0Zm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHR0b1trZXlzW2ldXSA9IGZyb21ba2V5c1tpXV07XG5cdFx0XHR9IGNhdGNoIChlcnIpIHtcblx0XHRcdFx0aWYgKHBlbmRpbmdFeGNlcHRpb24gPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0XHRcdHBlbmRpbmdFeGNlcHRpb24gPSBlcnI7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRpZiAocGVuZGluZ0V4Y2VwdGlvbikge1xuXHRcdHRocm93IHBlbmRpbmdFeGNlcHRpb247XG5cdH1cblxuXHRyZXR1cm4gdG87XG59O1xuIiwiLy8gQ29weXJpZ2h0IEpveWVudCwgSW5jLiBhbmQgb3RoZXIgTm9kZSBjb250cmlidXRvcnMuXG4vL1xuLy8gUGVybWlzc2lvbiBpcyBoZXJlYnkgZ3JhbnRlZCwgZnJlZSBvZiBjaGFyZ2UsIHRvIGFueSBwZXJzb24gb2J0YWluaW5nIGFcbi8vIGNvcHkgb2YgdGhpcyBzb2Z0d2FyZSBhbmQgYXNzb2NpYXRlZCBkb2N1bWVudGF0aW9uIGZpbGVzICh0aGVcbi8vIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW4gdGhlIFNvZnR3YXJlIHdpdGhvdXQgcmVzdHJpY3Rpb24sIGluY2x1ZGluZ1xuLy8gd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG8gdXNlLCBjb3B5LCBtb2RpZnksIG1lcmdlLCBwdWJsaXNoLFxuLy8gZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzIG9mIHRoZSBTb2Z0d2FyZSwgYW5kIHRvIHBlcm1pdFxuLy8gcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG8gc28sIHN1YmplY3QgdG8gdGhlXG4vLyBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vXG4vLyBUaGUgYWJvdmUgY29weXJpZ2h0IG5vdGljZSBhbmQgdGhpcyBwZXJtaXNzaW9uIG5vdGljZSBzaGFsbCBiZSBpbmNsdWRlZFxuLy8gaW4gYWxsIGNvcGllcyBvciBzdWJzdGFudGlhbCBwb3J0aW9ucyBvZiB0aGUgU29mdHdhcmUuXG4vL1xuLy8gVEhFIFNPRlRXQVJFIElTIFBST1ZJREVEIFwiQVMgSVNcIiwgV0lUSE9VVCBXQVJSQU5UWSBPRiBBTlkgS0lORCwgRVhQUkVTU1xuLy8gT1IgSU1QTElFRCwgSU5DTFVESU5HIEJVVCBOT1QgTElNSVRFRCBUTyBUSEUgV0FSUkFOVElFUyBPRlxuLy8gTUVSQ0hBTlRBQklMSVRZLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSBBTkQgTk9OSU5GUklOR0VNRU5ULiBJTlxuLy8gTk8gRVZFTlQgU0hBTEwgVEhFIEFVVEhPUlMgT1IgQ09QWVJJR0hUIEhPTERFUlMgQkUgTElBQkxFIEZPUiBBTlkgQ0xBSU0sXG4vLyBEQU1BR0VTIE9SIE9USEVSIExJQUJJTElUWSwgV0hFVEhFUiBJTiBBTiBBQ1RJT04gT0YgQ09OVFJBQ1QsIFRPUlQgT1Jcbi8vIE9USEVSV0lTRSwgQVJJU0lORyBGUk9NLCBPVVQgT0YgT1IgSU4gQ09OTkVDVElPTiBXSVRIIFRIRSBTT0ZUV0FSRSBPUiBUSEVcbi8vIFVTRSBPUiBPVEhFUiBERUFMSU5HUyBJTiBUSEUgU09GVFdBUkUuXG5cbmZ1bmN0aW9uIEV2ZW50RW1pdHRlcigpIHtcbiAgdGhpcy5fZXZlbnRzID0gdGhpcy5fZXZlbnRzIHx8IHt9O1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSB0aGlzLl9tYXhMaXN0ZW5lcnMgfHwgdW5kZWZpbmVkO1xufVxubW9kdWxlLmV4cG9ydHMgPSBFdmVudEVtaXR0ZXI7XG5cbi8vIEJhY2t3YXJkcy1jb21wYXQgd2l0aCBub2RlIDAuMTAueFxuRXZlbnRFbWl0dGVyLkV2ZW50RW1pdHRlciA9IEV2ZW50RW1pdHRlcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fZXZlbnRzID0gdW5kZWZpbmVkO1xuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5fbWF4TGlzdGVuZXJzID0gdW5kZWZpbmVkO1xuXG4vLyBCeSBkZWZhdWx0IEV2ZW50RW1pdHRlcnMgd2lsbCBwcmludCBhIHdhcm5pbmcgaWYgbW9yZSB0aGFuIDEwIGxpc3RlbmVycyBhcmVcbi8vIGFkZGVkIHRvIGl0LiBUaGlzIGlzIGEgdXNlZnVsIGRlZmF1bHQgd2hpY2ggaGVscHMgZmluZGluZyBtZW1vcnkgbGVha3MuXG5FdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycyA9IDEwO1xuXG4vLyBPYnZpb3VzbHkgbm90IGFsbCBFbWl0dGVycyBzaG91bGQgYmUgbGltaXRlZCB0byAxMC4gVGhpcyBmdW5jdGlvbiBhbGxvd3Ncbi8vIHRoYXQgdG8gYmUgaW5jcmVhc2VkLiBTZXQgdG8gemVybyBmb3IgdW5saW1pdGVkLlxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5zZXRNYXhMaXN0ZW5lcnMgPSBmdW5jdGlvbihuKSB7XG4gIGlmICghaXNOdW1iZXIobikgfHwgbiA8IDAgfHwgaXNOYU4obikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCduIG11c3QgYmUgYSBwb3NpdGl2ZSBudW1iZXInKTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gbjtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBlciwgaGFuZGxlciwgbGVuLCBhcmdzLCBpLCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gSWYgdGhlcmUgaXMgbm8gJ2Vycm9yJyBldmVudCBsaXN0ZW5lciB0aGVuIHRocm93LlxuICBpZiAodHlwZSA9PT0gJ2Vycm9yJykge1xuICAgIGlmICghdGhpcy5fZXZlbnRzLmVycm9yIHx8XG4gICAgICAgIChpc09iamVjdCh0aGlzLl9ldmVudHMuZXJyb3IpICYmICF0aGlzLl9ldmVudHMuZXJyb3IubGVuZ3RoKSkge1xuICAgICAgZXIgPSBhcmd1bWVudHNbMV07XG4gICAgICBpZiAoZXIgaW5zdGFuY2VvZiBFcnJvcikge1xuICAgICAgICB0aHJvdyBlcjsgLy8gVW5oYW5kbGVkICdlcnJvcicgZXZlbnRcbiAgICAgIH1cbiAgICAgIHRocm93IFR5cGVFcnJvcignVW5jYXVnaHQsIHVuc3BlY2lmaWVkIFwiZXJyb3JcIiBldmVudC4nKTtcbiAgICB9XG4gIH1cblxuICBoYW5kbGVyID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc1VuZGVmaW5lZChoYW5kbGVyKSlcbiAgICByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzRnVuY3Rpb24oaGFuZGxlcikpIHtcbiAgICBzd2l0Y2ggKGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIC8vIGZhc3QgY2FzZXNcbiAgICAgIGNhc2UgMTpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMpO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMjpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAzOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdLCBhcmd1bWVudHNbMl0pO1xuICAgICAgICBicmVhaztcbiAgICAgIC8vIHNsb3dlclxuICAgICAgZGVmYXVsdDpcbiAgICAgICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICAgICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICAgICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuICAgICAgICBoYW5kbGVyLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChpc09iamVjdChoYW5kbGVyKSkge1xuICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgYXJncyA9IG5ldyBBcnJheShsZW4gLSAxKTtcbiAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcblxuICAgIGxpc3RlbmVycyA9IGhhbmRsZXIuc2xpY2UoKTtcbiAgICBsZW4gPSBsaXN0ZW5lcnMubGVuZ3RoO1xuICAgIGZvciAoaSA9IDA7IGkgPCBsZW47IGkrKylcbiAgICAgIGxpc3RlbmVyc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgfVxuXG4gIHJldHVybiB0cnVlO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBtO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBUbyBhdm9pZCByZWN1cnNpb24gaW4gdGhlIGNhc2UgdGhhdCB0eXBlID09PSBcIm5ld0xpc3RlbmVyXCIhIEJlZm9yZVxuICAvLyBhZGRpbmcgaXQgdG8gdGhlIGxpc3RlbmVycywgZmlyc3QgZW1pdCBcIm5ld0xpc3RlbmVyXCIuXG4gIGlmICh0aGlzLl9ldmVudHMubmV3TGlzdGVuZXIpXG4gICAgdGhpcy5lbWl0KCduZXdMaXN0ZW5lcicsIHR5cGUsXG4gICAgICAgICAgICAgIGlzRnVuY3Rpb24obGlzdGVuZXIubGlzdGVuZXIpID9cbiAgICAgICAgICAgICAgbGlzdGVuZXIubGlzdGVuZXIgOiBsaXN0ZW5lcik7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgLy8gT3B0aW1pemUgdGhlIGNhc2Ugb2Ygb25lIGxpc3RlbmVyLiBEb24ndCBuZWVkIHRoZSBleHRyYSBhcnJheSBvYmplY3QuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gbGlzdGVuZXI7XG4gIGVsc2UgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgLy8gSWYgd2UndmUgYWxyZWFkeSBnb3QgYW4gYXJyYXksIGp1c3QgYXBwZW5kLlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5wdXNoKGxpc3RlbmVyKTtcbiAgZWxzZVxuICAgIC8vIEFkZGluZyB0aGUgc2Vjb25kIGVsZW1lbnQsIG5lZWQgdG8gY2hhbmdlIHRvIGFycmF5LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IFt0aGlzLl9ldmVudHNbdHlwZV0sIGxpc3RlbmVyXTtcblxuICAvLyBDaGVjayBmb3IgbGlzdGVuZXIgbGVha1xuICBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSAmJiAhdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCkge1xuICAgIHZhciBtO1xuICAgIGlmICghaXNVbmRlZmluZWQodGhpcy5fbWF4TGlzdGVuZXJzKSkge1xuICAgICAgbSA9IHRoaXMuX21heExpc3RlbmVycztcbiAgICB9IGVsc2Uge1xuICAgICAgbSA9IEV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzO1xuICAgIH1cblxuICAgIGlmIChtICYmIG0gPiAwICYmIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGggPiBtKSB7XG4gICAgICB0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkID0gdHJ1ZTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyhub2RlKSB3YXJuaW5nOiBwb3NzaWJsZSBFdmVudEVtaXR0ZXIgbWVtb3J5ICcgK1xuICAgICAgICAgICAgICAgICAgICAnbGVhayBkZXRlY3RlZC4gJWQgbGlzdGVuZXJzIGFkZGVkLiAnICtcbiAgICAgICAgICAgICAgICAgICAgJ1VzZSBlbWl0dGVyLnNldE1heExpc3RlbmVycygpIHRvIGluY3JlYXNlIGxpbWl0LicsXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS5sZW5ndGgpO1xuICAgICAgaWYgKHR5cGVvZiBjb25zb2xlLnRyYWNlID09PSAnZnVuY3Rpb24nKSB7XG4gICAgICAgIC8vIG5vdCBzdXBwb3J0ZWQgaW4gSUUgMTBcbiAgICAgICAgY29uc29sZS50cmFjZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbiA9IEV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICB2YXIgZmlyZWQgPSBmYWxzZTtcblxuICBmdW5jdGlvbiBnKCkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgZyk7XG5cbiAgICBpZiAoIWZpcmVkKSB7XG4gICAgICBmaXJlZCA9IHRydWU7XG4gICAgICBsaXN0ZW5lci5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgfVxuXG4gIGcubGlzdGVuZXIgPSBsaXN0ZW5lcjtcbiAgdGhpcy5vbih0eXBlLCBnKTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8vIGVtaXRzIGEgJ3JlbW92ZUxpc3RlbmVyJyBldmVudCBpZmYgdGhlIGxpc3RlbmVyIHdhcyByZW1vdmVkXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIGxpc3QsIHBvc2l0aW9uLCBsZW5ndGgsIGk7XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgbGlzdCA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgbGVuZ3RoID0gbGlzdC5sZW5ndGg7XG4gIHBvc2l0aW9uID0gLTE7XG5cbiAgaWYgKGxpc3QgPT09IGxpc3RlbmVyIHx8XG4gICAgICAoaXNGdW5jdGlvbihsaXN0Lmxpc3RlbmVyKSAmJiBsaXN0Lmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuXG4gIH0gZWxzZSBpZiAoaXNPYmplY3QobGlzdCkpIHtcbiAgICBmb3IgKGkgPSBsZW5ndGg7IGktLSA+IDA7KSB7XG4gICAgICBpZiAobGlzdFtpXSA9PT0gbGlzdGVuZXIgfHxcbiAgICAgICAgICAobGlzdFtpXS5saXN0ZW5lciAmJiBsaXN0W2ldLmxpc3RlbmVyID09PSBsaXN0ZW5lcikpIHtcbiAgICAgICAgcG9zaXRpb24gPSBpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAocG9zaXRpb24gPCAwKVxuICAgICAgcmV0dXJuIHRoaXM7XG5cbiAgICBpZiAobGlzdC5sZW5ndGggPT09IDEpIHtcbiAgICAgIGxpc3QubGVuZ3RoID0gMDtcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgfSBlbHNlIHtcbiAgICAgIGxpc3Quc3BsaWNlKHBvc2l0aW9uLCAxKTtcbiAgICB9XG5cbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciBrZXksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICByZXR1cm4gdGhpcztcblxuICAvLyBub3QgbGlzdGVuaW5nIGZvciByZW1vdmVMaXN0ZW5lciwgbm8gbmVlZCB0byBlbWl0XG4gIGlmICghdGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKSB7XG4gICAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApXG4gICAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICBlbHNlIGlmICh0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gZW1pdCByZW1vdmVMaXN0ZW5lciBmb3IgYWxsIGxpc3RlbmVycyBvbiBhbGwgZXZlbnRzXG4gIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSB7XG4gICAgZm9yIChrZXkgaW4gdGhpcy5fZXZlbnRzKSB7XG4gICAgICBpZiAoa2V5ID09PSAncmVtb3ZlTGlzdGVuZXInKSBjb250aW51ZTtcbiAgICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKGtleSk7XG4gICAgfVxuICAgIHRoaXMucmVtb3ZlQWxsTGlzdGVuZXJzKCdyZW1vdmVMaXN0ZW5lcicpO1xuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJzID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGxpc3RlbmVycykpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVycyk7XG4gIH0gZWxzZSB7XG4gICAgLy8gTElGTyBvcmRlclxuICAgIHdoaWxlIChsaXN0ZW5lcnMubGVuZ3RoKVxuICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnNbbGlzdGVuZXJzLmxlbmd0aCAtIDFdKTtcbiAgfVxuICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbih0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghdGhpcy5fZXZlbnRzIHx8ICF0aGlzLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gW107XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24odGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSBbdGhpcy5fZXZlbnRzW3R5cGVdXTtcbiAgZWxzZVxuICAgIHJldCA9IHRoaXMuX2V2ZW50c1t0eXBlXS5zbGljZSgpO1xuICByZXR1cm4gcmV0O1xufTtcblxuRXZlbnRFbWl0dGVyLmxpc3RlbmVyQ291bnQgPSBmdW5jdGlvbihlbWl0dGVyLCB0eXBlKSB7XG4gIHZhciByZXQ7XG4gIGlmICghZW1pdHRlci5fZXZlbnRzIHx8ICFlbWl0dGVyLl9ldmVudHNbdHlwZV0pXG4gICAgcmV0ID0gMDtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbihlbWl0dGVyLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IDE7XG4gIGVsc2VcbiAgICByZXQgPSBlbWl0dGVyLl9ldmVudHNbdHlwZV0ubGVuZ3RoO1xuICByZXR1cm4gcmV0O1xufTtcblxuZnVuY3Rpb24gaXNGdW5jdGlvbihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdmdW5jdGlvbic7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ251bWJlcic7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ29iamVjdCcgJiYgYXJnICE9PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChhcmcpIHtcbiAgcmV0dXJuIGFyZyA9PT0gdm9pZCAwO1xufVxuIiwiLy8gc2hpbSBmb3IgdXNpbmcgcHJvY2VzcyBpbiBicm93c2VyXG5cbnZhciBwcm9jZXNzID0gbW9kdWxlLmV4cG9ydHMgPSB7fTtcbnZhciBxdWV1ZSA9IFtdO1xudmFyIGRyYWluaW5nID0gZmFsc2U7XG5cbmZ1bmN0aW9uIGRyYWluUXVldWUoKSB7XG4gICAgaWYgKGRyYWluaW5nKSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSB0cnVlO1xuICAgIHZhciBjdXJyZW50UXVldWU7XG4gICAgdmFyIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB3aGlsZShsZW4pIHtcbiAgICAgICAgY3VycmVudFF1ZXVlID0gcXVldWU7XG4gICAgICAgIHF1ZXVlID0gW107XG4gICAgICAgIHZhciBpID0gLTE7XG4gICAgICAgIHdoaWxlICgrK2kgPCBsZW4pIHtcbiAgICAgICAgICAgIGN1cnJlbnRRdWV1ZVtpXSgpO1xuICAgICAgICB9XG4gICAgICAgIGxlbiA9IHF1ZXVlLmxlbmd0aDtcbiAgICB9XG4gICAgZHJhaW5pbmcgPSBmYWxzZTtcbn1cbnByb2Nlc3MubmV4dFRpY2sgPSBmdW5jdGlvbiAoZnVuKSB7XG4gICAgcXVldWUucHVzaChmdW4pO1xuICAgIGlmICghZHJhaW5pbmcpIHtcbiAgICAgICAgc2V0VGltZW91dChkcmFpblF1ZXVlLCAwKTtcbiAgICB9XG59O1xuXG5wcm9jZXNzLnRpdGxlID0gJ2Jyb3dzZXInO1xucHJvY2Vzcy5icm93c2VyID0gdHJ1ZTtcbnByb2Nlc3MuZW52ID0ge307XG5wcm9jZXNzLmFyZ3YgPSBbXTtcbnByb2Nlc3MudmVyc2lvbiA9ICcnOyAvLyBlbXB0eSBzdHJpbmcgdG8gYXZvaWQgcmVnZXhwIGlzc3Vlc1xucHJvY2Vzcy52ZXJzaW9ucyA9IHt9O1xuXG5mdW5jdGlvbiBub29wKCkge31cblxucHJvY2Vzcy5vbiA9IG5vb3A7XG5wcm9jZXNzLmFkZExpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3Mub25jZSA9IG5vb3A7XG5wcm9jZXNzLm9mZiA9IG5vb3A7XG5wcm9jZXNzLnJlbW92ZUxpc3RlbmVyID0gbm9vcDtcbnByb2Nlc3MucmVtb3ZlQWxsTGlzdGVuZXJzID0gbm9vcDtcbnByb2Nlc3MuZW1pdCA9IG5vb3A7XG5cbnByb2Nlc3MuYmluZGluZyA9IGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdwcm9jZXNzLmJpbmRpbmcgaXMgbm90IHN1cHBvcnRlZCcpO1xufTtcblxuLy8gVE9ETyhzaHR5bG1hbilcbnByb2Nlc3MuY3dkID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gJy8nIH07XG5wcm9jZXNzLmNoZGlyID0gZnVuY3Rpb24gKGRpcikge1xuICAgIHRocm93IG5ldyBFcnJvcigncHJvY2Vzcy5jaGRpciBpcyBub3Qgc3VwcG9ydGVkJyk7XG59O1xucHJvY2Vzcy51bWFzayA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gMDsgfTtcbiIsInZhciBEaXNwYXRjaGVyID0gcmVxdWlyZSgnZmx1eCcpLkRpc3BhdGNoZXI7XG5cbm1vZHVsZS5leHBvcnRzID0gbmV3IERpc3BhdGNoZXIoKTsiLCJ2YXIga2V5TWlycm9yID0gcmVxdWlyZSgna2V5bWlycm9yJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIEFjdGlvblR5cGVzOiBrZXlNaXJyb3Ioe1xuICAgICAgICBMT0dJTjogbnVsbCxcbiAgICAgICAgTUVTU0FHRV9TRU5EOiBudWxsLFxuICAgICAgICBJTkRJVklEVUFMX01FU1NBR0VfU0VORDogbnVsbCxcbiAgICAgICAgU1dJVENIX1RIUkVBRDogbnVsbCxcbiAgICAgICAgTUVTU0FHRV9CUk9BRENBU1Q6IG51bGxcbiAgICB9KSxcbiAgICBBdmF0YXJzOiB7XG4gICAgICAgIDEgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogMSxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy0xMnB4IC0ycHgnXG4gICAgICAgIH0sXG4gICAgICAgIDIgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogMixcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03MnB4IDBweCdcbiAgICAgICAgfSxcbiAgICAgICAgMyA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiAzLFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTEzMnB4IDBweCdcbiAgICAgICAgfSxcbiAgICAgICAgNCA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA0LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTExcHggLTYycHgnXG4gICAgICAgIH0sXG4gICAgICAgIDUgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNSxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03MnB4IC02MXB4J1xuICAgICAgICB9LFxuICAgICAgICA2IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDYsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctMTMycHggLTYxcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDcgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy0xMnB4IC0xMjRweCdcbiAgICAgICAgfSxcbiAgICAgICAgOCA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA4LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTcycHggLTEyMnB4J1xuICAgICAgICB9LFxuICAgICAgICA5IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDksXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctMTMycHggLTEyM3B4J1xuICAgICAgICB9XG4gICAgfSxcbiAgICBBdmF0YXJzX3NtYWxsOiB7XG4gICAgICAgIDEgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogMSxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy02cHggMHB4J1xuICAgICAgICB9LFxuICAgICAgICAyIDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDIsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNDJweCAwcHgnXG4gICAgICAgIH0sXG4gICAgICAgIDMgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogMyxcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03OXB4IDBweCdcbiAgICAgICAgfSxcbiAgICAgICAgNCA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA0LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTZweCAtMzZweCdcbiAgICAgICAgfSxcbiAgICAgICAgNSA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA1LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTQycHggLTM2cHgnXG4gICAgICAgIH0sXG4gICAgICAgIDYgOiB7XG4gICAgICAgICAgICAnYXZhdGFyX2lkJzogNixcbiAgICAgICAgICAgICdiYWNrZ3JvdW5kX3Bvc2l0aW9uJzogJy03OXB4IC0zNnB4J1xuICAgICAgICB9LFxuICAgICAgICA3IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDcsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNnB4IC03M3B4J1xuICAgICAgICB9LFxuICAgICAgICA4IDoge1xuICAgICAgICAgICAgJ2F2YXRhcl9pZCc6IDgsXG4gICAgICAgICAgICAnYmFja2dyb3VuZF9wb3NpdGlvbic6ICctNDJweCAtNzNweCdcbiAgICAgICAgfSxcbiAgICAgICAgOSA6IHtcbiAgICAgICAgICAgICdhdmF0YXJfaWQnOiA5LFxuICAgICAgICAgICAgJ2JhY2tncm91bmRfcG9zaXRpb24nOiAnLTc5cHggLTczcHgnXG4gICAgICAgIH1cbiAgICB9XG59O1xuIiwidmFyIEV2ZW50RW1pdHRlciA9IHJlcXVpcmUoJ2V2ZW50cycpLkV2ZW50RW1pdHRlcjtcbnZhciBhc3NpZ24gPSByZXF1aXJlKCdvYmplY3QtYXNzaWduJyk7XG52YXIgZGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZGlzcGF0Y2hlcicpO1xudmFyIEFjdGlvblR5cGVzID0gcmVxdWlyZSgnLi9oZWxwZXJVdGlsJykuQWN0aW9uVHlwZXM7XG52YXIgY3VycmVudF91c2VyID0ge307XG52YXIgdXNlcnMgPSB7fTtcbnZhciBjdXJyZW50VGhyZWFkSWQgPSBcIjBcIjsgLy9kZWZhdWx0IHRocmVhZCBpZFxudmFyIHVzZXJfbWVzc2FnZXMgPSB7fTtcbnZhciBTdG9yZSA9IGFzc2lnbih7fSwgRXZlbnRFbWl0dGVyLnByb3RvdHlwZSwge1xuICAgIGVtaXRMb2dpbjogZnVuY3Rpb24oZGF0YSkge1xuICAgICAgICBjdXJyZW50X3VzZXIgPSBkYXRhO1xuICAgICAgICB0aGlzLmVtaXQoQWN0aW9uVHlwZXMuTE9HSU4pO1xuICAgIH0sXG4gICAgZW1pdE1lc3NhZ2VTZW5kOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdmFyIHRocmVhZElkID0gZGF0YS50eXBlID09PSBcImF1dG9tYXRlXCIgPyBcIjBcIiA6IGN1cnJlbnRUaHJlYWRJZDtcbiAgICAgICAgaWYoIXVzZXJfbWVzc2FnZXNbdGhyZWFkSWRdKSB1c2VyX21lc3NhZ2VzW3RocmVhZElkXSA9IFtdO1xuICAgICAgICB1c2VyX21lc3NhZ2VzW3RocmVhZElkXS5wdXNoKGRhdGEpO1xuICAgICAgICB0aGlzLmVtaXQoQWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5EKTtcbiAgICB9LFxuICAgIGVtaXRNZXNzYWdlQnJvYWRjYXN0OiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdmFyIHRocmVhZGlkID0gZGF0YS50aHJlYWRJZDtcbiAgICAgICAgaWYoIXVzZXJfbWVzc2FnZXNbdGhyZWFkaWRdKSB1c2VyX21lc3NhZ2VzW3RocmVhZGlkXSA9IFtdO1xuICAgICAgICB1c2VyX21lc3NhZ2VzW3RocmVhZGlkXS5wdXNoKGRhdGEpO1xuICAgICAgICB0aGlzLmVtaXQoQWN0aW9uVHlwZXMuTUVTU0FHRV9CUk9BRENBU1QsIGRhdGEpO1xuICAgIH0sXG4gICAgYWRkTG9naW5MaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5vbihBY3Rpb25UeXBlcy5MT0dJTiwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlTG9naW5MaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihBY3Rpb25UeXBlcy5MT0dJTiwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgYWRkTWVzc2FnZUxpc3RlbmVyOiBmdW5jdGlvbihjYWxsYmFjayl7XG4gICAgICAgIHRoaXMub24oQWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5ELCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZW1vdmVNZXNzYWdlTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihBY3Rpb25UeXBlcy5NRVNTQUdFX1NFTkQsIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGFkZE1lc3NhZ2VCcm9hZGNhc3RMaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLm9uKEFjdGlvblR5cGVzLk1FU1NBR0VfQlJPQURDQVNULCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZW1vdmVNZXNzYWdlQnJvYWRjYXN0TGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5yZW1vdmVMaXN0ZW5lcihBY3Rpb25UeXBlcy5NRVNTQUdFX0JST0FEQ0FTVCwgY2FsbGJhY2spO1xuICAgIH0sXG4gICAgYWRkVGhyZWFkTGlzdGVuZXI6IGZ1bmN0aW9uKGNhbGxiYWNrKXtcbiAgICAgICAgdGhpcy5vbihBY3Rpb25UeXBlcy5TV0lUQ0hfVEhSRUFELCBjYWxsYmFjayk7XG4gICAgfSxcbiAgICByZW1vdmVUaHJlYWRMaXN0ZW5lcjogZnVuY3Rpb24oY2FsbGJhY2spe1xuICAgICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKEFjdGlvblR5cGVzLlNXSVRDSF9USFJFQUQsIGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGdldEN1cnJlbnRVc2VyOiBmdW5jdGlvbigpe1xuICAgICAgICByZXR1cm4gY3VycmVudF91c2VyO1xuICAgIH0sXG4gICAgYWxsTWVzc2FnZTogZnVuY3Rpb24oKXtcbiAgICAgICAgaWYoIXVzZXJfbWVzc2FnZXNbY3VycmVudFRocmVhZElkXSkgdXNlcl9tZXNzYWdlc1tjdXJyZW50VGhyZWFkSWRdID0gW107XG4gICAgICAgIHJldHVybiB1c2VyX21lc3NhZ2VzW2N1cnJlbnRUaHJlYWRJZF07XG4gICAgfSxcbiAgICBhZGRNZXNzYWdlOiBmdW5jdGlvbihkYXRhKXtcbiAgICAgICAgdGhpcy5lbWl0TWVzc2FnZVNlbmQoZGF0YSk7XG4gICAgfSxcbiAgICBnZXRUaHJlYWRJZDogZnVuY3Rpb24oKXtcbiAgICAgICAgcmV0dXJuIGN1cnJlbnRUaHJlYWRJZDtcbiAgICB9LFxuICAgIHN3aXRjaENoYW5uZWw6IGZ1bmN0aW9uKGRhdGEpe1xuICAgICAgICBjdXJyZW50VGhyZWFkSWQgPSBkYXRhLnRocmVhZElkO1xuICAgICAgICB0aGlzLmVtaXQoQWN0aW9uVHlwZXMuU1dJVENIX1RIUkVBRCk7XG4gICAgfSxcbiAgICAvLyByZW1vdmUgbWVzc2FnZXMgd2hlbiB1c2VyIGxvZyBvdXRcbiAgICByZW1vdmVNZXNzYWdlczogZnVuY3Rpb24ocmVtb3ZlZF91c2VyX2lkKXtcbiAgICAgICAgXy5lYWNoKF8ua2V5cyh1c2VyX21lc3NhZ2VzKSwgZnVuY3Rpb24oa2V5KXtcbiAgICAgICAgICAgIHZhciBzcGxpdF9pZHMgPSBrZXkuc3BsaXQoJ18nKTtcbiAgICAgICAgICAgIGlmKF8uY29udGFpbnMoc3BsaXRfaWRzLCByZW1vdmVkX3VzZXJfaWQpKXtcbiAgICAgICAgICAgICAgICBkZWxldGUgdXNlcl9tZXNzYWdlc1trZXldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59KTtcblxuU3RvcmUuZGlzcGF0Y2hUb2tlbiA9IGRpc3BhdGNoZXIucmVnaXN0ZXIoZnVuY3Rpb24oZGF0YSkge1xuICAgIHN3aXRjaChkYXRhLmFjdGlvblR5cGVzKSB7XG4gICAgICAgIGNhc2UgQWN0aW9uVHlwZXMuTE9HSU46XG4gICAgICAgICAgICBTdG9yZS5lbWl0TG9naW4oZGF0YSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBY3Rpb25UeXBlcy5NRVNTQUdFX1NFTkQ6XG4gICAgICAgICAgICBTdG9yZS5lbWl0TWVzc2FnZVNlbmQoZGF0YSk7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgY2FzZSBBY3Rpb25UeXBlcy5NRVNTQUdFX0JST0FEQ0FTVDpcbiAgICAgICAgICAgIFN0b3JlLmVtaXRNZXNzYWdlQnJvYWRjYXN0KGRhdGEpO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIGNhc2UgQWN0aW9uVHlwZXMuU1dJVENIX1RIUkVBRDpcbiAgICAgICAgICAgIFN0b3JlLnN3aXRjaENoYW5uZWwoZGF0YSk7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gU3RvcmU7IiwidmFyIHNvY2tldCA9IGlvLmNvbm5lY3QoKTtcbnZhciBFTlRFUl9LRVlfQ09ERSA9IDEzO1xudmFyIFN0b3JlID0gcmVxdWlyZSgnLi9zdG9yZScpO1xudmFyIGRpc3BhdGNoZXIgPSByZXF1aXJlKCcuL2Rpc3BhdGNoZXInKTtcbnZhciBoZWxwZXJVdGlsID0gcmVxdWlyZSgnLi9oZWxwZXJVdGlsJyk7XG52YXIgYWN0aW9uVHlwZXMgPSBoZWxwZXJVdGlsLkFjdGlvblR5cGVzO1xudmFyIGF2YXRhcnMgPSBoZWxwZXJVdGlsLkF2YXRhcnM7XG52YXIgYXZhdGFyc19zbWFsbCA9IGhlbHBlclV0aWwuQXZhdGFyc19zbWFsbDtcbnZhciBBVkFUQVJfU0NST0xMX0xJTUlUID0gMztcbnZhciBTQ1JPTExfR0FQX1dJRFRIID0gMTcxO1xudmFyIFVzZXJMaXN0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIlVzZXJMaXN0XCIsXG5cdGhhbmRsZUNsaWNrOiBmdW5jdGlvbihldmVudCl7XG5cdFx0dmFyIGlkID0gJChldmVudC5jdXJyZW50VGFyZ2V0KS5hdHRyKCdkYXRhLWlkJyk7XG5cdFx0dGhpcy5wcm9wcy5ub3RpZmljYXRpb25baWRdID0gZmFsc2U7XG5cdFx0Xy5lYWNoKCQodGhpcy5yZWZzLnVzZXJMaXN0LmdldERPTU5vZGUoKSkuY2hpbGRyZW4oKSwgZnVuY3Rpb24oY2hpbGQpe1xuXHRcdFx0dmFyIHR5cGUgPSBjaGlsZC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdHlwZScpO1xuXHRcdFx0dmFyIGlzX2NsaWNrID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJykgPT09IGlkO1xuXHRcdFx0aWYodHlwZSA9PT0gXCJob21lXCIpe1xuXHRcdFx0XHRjaGlsZC5jbGFzc05hbWUgPSBpc19jbGljayA/IFwidXNlci1wcm9maWxlIGhvbWUgYWN0aXZlXCIgOiBcInVzZXItcHJvZmlsZSBob21lXCI7XG5cdFx0XHR9ZWxzZSBpZih0eXBlID09PSBcInVzZXJcIil7XG5cdFx0XHRcdGNoaWxkLmNsYXNzTmFtZSA9IGlzX2NsaWNrID8gXCJ1c2VyLXByb2ZpbGUgYWN0aXZlXCIgOiBcInVzZXItcHJvZmlsZVwiO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHRcdC8vIEkganVzdCB1c2Ugc2ltcGxlIHNlbmRlcklEX3JlY2VpdmVySUQgaGVyZSBhcyB0aGUga2V5IGZvciB0aGUgbWVzc2FnZXNcblx0XHR2YXIgdGhyZWFkSWQgPSBpZCA9PT0gXCIwXCIgPyBpZCA6IFtpZCwgU3RvcmUuZ2V0Q3VycmVudFVzZXIoKS5pZF0uc29ydCgpLmpvaW4oJ18nKTtcblx0XHRkaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdHRocmVhZElkOiB0aHJlYWRJZCxcblx0XHRcdGFjdGlvblR5cGVzIDogYWN0aW9uVHlwZXMuU1dJVENIX1RIUkVBRFxuXHRcdH0pO1xuXHR9LFxuXHRnZXROYW1lOiBmdW5jdGlvbih1c2VyKXtcblx0XHRyZXR1cm4gdXNlci5pZCA9PT0gU3RvcmUuZ2V0Q3VycmVudFVzZXIoKS5pZCA/IFwiQ3VycmVudCBVc2VyXCIgOiB1c2VyLm5hbWU7XG5cdH0sXG5cdGdldE5vdGlmaWNhdGlvblN0eWxlOiBmdW5jdGlvbihrZXkpe1xuXHRcdHJldHVybiB0aGlzLnByb3BzLm5vdGlmaWNhdGlvbltrZXldID8gXCJpbmxpbmUtYmxvY2tcIiA6IFwibm9uZVwiO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuKFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAndXNlcnMnfSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXCIgT25saW5lIFVzZXJzIFwiKSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ2hvbWUnfSwgUmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwgbnVsbCkpLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAndXNlcnMtbGlzdCcsIHJlZjogJ3VzZXJMaXN0J30sIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXItcHJvZmlsZSBob21lIGFjdGl2ZScsIFwiZGF0YS1pZFwiOiAnMCcsIFwiZGF0YS10eXBlXCI6ICdob21lJywgb25DbGljazogdGhpcy5oYW5kbGVDbGlja30sIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogJ3VzZXItYXZhdGFyIGhvbWUnfSksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAndXNlci1uYW1lJ30sIFwiIFwiLCAnQWxsIFVzZXJzJywgXCIgXCIpLCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwiZmEgZmEtY29tbWVudGluZy1vXCIsIHN0eWxlOiB7ZGlzcGxheTogdGhpcy5nZXROb3RpZmljYXRpb25TdHlsZSgnMCcpfX0pXG5cdFx0XHRcdFx0KSwgXG5cdFx0XHRcdFx0dGhpcy5wcm9wcy51c2Vycy5tYXAoZnVuY3Rpb24odXNlcikge1xuXHRcdFx0XHRcdFx0dmFyIHN0eWxlID0geyAnYmFja2dyb3VuZFBvc2l0aW9uJzogYXZhdGFyc19zbWFsbFt1c2VyLmF2YXRhcl0uYmFja2dyb3VuZF9wb3NpdGlvbiB9O1xuXHRcdFx0XHRcdFx0cmV0dXJuIChcblx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAndXNlci1wcm9maWxlJywgXCJkYXRhLXR5cGVcIjogJ3VzZXInLCBcImRhdGEtaWRcIjogdXNlci5pZCwgb25DbGljazogdGhpcy5oYW5kbGVDbGlja30sIFxuXHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXItYXZhdGFyJywgc3R5bGU6IHN0eWxlfSksIFxuXHRcdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ3VzZXItbmFtZSd9LCBcIiBcIiwgIHRoaXMuZ2V0TmFtZSh1c2VyKSwgXCIgXCIpLCBcblx0XHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLWNvbW1lbnRpbmctb1wiLCBzdHlsZToge2Rpc3BsYXk6IHRoaXMuZ2V0Tm90aWZpY2F0aW9uU3R5bGUodXNlci5pZCl9fSlcblx0XHRcdFx0XHRcdFx0KSk7XG5cdFx0XHRcdFx0fS5iaW5kKHRoaXMpKVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0KVxuXHR9XG59KVxudmFyIE1lc3NhZ2UgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6IFwiTWVzc2FnZVwiLFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0Ly8gY29udmVydCBbOjFdIGxpa2Ugc3RyaW5nIHRvIGVtb2ppXG5cdFx0dmFyIGNvbnZlcnRNZXNzYWdlID0gZnVuY3Rpb24obWVzc2FnZSl7XG5cdFx0XHR2YXIgcmVnZXggPSAvXFxbXFw6KC4qPylcXF0vO1xuXHRcdFx0dmFyIG1lc3NhZ2UgPSBtZXNzYWdlO1xuXHRcdFx0d2hpbGUobWVzc2FnZS5tYXRjaChyZWdleCkpe1xuXHRcdFx0XHR2YXIgZW1vamlfaWQgPSBtZXNzYWdlLm1hdGNoKHJlZ2V4KVsxXTtcblx0XHRcdFx0dmFyIHNyYyA9IFwiLi5cXC9jb250ZW50XFwvZW1vamlcXC9cIiArIGVtb2ppX2lkICsgXCIucG5nXCI7XG5cdFx0XHRcdHZhciBlbW9qaSA9IFwiPGltZyBjbGFzcz1cXCdlbW9qaS1pY29uXFwnIHNyYz1cXFwiXCIgKyBzcmMgKyBcIlxcXCI+XCI7XG5cdFx0XHRcdG1lc3NhZ2UgPSBtZXNzYWdlLnJlcGxhY2UocmVnZXgsIGVtb2ppKTtcblx0XHRcdH1cblx0XHRcdHJldHVybiB7X19odG1sOiBtZXNzYWdlfTtcblx0XHR9O1xuXHRcdGlmKHRoaXMucHJvcHMudHlwZSA9PT0gXCJhdXRvbWF0ZVwiKXtcblx0XHRcdHZhciBvdXRwdXQgPSAoXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJtZXNzYWdlIGF1dG9tYXRlXCJ9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiYXV0b21hdGUtbWVzc2FnZVwifSwgdGhpcy5wcm9wcy5tZXNzYWdlKVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0fWVsc2V7XG5cdFx0XHR2YXIgdXNlciA9IHRoaXMucHJvcHMudXNlcjtcblx0XHRcdHZhciBzdHlsZSA9IHsgJ2JhY2tncm91bmRQb3NpdGlvbic6IGF2YXRhcnNfc21hbGxbdXNlci5hdmF0YXJdLmJhY2tncm91bmRfcG9zaXRpb24gfTtcblx0XHRcdHZhciBvdXRwdXQgPSAoXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJtZXNzYWdlXCJ9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwidXNlci1hdmF0YXJcIiwgc3R5bGU6IHN0eWxlfSksIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJ1c2VyLW5hbWVcIn0sIFwiIFwiLCAgdXNlci5uYW1lLCBcIiBcIiwgUmVhY3QuY3JlYXRlRWxlbWVudChcInNwYW5cIiwge2NsYXNzTmFtZTogJ3RpbWUnfSwgXCJzZW50IGF0IFwiLCB0aGlzLnByb3BzLnRpbWUpKSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImNvbnRlbnRcIn0sIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1wbGF5XCJ9KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiaW5saW5lLW1lc3NhZ2VcIiwgZGFuZ2Vyb3VzbHlTZXRJbm5lckhUTUw6IGNvbnZlcnRNZXNzYWdlKHRoaXMucHJvcHMubWVzc2FnZSl9KVxuXHRcdFx0XHRcdClcblx0XHRcdFx0KVxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdHJldHVybiBvdXRwdXQ7XG5cblx0fVxufSk7XG52YXIgRW1vamlWaWV3ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIkVtb2ppVmlld1wiLFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIHN0eWxlID0gdGhpcy5wcm9wcy5pc0Vtb2ppU2hvdyA/IHsgZGlzcGxheSA6IFwiYmxvY2tcIn0gOiB7IGRpc3BsYXkgOiBcIm5vbmVcIn07XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJlbW9qaVwiLCBzdHlsZTogc3R5bGV9LCBcblx0XHRcdFx0XG5cdFx0XHRcdFx0Xy5yYW5nZSgyLDM0KS5tYXAoZnVuY3Rpb24ocm93KXtcblx0XHRcdFx0XHRcdHJldHVybiBSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW1nXCIsIHtzcmM6ICcuLi9jb250ZW50L2Vtb2ppLycgKyByb3cgKyAnLnBuZycsIFwiZGF0YS1pZFwiOiByb3csIG9uQ2xpY2s6IHRoaXMucHJvcHMuaGFuZGxlRW1vamlDbGlja30pXG5cdFx0XHRcdFx0fS5iaW5kKHRoaXMpKVxuXHRcdFx0XHRcdFxuXHRcdFx0KVxuXHRcdCk7XG5cdH1cbn0pO1xudmFyIE1lc3NhZ2VMaXN0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIk1lc3NhZ2VMaXN0XCIsXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKXtcblx0XHRyZXR1cm4ge1xuXHRcdFx0bWVzc2FnZSA6IFwiXCIsXG5cdFx0XHRpc0Vtb2ppU2hvdzogZmFsc2Vcblx0XHR9XG5cdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRSZWFjdC5maW5kRE9NTm9kZSh0aGlzLnJlZnMudGV4dGFyZWEpLmZvY3VzKCk7XG5cdH0sXG5cdGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24oKXtcblx0XHR0aGlzLl9zY3JvbGxUb0JvdHRvbSgpO1xuXHR9LFxuXHRzZW5kOiBmdW5jdGlvbigpe1xuXHRcdHZhciBtZXNzYWdlID0gdGhpcy5zdGF0ZS5tZXNzYWdlLnRyaW0oKTtcblx0XHRpZighXy5pc0VtcHR5KG1lc3NhZ2UpKXtcblx0XHRcdHZhciBkYXRhID0ge1xuXHRcdFx0XHRtZXNzYWdlIDogbWVzc2FnZSxcblx0XHRcdFx0dXNlciA6IFN0b3JlLmdldEN1cnJlbnRVc2VyKCksXG5cdFx0XHRcdHRpbWUgOiBtb21lbnQobmV3IERhdGUoKSkuZm9ybWF0KCdsbGwnKSxcblx0XHRcdFx0dGhyZWFkSWQ6IFN0b3JlLmdldFRocmVhZElkKClcblx0XHRcdH1cblx0XHRcdHRoaXMucHJvcHMuaGFuZGxlTWVzc2FnZVN1Ym1pdChkYXRhKTtcblx0XHRcdHRoaXMuX3Njcm9sbFRvQm90dG9tKCk7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0bWVzc2FnZSA6IFwiXCJcblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0aGFuZGxlS2V5ZG93bjogZnVuY3Rpb24oZXZlbnQpe1xuXHRcdGlmKGV2ZW50LmtleUNvZGUgPT09IEVOVEVSX0tFWV9DT0RFKXtcblx0XHRcdHRoaXMuc2VuZCgpO1xuXHRcdH1cblx0fSxcblx0X3Njcm9sbFRvQm90dG9tOiBmdW5jdGlvbigpe1xuXHRcdHZhciBtZXNzYWdlX2JvYXJkID0gUmVhY3QuZmluZERPTU5vZGUodGhpcy5yZWZzLmFsbF9tZXNzYWdlcyk7XG5cdFx0JChtZXNzYWdlX2JvYXJkKS5zdG9wKCkuYW5pbWF0ZSh7XG5cdFx0XHRzY3JvbGxUb3A6IG1lc3NhZ2VfYm9hcmQuc2Nyb2xsSGVpZ2h0XG5cdFx0fSwgNTAwKTtcblx0fSxcblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbihldmVudCl7XG5cdFx0dmFyIHZhbHVlID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXHRcdGlmKHZhbHVlLmluZGV4T2YoXCJcXG5cIikgPiAtMSkgIHZhbHVlID0gdmFsdWUucmVwbGFjZShcIlxcblwiLFwiXCIpO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0bWVzc2FnZSA6IHZhbHVlXG5cdFx0fSk7XG5cdH0sXG5cdGhhbmRsZUVtb2ppQ2xpY2s6IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHR2YXIgZW1vamlJZCA9IGV2ZW50LmN1cnJlbnRUYXJnZXQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJyk7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRtZXNzYWdlOiB0aGlzLnN0YXRlLm1lc3NhZ2UgKyBcIls6XCIgKyBlbW9qaUlkICsgXCJdXCIsXG5cdFx0XHRpc0Vtb2ppU2hvdzogZmFsc2Vcblx0XHR9KTtcblx0XHRSZWFjdC5maW5kRE9NTm9kZSh0aGlzLnJlZnMudGV4dGFyZWEpLmZvY3VzKCk7XG5cdH0sXG5cdHNob3dIaWRlRW1vamk6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGlzU2hvd24gPSAhdGhpcy5zdGF0ZS5pc0Vtb2ppU2hvdztcblx0XHR0aGlzLnNldFN0YXRlKHsgaXNFbW9qaVNob3cgOiBpc1Nob3duIH0pO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0dmFyIGlzX21lc3NhZ2VzX2VtcHR5ID0gXy5pc0VtcHR5KHRoaXMucHJvcHMubWVzc2FnZXMpO1xuXHRcdHZhciBub19tZXNzYWdlX3N0eWxlID0gaXNfbWVzc2FnZXNfZW1wdHkgPyB7IGRpc3BsYXkgOiAnYmxvY2snfSA6IHsgZGlzcGxheSA6ICdub25lJ307XG5cdFx0dmFyIG1lc3NhZ2Vfc3R5bGUgPSBpc19tZXNzYWdlc19lbXB0eSA/IHsgZGlzcGxheSA6ICdub25lJ30gOiB7IGRpc3BsYXkgOiAnYmxvY2snfTtcblx0XHR2YXIgcmVuZGVyTWVzc2FnZSA9IGZ1bmN0aW9uKG1lc3NhZ2Upe1xuXHRcdFx0cmV0dXJuIFJlYWN0LmNyZWF0ZUVsZW1lbnQoTWVzc2FnZSwge3VzZXI6IG1lc3NhZ2UudXNlciwgbWVzc2FnZTogbWVzc2FnZS5tZXNzYWdlLCB0aW1lOiBtZXNzYWdlLnRpbWUsIHR5cGU6IG1lc3NhZ2UudHlwZX0pXG5cdFx0fVxuXHRcdHJldHVybiAoXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwibWVzc2FnZS1ib2FyZFwifSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXCIgQ29udmVyc2F0aW9uOiBcIiksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdtZXNzYWdlcyd9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwibm8tbWVzc2FnZVwiLCBzdHlsZTogbm9fbWVzc2FnZV9zdHlsZX0sIFxuXHRcdFx0XHRcdFx0XCJObyBuZXcgbWVzc2FnZXM6KVwiXG5cdFx0XHRcdFx0KSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImhhcy1tZXNzYWdlXCIsIHN0eWxlOiBtZXNzYWdlX3N0eWxlLCByZWY6IFwiYWxsX21lc3NhZ2VzXCJ9LCBcblx0XHRcdFx0XHRcdCB0aGlzLnByb3BzLm1lc3NhZ2VzLm1hcChyZW5kZXJNZXNzYWdlKVxuXHRcdFx0XHRcdClcblx0XHRcdFx0KSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJtZXNzYWdlcy1jb21wb3NlclwifSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcInRleHRhcmVhXCIsIHt2YWx1ZTogdGhpcy5zdGF0ZS5tZXNzYWdlLCBwbGFjZWhvbGRlcjogXCJ3aGF0IGRvIHlvdSB3YW50IHRvIHNheTopXCIsIG9uQ2hhbmdlOiB0aGlzLmhhbmRsZUNoYW5nZSwgb25LZXlEb3duOiB0aGlzLmhhbmRsZUtleWRvd24sIHJlZjogXCJ0ZXh0YXJlYVwifSksIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJidG5zXCJ9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJlbmhhbmNlLWJ0bnNcIn0sIFxuXHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLXNtaWxlLW9cIiwgb25DbGljazogdGhpcy5zaG93SGlkZUVtb2ppfSksIFxuXHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KEVtb2ppVmlldywge2lzRW1vamlTaG93OiB0aGlzLnN0YXRlLmlzRW1vamlTaG93LCBoYW5kbGVFbW9qaUNsaWNrOiB0aGlzLmhhbmRsZUVtb2ppQ2xpY2t9KSwgXG5cdFx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwiZmEgZmEtcGljdHVyZS1vXCIsIG9uQ2xpY2s6IFwiXCJ9KVxuXHRcdFx0XHRcdFx0KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIsIHtjbGFzc05hbWU6IFwiYnRuXCIsIHR5cGU6IFwiYnV0dG9uXCIsIG9uQ2xpY2s6IHRoaXMuc2VuZH0sIFxuXHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBcIlNlbmRcIilcblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpO1xuXHR9XG59KTtcblxudmFyIENoYXRXaW5kb3cgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6IFwiQ2hhdFdpbmRvd1wiLFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCl7XG5cdFx0c29ja2V0Lm9uKCdicm9hZGNhc3Q6bWVzc2FnZScsIHRoaXMubWVzc2FnZVJlY2VpdmUpO1xuXHRcdHNvY2tldC5vbigndXNlcjpqb2luJywgdGhpcy51c2VySm9pbmVkKTtcblx0XHRzb2NrZXQub24oJ3VzZXI6ZGlzY29ubmVjdCcsIHRoaXMudXNlckxvZ291dCk7XG5cdFx0cmV0dXJuIHt1c2VyczogW10sIG1lc3NhZ2VzOltdLCBub3RpZmljYXRpb246IHtcIjBcIjogZmFsc2V9fTtcblx0fSxcblx0Y29tcG9uZW50RGlkTW91bnQ6IGZ1bmN0aW9uKCl7XG5cdFx0JC5nZXQoJy91c2VycycsIGZ1bmN0aW9uKHJlc3VsdCkge1xuXHRcdFx0dmFyIG5vdGlmaWNhdGlvbiA9IHt9O1xuXHRcdFx0dmFyIGlkcyA9IF8ubWFwKHJlc3VsdCwgZnVuY3Rpb24ocmVzKXsgcmV0dXJuIHJlcy5pZH0pO1xuXHRcdFx0Xy5lYWNoKGlkcywgZnVuY3Rpb24oaWQpe25vdGlmaWNhdGlvbltpZF0gPSBmYWxzZX0pO1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7dXNlcnM6IHJlc3VsdCwgbm90aWZpY2F0aW9uOiBub3RpZmljYXRpb259KTtcblx0XHR9LmJpbmQodGhpcykpO1xuXHRcdFN0b3JlLmFkZE1lc3NhZ2VMaXN0ZW5lcih0aGlzLl91cGRhdGVNZXNzYWdlVmlldyk7XG5cdFx0U3RvcmUuYWRkVGhyZWFkTGlzdGVuZXIodGhpcy5fdXBkYXRlTWVzc2FnZVZpZXcpO1xuXHRcdFN0b3JlLmFkZE1lc3NhZ2VCcm9hZGNhc3RMaXN0ZW5lcih0aGlzLl9vbk1lc3NhZ2VDaGFuZ2UpO1xuXHR9LFxuXHRjb21wb25lbnRXaWxsVW5tb3VudDogZnVuY3Rpb24oKXtcblx0XHRTdG9yZS5yZW1vdmVNZXNzYWdlTGlzdGVuZXIodGhpcy5fdXBkYXRlTWVzc2FnZVZpZXcpO1xuXHRcdFN0b3JlLnJlbW92ZVRocmVhZExpc3RlbmVyKHRoaXMuX3VwZGF0ZU1lc3NhZ2VWaWV3KTtcblx0XHRTdG9yZS5yZW1vdmVNZXNzYWdlQnJvYWRjYXN0TGlzdGVuZXIodGhpcy5fb25NZXNzYWdlQ2hhbmdlKTtcblx0fSxcblx0bWVzc2FnZVJlY2VpdmU6IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdGRhdGEuYWN0aW9uVHlwZXMgPSBhY3Rpb25UeXBlcy5NRVNTQUdFX0JST0FEQ0FTVDtcblx0XHRkaXNwYXRjaGVyLmRpc3BhdGNoKGRhdGEpO1xuXHR9LFxuXHR1c2VyTG9nb3V0OiBmdW5jdGlvbihkYXRhKXtcblx0XHRpZihkYXRhKXtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHR1c2VyczogXy5yZWplY3QodGhpcy5zdGF0ZS51c2VycywgZnVuY3Rpb24odXNlcil7IHJldHVybiB1c2VyLmlkID09PSBkYXRhLmlkfSlcblx0XHRcdH0pO1xuXHRcdFx0U3RvcmUucmVtb3ZlTWVzc2FnZXMoZGF0YS5pZCk7XG5cdFx0XHRkaXNwYXRjaGVyLmRpc3BhdGNoKHtcblx0XHRcdFx0bWVzc2FnZSA6IGRhdGEubmFtZSArJyBoYXMgbGVmdCB0aGUgY2hhdHRpbmcgcm9vbTooJyxcblx0XHRcdFx0dHlwZSA6ICdhdXRvbWF0ZScsXG5cdFx0XHRcdGFjdGlvblR5cGVzIDogYWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5EXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cdHVzZXJKb2luZWQ6IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHRoaXMuc3RhdGUudXNlcnMucHVzaChkYXRhKTtcblx0XHR0aGlzLnN0YXRlLm5vdGlmaWNhdGlvbltkYXRhLmlkXSA9IGZhbHNlO1xuXHRcdGRpc3BhdGNoZXIuZGlzcGF0Y2goe1xuXHRcdFx0bWVzc2FnZSA6IGRhdGEubmFtZSArJyBqdXN0IGpvaW5lZCwgc2F5IGhlbGxvIScsXG5cdFx0XHR0eXBlIDogJ2F1dG9tYXRlJyxcblx0XHRcdGFjdGlvblR5cGVzIDogYWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5EXG5cdFx0fSk7XG5cdH0sXG5cdGhhbmRsZU1lc3NhZ2VTdWJtaXQgOiBmdW5jdGlvbihkYXRhKXtcblx0XHRkYXRhLmFjdGlvblR5cGVzID0gYWN0aW9uVHlwZXMuTUVTU0FHRV9TRU5EXG5cdFx0ZGlzcGF0Y2hlci5kaXNwYXRjaChkYXRhKTtcblx0XHRzb2NrZXQuZW1pdCgnc2VuZDptZXNzYWdlJywgZGF0YSk7XG5cdH0sXG5cdHJlbmRlciA6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2lkOiAnY2hhdC13aW5kb3cnfSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoVXNlckxpc3QsIHt1c2VyczogdGhpcy5zdGF0ZS51c2Vycywgbm90aWZpY2F0aW9uOiB0aGlzLnN0YXRlLm5vdGlmaWNhdGlvbn0pLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnbWVzc2FnZS1jb250YWluZXInfSwgXG5cdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChNZXNzYWdlTGlzdCwge21lc3NhZ2VzOiB0aGlzLnN0YXRlLm1lc3NhZ2VzLCBoYW5kbGVNZXNzYWdlU3VibWl0OiB0aGlzLmhhbmRsZU1lc3NhZ2VTdWJtaXR9KVxuXHRcdFx0XHQpLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChDb250YWN0LCBudWxsKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH0sXG5cdF91cGRhdGVNZXNzYWdlVmlldzogZnVuY3Rpb24oKXtcblx0XHR0aGlzLnNldFN0YXRlKHttZXNzYWdlczogU3RvcmUuYWxsTWVzc2FnZSgpfSk7XG5cdH0sXG5cdC8vIHNob3cgYSBub3RpZmljYXRpb24gd2hlbiByZWNlaXZpbmcgbWVzc2FnZXMgaWYgY3VycmVudCB0aHJlYWQgaXMgbm90IHRoZSB0YXJnZXQgdGhyZWFkXG5cdF9vbk1lc3NhZ2VDaGFuZ2U6IGZ1bmN0aW9uKGRhdGEpe1xuXHRcdHZhciB0aHJlYWRJZCA9IGRhdGEudGhyZWFkSWQ7XG5cdFx0dmFyIHNwbGl0cyA9IHRocmVhZElkLnNwbGl0KFwiX1wiKTtcblx0XHR2YXIgY3VycmVudF91c2VyX2lkID0gU3RvcmUuZ2V0Q3VycmVudFVzZXIoKS5pZC50b1N0cmluZygpO1xuXHRcdGlmKHRocmVhZElkICE9PSBTdG9yZS5nZXRUaHJlYWRJZCgpICYmIChfLmNvbnRhaW5zKHNwbGl0cywgY3VycmVudF91c2VyX2lkKSB8fCB0aHJlYWRJZCA9PT0gJzAnKSl7XG5cdFx0XHR2YXIgaWQgPSBudWxsO1xuXHRcdFx0aWYodGhyZWFkSWQgPT09IFwiMFwiKXtcblx0XHRcdFx0aWQgPSB0aHJlYWRJZDtcblx0XHRcdH1lbHNle1xuXHRcdFx0XHR2YXIgd2l0aG91dF9jdXJyZW50X3VzZXIgPSBfLndpdGhvdXQoc3BsaXRzLCBjdXJyZW50X3VzZXJfaWQpO1xuXHRcdFx0XHRpZCA9IHdpdGhvdXRfY3VycmVudF91c2VyWzBdO1xuXHRcdFx0fVxuXHRcdFx0dGhpcy5zdGF0ZS5ub3RpZmljYXRpb25baWRdID0gdHJ1ZTtcblx0XHR9XG5cdFx0dGhpcy5fdXBkYXRlTWVzc2FnZVZpZXcoKTtcblx0fVxufSk7XG52YXIgTG9naW5Gb3JtID0gUmVhY3QuY3JlYXRlQ2xhc3Moe2Rpc3BsYXlOYW1lOiBcIkxvZ2luRm9ybVwiLFxuXHRhdmF0YXJfaW5kZXggOiAxLFxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIHtcblx0XHRcdGJ0bkRpc3BsYXk6ICdub25lJyxcblx0XHRcdG5hbWUgOiBcIlwiLFxuXHRcdFx0aXNOZXh0U3RlcCA6IGZhbHNlXG5cdFx0fVxuICBcdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHQgUmVhY3QuZmluZERPTU5vZGUodGhpcy5yZWZzLmxvZ2luX2lucHV0KS5mb2N1cygpO1xuIFx0fSxcblx0aGFuZGxlS2V5ZG93bjogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZihldmVudC5rZXlDb2RlID09PSBFTlRFUl9LRVlfQ09ERSl7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtpc05leHRTdGVwOiB0cnVlfSk7XG5cdFx0fVxuICBcdH0sXG5cdGhhbmRsZUNsaWNrOiBmdW5jdGlvbigpe1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBuYW1lID0gdGhpcy5zdGF0ZS5uYW1lLnRyaW0oKTtcblx0XHR2YXIgYXZhdGFyID0gdGhpcy5zdGF0ZS5hdmF0YXI7XG5cdFx0aWYgKG5hbWUpIHtcblx0XHRcdHZhciBkYXRhID0ge25hbWU6IG5hbWUsIGF2YXRhcjogYXZhdGFyfTtcblx0XHRcdHNvY2tldC5lbWl0KCdsb2dpbicsIGRhdGEsIGZ1bmN0aW9uKHJlcyl7XG5cdFx0XHRcdGlmKCFyZXMpe1xuXHRcdFx0XHRcdGFsZXJ0KCdZb3VyIG5hbWUgaGFzIGJlZW4gdXNlZCBieSBvdGhlcnMsIHBsZWFzZSB1c2UgYW5vdGhlciBuYW1lLicpO1xuXHRcdFx0XHRcdHNlbGYuc2V0U3RhdGUoe2lzTmV4dFN0ZXA6IGZhbHNlLCBidG5EaXNwbGF5OiBcIm5vbmVcIn0pO1xuXHRcdFx0XHR9ZWxzZXtcblx0XHRcdFx0XHQkLmFqYXgoe1xuXHRcdFx0XHRcdFx0dHlwZSA6IFwicG9zdFwiLFxuXHRcdFx0XHRcdFx0dXJsOiBcIi9sb2dpblwiLFxuXHRcdFx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0XHRcdGNvbnRlbnRUeXBlOiBcImFwcGxpY2F0aW9uL2pzb25cIixcblx0XHRcdFx0XHRcdGRhdGEgOiBKU09OLnN0cmluZ2lmeShkYXRhKSxcblx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKHVzZXIpe1xuXHRcdFx0XHRcdFx0XHR1c2VyLmFjdGlvblR5cGVzID0gYWN0aW9uVHlwZXMuTE9HSU47XG5cdFx0XHRcdFx0XHRcdGRpc3BhdGNoZXIuZGlzcGF0Y2godXNlcik7XG5cdFx0XHRcdFx0XHRcdFJlYWN0LnJlbmRlcihSZWFjdC5jcmVhdGVFbGVtZW50KENoYXRXaW5kb3csIG51bGwpLCAkKCdib2R5JylbMF0pO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0pXG5cdFx0XHRcdH1cblx0XHRcdH0pO1xuXHRcdH1cblx0fSxcblx0aGFuZGxlQ2hhbmdlOiBmdW5jdGlvbihldmVudCl7XG5cdFx0dmFyIHRleHQgPSBldmVudC50YXJnZXQudmFsdWU7XG5cdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRuYW1lIDogdGV4dFxuXHRcdH0pO1xuXHR9LFxuXHRhdmF0YXJOYXZMZWZ0OiBmdW5jdGlvbigpe1xuXHRcdGlmKHRoaXMuYXZhdGFyX2luZGV4IDwgQVZBVEFSX1NDUk9MTF9MSU1JVCl7XG5cdFx0XHQkKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMucmVmcy5hdmF0YXJOYXYpKS5hbmltYXRlKHsncmlnaHQnOicrPScgKyBTQ1JPTExfR0FQX1dJRFRIICsgJ3B4J30pO1xuXHRcdFx0dGhpcy5hdmF0YXJfaW5kZXgrKztcblx0XHR9XG5cdH0sXG5cdGF2YXRhck5hdlJpZ2h0OiBmdW5jdGlvbigpe1xuXHRcdGlmKHRoaXMuYXZhdGFyX2luZGV4ID4gMSl7XG5cdFx0XHQkKFJlYWN0LmZpbmRET01Ob2RlKHRoaXMucmVmcy5hdmF0YXJOYXYpKS5hbmltYXRlKHsncmlnaHQnOictPScgKyBTQ1JPTExfR0FQX1dJRFRIICsgJ3B4J30pO1xuXHRcdFx0dGhpcy5hdmF0YXJfaW5kZXgtLTtcblx0XHR9XG5cdH0sXG5cdC8vIG1heWJlIG5vdCBhIHJlYWN0IHdheSwgd2lsbCBmaW5kIGEgZ29vZCB3YXkgdG8gZG8gdGhpc1xuXHRzZWxlY3RBdmF0YXI6IGZ1bmN0aW9uKGV2ZW50KXtcblx0XHR2YXIgaWQgPSAkKGV2ZW50LmN1cnJlbnRUYXJnZXQpLmF0dHIoJ2RhdGEtaWQnKTtcblx0XHRfLmVhY2goJCh0aGlzLnJlZnMuYXZhdGFyTmF2LmdldERPTU5vZGUoKSkuY2hpbGRyZW4oKSwgZnVuY3Rpb24oY2hpbGQpe1xuXHRcdFx0Y2hpbGQuY2xhc3NOYW1lID0gY2hpbGQuZ2V0QXR0cmlidXRlKCdkYXRhLWlkJykgPT09IGlkID8gXCJhdmF0YXIgYWN0aXZlXCIgOiBcImF2YXRhclwiO1xuXHRcdH0pO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0YnRuRGlzcGxheTogJ2Jsb2NrJyxcblx0XHRcdGF2YXRhcjogaWRcblx0XHR9KTtcblx0fSxcbiAgXHRyZW5kZXIgOiBmdW5jdGlvbigpe1xuXHQgIFx0dmFyIHN0eWxlID0gdGhpcy5wcm9wcy5pc0xvZ2luID8geyBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ30gOiB7IGRpc3BsYXk6ICdub25lJ307XG5cdCAgXHR2YXIgY3ggPSBSZWFjdC5hZGRvbnMuY2xhc3NTZXQ7XG5cdCAgXHR2YXIgaW50cm9DbGFzc2VzID0gY3goe1xuXHRcdCAgJ2ludHJvRm9ybSc6IHRydWUsXG5cdFx0ICAnZmFkZSc6IHRoaXMuc3RhdGUuaXNOZXh0U3RlcFxuXHQgIFx0fSk7XG5cdCAgXHR2YXIgYXZhdGFyQ2xhc3NlcyA9IGN4KHtcblx0XHQgICdhdmF0YXJGb3JtJyA6IHRydWUsXG5cdFx0ICAnYWN0aXZlJzogdGhpcy5zdGF0ZS5pc05leHRTdGVwXG5cdCAgXHR9KTtcblx0XHRyZXR1cm4gKFxuXHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7aWQ6ICdsb2dpbi13aW5kb3cnLCBzdHlsZTogc3R5bGV9LCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBpbnRyb0NsYXNzZXN9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdncmVldGluZyd9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwiZmEgZmEtY29tbWVudGluZy1vXCJ9KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiaW5saW5lXCJ9LCAnSGksIHdoYXTigJlzIHlvdXIgbmFtZT8nKVxuXHRcdFx0XHRcdCksIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ2lucHV0J30sIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1jb21tZW50aW5nLW9cIn0pLCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogJ2lucHV0J30sIFxuXHRcdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIiwge2NsYXNzTmFtZTogXCJpbmxpbmVcIiwgdHlwZTogXCJ0ZXh0XCIsIHZhbHVlOiB0aGlzLnN0YXRlLm5hbWUsIHJlZjogXCJsb2dpbl9pbnB1dFwiLCBkaXNhYmxlZDogdGhpcy5zdGF0ZS5pc05leHRTdGVwLCBvbkNoYW5nZTogdGhpcy5oYW5kbGVDaGFuZ2UsIG9uS2V5RG93bjogdGhpcy5oYW5kbGVLZXlkb3dufSlcblx0XHRcdFx0XHRcdClcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IGF2YXRhckNsYXNzZXMsIHJlZjogXCJhdmF0YXJcIn0sIFxuXHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwgbnVsbCwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcImZhIGZhLWNvbW1lbnRpbmctb1wifSksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiBcImlubGluZVwifSwgJ1BpY2sgeW91ciBmYXZvcml0ZSBhdmF0YXIuJylcblx0XHRcdFx0XHQpLCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6IFwiYXZhdGFyLXNlbGVjdG9yXCJ9LCBcblx0XHRcdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJpXCIsIHtjbGFzc05hbWU6IFwibmF2IGZhIGZhLWFuZ2xlLWxlZnQgZmEtbGdcIiwgb25DbGljazogdGhpcy5hdmF0YXJOYXZMZWZ0fSksIFxuXHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnYXZhdGFyLWNvbnRhaW5lci1vdXRlcid9LCBcblx0XHRcdFx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7Y2xhc3NOYW1lOiAnYXZhdGFyLWNvbnRhaW5lci1pbm5lcicsIHJlZjogXCJhdmF0YXJOYXZcIn0sIFxuXHRcdFx0XHRcdFx0XHRcdF8udmFsdWVzKGF2YXRhcnMpLm1hcChmdW5jdGlvbihhdmF0YXIpIHtcblx0XHRcdFx0XHRcdFx0XHRcdHZhciBzdHlsZSA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0J2JhY2tncm91bmRQb3NpdGlvbic6IGF2YXRhci5iYWNrZ3JvdW5kX3Bvc2l0aW9uXG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm4gUmVhY3QuY3JlYXRlRWxlbWVudChcImRpdlwiLCB7a2V5OiBhdmF0YXIuYXZhdGFyX2lkLCBcImRhdGEtaWRcIjogYXZhdGFyLmF2YXRhcl9pZCwgY2xhc3NOYW1lOiAnYXZhdGFyJywgb25DbGljazogdGhpcy5zZWxlY3RBdmF0YXIsIHN0eWxlOiBzdHlsZX0pO1xuXHRcdFx0XHRcdFx0XHRcdH0uYmluZCh0aGlzKSlcblx0XHRcdFx0XHRcdFx0KVxuXHRcdFx0XHRcdFx0KSwgXG5cdFx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiaVwiLCB7Y2xhc3NOYW1lOiBcIm5hdiBmYSBmYS1hbmdsZS1yaWdodCBmYS1sZ1wiLCBvbkNsaWNrOiB0aGlzLmF2YXRhck5hdlJpZ2h0fSlcblx0XHRcdFx0XHQpXG5cdFx0XHRcdCksIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiYnV0dG9uXCIsIHtjbGFzc05hbWU6ICdidG4nLCB0eXBlOiBcImJ1dHRvblwiLCBzdHlsZToge2Rpc3BsYXk6IHRoaXMuc3RhdGUuYnRuRGlzcGxheX0sIG9uQ2xpY2s6IHRoaXMuaGFuZGxlQ2xpY2t9LCBcblx0XHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwic3BhblwiLCBudWxsLCBcIlN0YXJ0IGNoYXR0aW5nIVwiKVxuXHRcdFx0XHQpXG5cdFx0XHQpXG5cdFx0XHQpO1xuICBcdH1cbn0pO1xudmFyIENvbnRhY3QgPSBSZWFjdC5jcmVhdGVDbGFzcyh7ZGlzcGxheU5hbWU6IFwiQ29udGFjdFwiLFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCl7XG5cdFx0cmV0dXJuIChcblx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIiwge2NsYXNzTmFtZTogXCJjb250YWN0XCJ9LCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChcImlcIiwge2NsYXNzTmFtZTogXCJmYSBmYS1jb3B5cmlnaHRcIn0sIFwiIFwiKSwgXG5cdFx0XHRcdFJlYWN0LmNyZWF0ZUVsZW1lbnQoXCJzcGFuXCIsIG51bGwsIFxuXHRcdFx0XHRcdFwiTWFkZSBieSBcIiwgUmVhY3QuY3JlYXRlRWxlbWVudChcImFcIiwge2hyZWY6IFwiaHR0cHM6Ly9naXRodWIuY29tL2phbWVzbWFuMTFcIn0sIFwiSmFtZXMgTWFuXCIpXG5cdFx0XHRcdClcblx0XHRcdClcblx0XHQpXG5cdH1cbn0pXG52YXIgQ2hhdEFwcCA9IFJlYWN0LmNyZWF0ZUNsYXNzKHtkaXNwbGF5TmFtZTogXCJDaGF0QXBwXCIsXG5cdGdldEluaXRpYWxTdGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgXHRyZXR1cm4ge2lzTG9naW46IHRydWV9O1xuICBcdH0sXG5cdGNvbXBvbmVudERpZE1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRTdG9yZS5hZGRMb2dpbkxpc3RlbmVyKHRoaXMuX29uTG9naW4pO1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRTdG9yZS5yZW1vdmVMb2dpbkxpc3RlbmVyKHRoaXMuX29uTG9naW4pO1xuXHR9LFxuXHRyZW5kZXIgOiBmdW5jdGlvbigpe1xuXHRcdHJldHVybiAoXG5cdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KFwiZGl2XCIsIHtjbGFzc05hbWU6ICdtYWluJ30sIFxuXHRcdFx0XHRSZWFjdC5jcmVhdGVFbGVtZW50KExvZ2luRm9ybSwge2lzTG9naW46IHRoaXMuc3RhdGUuaXNMb2dpbn0pLCBcblx0XHRcdFx0UmVhY3QuY3JlYXRlRWxlbWVudChDb250YWN0LCBudWxsKVxuXHRcdFx0KVxuXHRcdCk7XG5cdH0sXG5cdF9vbkxvZ2luOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnNldFN0YXRlKHtpc0xvZ2luOiBmYWxzZX0pO1xuXHR9XG59KVxuUmVhY3QucmVuZGVyKFJlYWN0LmNyZWF0ZUVsZW1lbnQoQ2hhdEFwcCwgbnVsbCksICQoJ2JvZHknKVswXSk7XG4iXX0=
