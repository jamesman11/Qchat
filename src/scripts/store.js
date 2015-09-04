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