var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var dispatcher = require('./dispatcher');
var ActionTypes = require('./helperUtil').ActionTypes;
var users = [];
var Store = assign({}, EventEmitter.prototype, {

    emitLogin: function() {
        this.emit(ActionTypes.LOGIN);
    },

    /**
     * @param {function} callback
     */
    addLoginListener: function(callback) {
        this.on(ActionTypes.LOGIN, callback);
    },

    removeLoginListener: function(callback) {
        this.removeListener(ActionTypes.LOGIN, callback);
    }
});

Store.dispatchToken = dispatcher.register(function(data) {
    switch(data.type) {
        case ActionTypes.LOGIN:
            Store.emitLogin();
            break;

        default:
        // do nothing
    }

});

module.exports = Store;