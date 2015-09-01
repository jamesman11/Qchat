var socket = io.connect();
var ENTER_KEY_CODE = 13;
var actions = require('./actions');
var Store = require('./store');
var dispatcher = require('./dispatcher');
var helperUtil = require('./helperUtil');
var actionTypes = helperUtil.ActionTypes;
var avatars = helperUtil.Avatars;
var avatars_small = helperUtil.Avatars_small;
var AVATAR_SCROLL_LIMIT = 3;
var SCROLL_GAP_WIDTH = 171;
var UserList = React.createClass({
	render: function(){
		return(
			<div className={'users'}>
				<div> Online Users </div>
				<div className={'users-list'}>
					{this.props.users.map(function(user) {
						var style = { 'backgroundPosition': avatars_small[user.avatar].background_position }
						return (
							<div className={'user-profile'}>
								<div className={'user-avatar'} style={style}></div>
								<div className={'user-name'}> { user.name } </div>
							</div>);
					}.bind(this))}
				</div>
			</div>
		)
	}
})
var Message = React.createClass({
	render: function(){
		return(
			<div className={"message"}>
				<strong>{this.props.user.name}</strong> :
				{this.props.message}
			</div>
		)
	}
});

var MessageList = React.createClass({
	getInitialState: function(){
		return {
			message : ""
		}
	},
	componentDidMount: function() {
		React.findDOMNode(this.refs.textarea).focus();
	},
	send: function(){
		var data = {
			message : this.state.message,
			user : Store.current_user()
		}
		this.props.handleMessageSubmit(data);
	},
	handleKeydown: function(){
		if(event.keyCode === ENTER_KEY_CODE){
			this.send();
		}
	},
	handleChange: function(event){
		this.setState({
			message : event.target.value
		});
	},
	render: function(){
		var is_messages_empty = _.isEmpty(this.props.messages);
		var no_message_style = is_messages_empty ? { display : 'block'} : { display : 'none'};
		var message_style = is_messages_empty ? { display : 'none'} : { display : 'block'};
		var renderMessage = function(message){
			return <Message user={message.user} message={message.message} />
		}
		return (
			<div className='message-board'>
				<div> Conversation: </div>
				<div className={'messages'}>
					<div className="no-message" style={no_message_style}>
						No new messages:)
					</div>
					<div className="has-message" style={message_style}>
						{ this.props.messages.map(renderMessage)}
					</div>
				</div>
				<div className='messages-composer'>
					<textarea value={this.state.name} onChange={this.handleChange} onKeyDown={this.handleKeydown} ref='textarea'/>
					<div className='send-btn'>
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
		socket.on('send:message', this.messageRecieve);
		socket.on('user:join', this.userJoined);
		return {users: [], messages:[]};
	},
	componentDidMount: function(){
		$.get('/users', function(result) {
			this.setState({users: result});
		}.bind(this));
	},
	messageRecieve: function(data){
		this.state.messages.push(data);
	},
	userJoined: function(data){
		this.state.users.push(data.name);
		this.state.messages.push({
			user: 'APPLICATION BOT',
			message : data.user.name +' just joined'
		});
	},
	handleMessageSubmit : function(data){
		this.state.messages.push(data);
		socket.emit('send:message', data);
	},
	render : function(){
		return (
			<div id={'chat-window'}>
				<UserList users={this.state.users} />
				<div className={'message-container'}>
					<MessageList messages={this.state.messages} handleMessageSubmit={this.handleMessageSubmit}/>
				</div>
			</div>
		);
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
			socket.emit('login', {name: name, avatar: avatar}, function(res){
				if(!res){
					alert('Your name has been used by others, please use another name.');
					self.setState({isNextStep: false, btnDisplay: "none"});
				}else{
					dispatcher.dispatch({
						type: actionTypes.LOGIN,
						name: name,
						avartar: avatar
					});
					React.render(<ChatWindow/>, $('body')[0]);
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
			</div>
		);
	},
	_onLogin: function() {
		this.setState({isLogin: false});
	}
})
React.render(<ChatApp/>, $('body')[0]);
