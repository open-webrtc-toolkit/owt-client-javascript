/**
 * @class Gab
 * @classDesc A proxy to bridge old gab to new signaling channel.
 */
function Gab(loginInfo){

  var self=this;

  var sc=new SignalingChannel();

  // Event handlers.
  /**
   * @property {function} onConnected
   * @memberOf Gab#
   */
  this.onConnected=null;
  /**
   * @property {function} onDisconnect
   * @memberOf Gab#
   */
  this.onDisconnected=null;
  /**
   * @property {function} onConnectFailed This function will be executed after connect to server failed. Parameter: errorCode for error code.
   * @memberOf Gab#
   */
  this.onConnectFailed=null;
  /**
   * @property {function} onChatInvitation Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatInvitation=null;
  /**
   * @property {function} onChatDenied Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatDenied=null;
  /**
   * @property {function} onChatStopped Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatStopped=null;
  /**
   * @property {function} onChatAccepted Parameter: senderId for sender's ID.
   * @memberOf Gab#
   */
  this.onChatAccepted=null;
  /**
   * @property {function} onChatError Parameter: errorCode.
   * @memberOf Gab#
   */
  //this.onChatError=null;
  /**
   * @property {function} onChatSignal Parameter: signaling message, sender ID.
   * @memberOf Gab#
   */
  this.onChatSignal=null;
  /**
   * @property {function} onStreamType Parameter: video type message, sender ID.
   * @memberOf Gab#
   */
  this.onStreamType=null;
  /**
   * @property {function} onAuthenticated
   * @memberOf Gab#
   */
  this.onAuthenticated=null;

  sc.onMessage=function(data,from){
    dataObj=JSON.parse(data);
    switch(dataObj.type){
      case 'chat-invitation':
        if(self.onChatInvitation)
          self.onChatInvitation(from);
        break;
      case 'chat-accepted':
        if(self.onChatAccepted)
          self.onChatAccepted(from);
        break;
      case 'chat-denied':
        if(self.onChatDenied)
          self.onChatDenied(from);
        break;
      case 'chat-closed':
        if(self.onChatStopped)
          self.onChatStopped(from);
        break;
      case 'stream-type':
        if(self.onStreamType)
          self.onStreamType(dataObj.data,from);
        break;
      case 'chat-signal':
        if(self.onChatSignal)
          self.onChatSignal(dataObj.data,from);
        break;
      case 'chat-negotiation-needed':
        if(self.onNegotiationNeeded)
          self.onNegotiationNeeded(from);
        break;
      case 'chat-negotiation-accepted':
        if(self.onNegotiationAccepted)
          self.onNegotiationAccepted(from);
        break;
      default:
        L.Logger.error('Received unkown message');
    }
  };

  sc.onServerDisconnected=function(){
    if(self.onDisconnected)
      self.onDisconnected();
  };

  /**
   * Send a video invitation to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatInvitation= function(uid, successCallback, failureCallback){
    var msg={type:'chat-closed'};
    sc.sendMessage(JSON.stringify(msg),uid);
    var msg={type:'chat-invitation'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send video agreed message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatAccepted=function(uid, successCallback, failureCallback){
    var msg={type:'chat-accepted'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send video denied message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatDenied=function(uid, successCallback, failureCallback){
    var msg={type:'chat-denied'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send video stopped message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendChatStopped=function(uid, successCallback, failureCallback){
    var msg={type:'chat-closed'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send video type message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   * @param {string} stream to Remote user, it is like: {streamId:'label of stream', type:'audio'} or {streamId:'label of stream', type:'video'} or {streamId:'label of stream', type:'screen'}
   */
  this.sendStreamType=function(uid, stream, successCallback, failureCallback){
    var msg={type:'stream-type', data:stream};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send signal message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   * @param {string} message Signal message
   */
  this.sendSignalMessage=function(uid, message, successCallback, failureCallback){
    var msg={type:'chat-signal', data:message};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send negotiation needed message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendNegotiationNeeded=function(uid, successCallback, failureCallback){
    var msg={type:'chat-negotiation-needed'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Send negotiation accept message to a remote user
   * @memberOf Gab#
   * @param {string} uid Remote user's ID
   */
  this.sendNegotiationAccepted=function(uid, successCallback, failureCallback){
    var msg={type:'chat-negotiation-accepted'};
    sc.sendMessage(JSON.stringify(msg),uid, successCallback, failureCallback);
  };

  /**
   * Finalize
   * @memberOf Gab#
   */
  this.finalize=function(){
    sc.disconnect();
  };

  /**
   * Connect to signaling server
   * @memberOf Gab#
   */
  this.connect=function(loginInfo, successCallback, failureCallback){
    sc.connect(loginInfo,function(id){
      if(self.onConnected)
        self.onConnected();
      if(self.onAuthenticated)
        self.onAuthenticated(id);
      if(successCallback)
        successCallback(id);
    },failureCallback);
  };
}
