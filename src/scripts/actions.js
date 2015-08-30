var dispatcher = require('./dispatcher');
var actionTypes = require('./helperUtil').ActionTypes;

module.exports = {
    login : function() {
        dispatcher.dispatch({
            type: actionTypes.LOGIN
        });
    }

};