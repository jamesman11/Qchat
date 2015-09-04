var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    users = [],
    _ = require('underscore')._;
app.use(express.bodyParser());
app.use('/', express.static(__dirname + '/src'));
app.get('/users', function(req, res){
  res.setHeader('Cache-Control', 'no-cache');
  res.json(UserNamesHelper.getAll());
});
app.post('/login', function(req, res){
  res.json(UserNamesHelper.find(req.body.name));
})
server.listen(process.env.PORT || 3000);

var UserNamesHelper = (function () {
  var users = {};
  var nextUserId = 1;
  var contain = function(name){
    return _.has(users, name);
  };
  var getAll = function () {
    return _.values(users);
  };
  var find = function(name){
    return users[name];
  }
  var add = function(data){
    var name = data.name;
    data.id = nextUserId;
    users[name] = data;
    nextUserId++;
    return data;
  };
  var remove = function(data){
    delete users[data.name];
  };
  return {
    add: add,
    find: find,
    getAll: getAll,
    contain: contain,
    remove: remove
  };
}());
var MessageHelper = (function(){
  var user_messages = {};
  var add = function(data){
    if(!user_messages[data.threadId]) user_messages[data.threadId];
    user_messages[data.threadId].push(data);
  };
  var getUserMessages = function(threadId){
    return user_messages[threadId];
  };
  return {
    add: add,
    getUserMessages: getUserMessages
  }
}());
io.sockets.on('connection', function(socket){
  socket.on('send:message', function (data) {
    MessageHelper.add(data);
    socket.broadcast.emit('broadcast:message', data);
  });
  socket.on('login', function(data, callback){
    var name = data.name;
    if(UserNamesHelper.contain(name)){
      callback(false);
    }else{
      var new_user = UserNamesHelper.add(data);
      socket.current_user = data;
      callback(true);
      socket.broadcast.emit('user:join', new_user);
    }
  });
  // remove user and all related messages
  socket.on('disconnect', function () {
    var user = socket.current_user;
    if(user) UserNamesHelper.remove(user);
    socket.broadcast.emit('user:disconnect', user);
  });
});
