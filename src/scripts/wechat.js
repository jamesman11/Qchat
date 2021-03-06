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
var UserList = React.createClass({
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
			<div className={'users'}>
				<div> Online Users </div>
				<div className={'home'}><i/></div>
				<div className={'users-list'} ref={'userList'}>
					<div className={'user-profile home active'} data-id={'0'} data-type={'home'} onClick={this.handleClick}>
						<i className={'user-avatar home'}></i>
						<div className={'user-name'}> { 'All Users' } </div>
						<i className={"fa fa-commenting-o"} style={{display: this.getNotificationStyle('0')}} ></i>
					</div>
					{this.props.users.map(function(user) {
						var style = { 'backgroundPosition': avatars_small[user.avatar].background_position };
						return (
							<div className={'user-profile'} data-type={'user'} data-id={user.id} onClick={this.handleClick}>
								<div className={'user-avatar'} style={style}></div>
								<div className={'user-name'}> { this.getName(user) } </div>
								<i className={"fa fa-commenting-o"} style={{display: this.getNotificationStyle(user.id)}}></i>
							</div>);
					}.bind(this))}
				</div>
			</div>
		)
	}
})
var Message = React.createClass({
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
				<div className={"message automate"}>
					<div className='automate-message'>{this.props.message}</div>
				</div>
			)
		}else{
			var user = this.props.user;
			var style = { 'backgroundPosition': avatars_small[user.avatar].background_position };
			var output = (
				<div className={"message"}>
					<div className='user-avatar' style={style}></div>
					<div className='user-name'> { user.name } <span className={'time'}>sent at {this.props.time}</span></div>
					{(() => {
						if(this.props.type === 'image'){
							return (
								<div className='content'>
									<img className="sent-image" src={this.props.image}/>
								</div>
							)
						}else{
							return (
								<div className='content'>
									<i className='fa fa-play'></i>
									<div className='inline-message' dangerouslySetInnerHTML={convertMessage(this.props.message)} />
								</div>
							)
						}
					})()}
				</div>
			)
		}
		return output;

	}
});
var EmojiView = React.createClass({
	render: function(){
		var style = this.props.isEmojiShow ? { display : "block"} : { display : "none"};
		return (
			<div className='emoji' style={style}>
				{
					_.range(2,34).map(function(row){
						return <img src={'../content/emoji/' + row + '.png'} data-id={row} onClick={this.props.handleEmojiClick}/>
					}.bind(this))
					}
			</div>
		);
	}
});
var MessageList = React.createClass({
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
			return <Message user={data.user} message={data.message} image={data.image} time={data.time} type={data.type}/>
		}
		return (
			<div className='message-board'>
				<div> Conversation: </div>
				<div className={'messages'}>
					<div className="no-message" style={no_message_style}>
						No new messages:)
					</div>
					<div className="has-message" style={message_style} ref="all_messages">
						{ this.props.messages.map(renderMessage)}
					</div>
				</div>
				<div className='messages-composer'>
					<textarea value={this.state.message} placeholder="what do you want to say:)" onChange={this.handleChange} onKeyDown={this.handleKeydown} ref='textarea'/>
					<div className='btns'>
						<div className='enhance-btns'>
							<i className="fa fa-smile-o" onClick={this.showHideEmoji}></i>
							<EmojiView isEmojiShow={this.state.isEmojiShow} handleEmojiClick={this.handleEmojiClick}/>
							<i className="fa fa-picture-o">
								<form className="imageUploader" onSubmit={this.handleSubmit} encType="multipart/form-data">
									<input type="file" onChange={this.handleFile} />
								</form>
							</i>
						</div>
						<button className='btn' type="button" onClick={this.send}>
							<span>Send</span>
						</button>
					</div>
				</div>
			</div>
		);
	}
});

var ChatWindow = React.createClass({
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
			<div id={'chat-window'}>
				<UserList users={this.state.users} notification={this.state.notification}/>
				<div className={'message-container'}>
					<MessageList messages={this.state.messages} handleMessageSubmit={this.handleMessageSubmit}/>
				</div>
				<Contact/>
			</div>
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
var LoginForm = React.createClass({
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
							React.render(<ChatWindow/>, $('body')[0]);
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
			<div id={'login-window'} style={style}>
				<div className={introClasses}>
					<div className={'greeting'}>
						<i className={"fa fa-commenting-o"}></i>
						<div className={"inline"}>{'Hi, what’s your name?'}</div>
					</div>
					<div className={'input'}>
						<i className={"fa fa-commenting-o"}></i>
						<div className={'input'}>
							<input className={"inline"} type="text" value={this.state.name} ref="login_input" disabled={this.state.isNextStep} onChange={this.handleChange} onKeyDown={this.handleKeydown}/>
						</div>
					</div>
				</div>
				<div className={avatarClasses} ref="avatar">
					<div>
						<i className={"fa fa-commenting-o"}></i>
						<div className={"inline"}>{'Pick your favorite avatar.'}</div>
					</div>
					<div className="avatar-selector">
						<i className={"nav fa fa-angle-left fa-lg"} onClick={this.avatarNavLeft}></i>
						<div className={'avatar-container-outer'}>
							<div className={'avatar-container-inner'} ref="avatarNav">
								{_.values(avatars).map(function(avatar) {
									var style = {
										'backgroundPosition': avatar.background_position
									}
									return <div key={avatar.avatar_id} data-id = {avatar.avatar_id} className={'avatar'} onClick={this.selectAvatar} style={style}></div>;
								}.bind(this))}
							</div>
						</div>
						<i className={"nav fa fa-angle-right fa-lg"} onClick={this.avatarNavRight}></i>
					</div>
				</div>
				<button className={'btn'} type="button" style={{display: this.state.btnDisplay}} onClick={this.handleClick}>
					<span>Start chatting!</span>
				</button>
			</div>
			);
  	}
});
var Contact = React.createClass({
	render: function(){
		return (
			<div className="contact">
				<i className="fa fa-copyright"> </i>
				<span>
					Made by <a href="https://github.com/jamesman11">James Man</a>
				</span>
			</div>
		)
	}
})
var ChatApp = React.createClass({
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
			<div className={'main'}>
				<LoginForm isLogin={this.state.isLogin}/>
				<Contact/>
			</div>
		);
	},
	_onLogin: function() {
		this.setState({isLogin: false});
	}
})
React.render(<ChatApp/>, $('body')[0]);
