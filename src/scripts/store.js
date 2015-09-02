var EventEmitter = require('events').EventEmitter;
var assign = require('object-assign');
var dispatcher = require('./dispatcher');
var ActionTypes = require('./helperUtil').ActionTypes;
var current_user = {};
var users = {};
var messages = [];
var Store = assign({}, EventEmitter.prototype, {
    emitLogin: function(data) {
        current_user = data;
        this.emit(ActionTypes.LOGIN);
    },
    emitMessageSend: function(data){
        messages.push(data);
        this.emit(ActionTypes.MESSAGE_SEND);
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
    getCurrentUser: function(){
        return current_user;
    },
    allMessage: function(){
        return messages;
    },
    addMessage: function(data){
        this.emitMessageSend(data);
    }
});

Store.dispatchToken = dispatcher.register(function(data) {
    switch(data.type) {
        case ActionTypes.LOGIN:
            Store.emitLogin(data);
            break;
        case ActionTypes.MESSAGE_SEND:
            Store.emitMessageSend(data);
            break;
        default:
    }
});

module.exports = Store;