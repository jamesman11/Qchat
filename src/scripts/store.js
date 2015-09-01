var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var dispatcher = require('./dispatcher');
var ActionTypes = require('./helperUtil').ActionTypes;
var current_user = {};
var users = {};
var messages = {};
var Store = assign({}, EventEmitter.prototype, {
    emitLogin: function(data) {
        current_user = data;
        this.emit(ActionTypes.LOGIN);
    },
    addLoginListener: function(callback) {
        this.on(ActionTypes.LOGIN, callback);
    },

    removeLoginListener: function(callback) {
        this.removeListener(ActionTypes.LOGIN, callback);
    },
    current_user: function(){
        return current_user;
    }
});

Store.dispatchToken = dispatcher.register(function(data) {
    switch(data.type) {
        case ActionTypes.LOGIN:
            Store.emitLogin(data);
            break;
        default:
    }
});

module.exports = Store;