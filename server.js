var express = require('express'),
    app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    fs = require('fs'),
    users = [],
    _ = require('underscore')._;
//specify the html we will use
app.use('/', express.static(__dirname + '/src'));
app.get('/comments.json', function(req, res) {
  fs.readFile('comments.json', function(err, data) {
    res.setHeader('Cache-Control', 'no-cache');
    res.json(JSON.parse(data));
  });
});

app.post('/comments.json', function(req, res) {
  fs.readFile('comments.json', function(err, data) {
    var comments = JSON.parse(data);
    comments.push(req.body);
    fs.writeFile('comments.json', JSON.stringify(comments, null, 4), function(err) {
      res.setHeader('Cache-Control', 'no-cache');
      res.json(comments);
    });
  });
});
app.get('/users', function(req, res){
  res.setHeader('Cache-Control', 'no-cache');
  res.json(userNames.get_all());
})
server.listen(process.env.PORT || 3000);

var userNames = (function () {
  var users = {};
  var nextUserId = 1;
  var contain = function(name){
    return _.has(users, name);
  };
  var get_all = function () {
    return _.values(users);
  };

  var free = function (name) {
    if (names[name]) {
      delete names[name];
    }
  };
  var add = function(data){
    var name = data.name;
    data.id = nextUserId;
    users[name] = data;
    nextUserId++;
  };
  return {
    free: free,
    add: add,
    get_all: get_all,
    contain: contain
  };
}());
io.sockets.on('connection', function(socket){
  socket.on('send:message', function (data) {
    socket.broadcast.emit('send:message', {
      user: data.user,
      message: data.message
    });
  });
  socket.on('login', function(data, callback){
    var name = data.name;
    if(userNames.contain(name)){
      callback(false);
    }else{
      userNames.add(data);
      callback(true);
      socket.broadcast.emit('user:join', {
        name: name
      });
    }
  });
});
