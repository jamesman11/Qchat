var socket = io.connect();
var ENTER_KEY_CODE = 13;
var actions = require('./actions');
var Store = require('./store');
var dispatcher = require('./dispatcher');
var helperUtil = require('./helperUtil');
var actionTypes = helperUtil.ActionTypes;
var avatars = helperUtil.Avatars;
var AVATAR_SCROLL_LIMIT = 3;
var SCROLL_GAP_WIDTH = 171;
var UsersList = React.createClass({
	render: function(){
		var renderUser = function(user){
			return <li> { user } </li>
		};
		return (
			<div class='users'>
				<h3> Online Users </h3>
				<ul>{ this.props.users.map(renderUser)} </ul>
			</div>
		);
	}
});

var Message = React.createClass({
	render: function(){
		return(
			<div class="message">
				<strong>{this.props.user}</strong> :
				{this.props.text}
			</div>
		)
	}
});

var MessageList = React.createClass({
	render: function(){
		var renderMessage = function(message){
			return <Message user={message.user} text={message.text} />
		}
		return (
			<div class='messages'>
				<h2> Conversation: </h2>
				{ this.props.messages.map(renderMessage)}
			</div>
		);
	}
});

var MessageForm = React.createClass({

	getInitialState: function(){
		return {text: ''};
	},

	handleSubmit : function(e){
		e.preventDefault();
		var message = {
			user : this.props.user,
			text : this.state.text
		}
		this.props.onMessageSubmit(message);
		this.setState({ text: '' });
	},

	changeHandler : function(e){
		this.setState({ text : e.target.value });
	},

	render: function(){
		return(
			<div class='message_form'>
				<h3>Write New Message</h3>
				<form onSubmit={this.handleSubmit}>
					<input onChange={this.changeHandler} value={this.state.text} />
				</form>
			</div>
		);
	}
});

var ChangeNameForm = React.createClass({
	getInitialState: function(){
		return {newName: ''};
	},

	onKey : function(e){
		this.setState({ newName : e.target.value });
	},

	handleSubmit : function(e){
		e.preventDefault();
		var newName = this.state.newName;
		this.props.onChangeName(newName);
		this.setState({ newName: '' });
	},

	render: function(){
		return(
			<div class='change_name_form'>
				<h3> Change Name </h3>
				<form onSubmit={this.handleSubmit}>
					<input onChange={this.onKey} value={this.state.newName} />
				</form>
			</div>
		);
	}
});

var ChatWindow = React.createClass({
	getInitialState: function(){
		socket.on('send:message', this.messageRecieve);
		socket.on('user:join', this.userJoined);
		socket.on('user:left', this.userLeft);
		return {users: [], messages:[], text: ''};
	},
	messageRecieve: function(message){
		this.state.messages.push(message);
		this.setState();
	},
	userJoined: function(data){
		this.state.users.push(data.name);
		this.state.messages.push({
			user: 'APLICATION BOT',
			text : data.name +' Joined'
		});
		this.setState();
	},

	userLeft: function(data){
		var index = this.state.users.indexOf(data.name);
		this.state.users.splice(index, 1);
		this.state.messages.push({
			user: 'APLICATION BOT',
			text : data.name +' Left'
		});
		this.setState();

	},

	handleMessageSubmit : function(message){
		this.state.messages.push(message);
		this.setState();

		socket.emit('send:message', message);
	},

	handleChangeName : function(newName){
		var that = this;
		var oldName = this.state.user;
		socket.emit('change:name', { name : newName}, function(result){
			if(!result){
				alert('There was an error changing your name');
			}else{
				var index = that.state.users.indexOf(oldName);
				that.state.users.splice(index, 1, newName);
				that.setState();
			}
		});
	},

	render : function(){
		var style = this.props.isLogin ? { display: 'none'} : { display: 'inline-block'}
		return (
			<div id={'chat-window'} style={style}>
				<UsersList users={this.state.users} />
				<MessageList messages={this.state.messages} />
				<MessageForm onMessageSubmit={this.handleMessageSubmit} user={this.state.user} />
				<ChangeNameForm onChangeName={this.handleChangeName} />
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
		this.props.isLogin = false;
		event.preventDefault();
		var name = this.state.name.trim();
		if (name) {
			//dispatcher.dispatch({
			//	type: actionTypes.LOGIN,
			//	username: name
			//});
			socket.emit('login', {name: name});
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
										'background-position': avatar.background_position
									}
									return <div key={avatar.avatar_id} data-id = {avatar.avatar_id} className={'avatar'} onClick={this.selectAvatar} style={style}></div>;
								}.bind(this))}
							</div>
						</div>
						<i className={"nav fa fa-angle-right fa-lg"} onClick={this.avatarNavRight}></i>
					</div>
				</div>
				<button className={'login-btn'} type="button" style={{display: this.state.btnDisplay}} onClick={this.handleClick}>
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
				<ChatWindow isLogin={this.state.isLogin}/>
				<LoginForm isLogin={this.state.isLogin}/>
			</div>
		);
	},
	_onLogin: function() {
		this.setState({isLogin: false});
	}
})
React.render(<ChatApp/>, $('body')[0]);
