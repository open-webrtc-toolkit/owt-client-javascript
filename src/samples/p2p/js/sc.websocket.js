/**
 * @class SignalingChannel
 * @classDesc Network module for WooGeen P2P chat
 */
function SignalingChannel(){

  this.onMessage=null;
  this.onServerDisconnected=null;

  var clientType='Web';
  var clientVersion='3.1';

  var wsServer=null;

  var self=this;

  /* TODO: Do remember to trigger onMessage when new message is received.
     if(this.onMessage)
       this.onMessage(from, message);
   */

  // message should a string.
  this.sendMessage=function(message, targetId, successCallback, failureCallback){
    var data={data:message, to:targetId};
    wsServer.emit('woogeen-message', data, function(err){
      if(err && failureCallback)
        failureCallback(err);
      else if(successCallback)
        successCallback();
    });
  };

  this.connect=function(loginInfo, successCallback, failureCallback){
    var serverAddress=loginInfo.host;
    var token=loginInfo.token;
    var paramters=[];
    var queryString=null;
    paramters.push('clientType='+clientType);
    paramters.push('clientVersion='+clientVersion);
    if(token)
      paramters.push('token='+token);
    if(paramters)
      queryString=paramters.join('&');
    L.Logger.debug('Query string: '+queryString);
    var opts={query : queryString, 'reconnection': true, 'reconnectionAttempts':10, 'force new connection':true};
    // Using websocket for IE 10 and IE 11
    if((navigator.appVersion.indexOf("MSIE 10") !== -1)||(navigator.userAgent.indexOf("Trident") !== -1 && navigator.userAgent.indexOf("rv:11") !== -1))
      opts.transports=['websocket'];
    wsServer=io(serverAddress,opts);


    wsServer.on('connect',function(){
      L.Logger.info('Connected to websocket server.');
    });

    wsServer.on('server-authenticated', function(data){
      L.Logger.debug('Authentication passed. User ID: '+data.uid);
      if(successCallback) {
        successCallback(data.uid);
        successCallback=null;
        failureCallback=null;
      }
    });

    wsServer.on('disconnect',function(){
      L.Logger.info('Disconnected from websocket server.');
      if(self.onServerDisconnected)
        self.onServerDisconnected();
    });

    wsServer.on('connect_failed',function(errorCode){
      L.Logger.error('Connect to websocket server failed, error:'+errorCode+'.');
      if(failureCallback){
        failureCallback(parseInt(errorCode));
        successCallback=null;
        failureCallback=null;
      }
    });

    wsServer.on('error', function(err){
      L.Logger.error('Socket.IO error:'+err);
      if(err=='2103'&&failureCallback){
        failureCallback(err);
        successCallback=null;
        failureCallback=null;
      }
    });

    wsServer.on('woogeen-message',function(data){
      L.Logger.info('Received woogeen message.');
      if(self.onMessage)
        self.onMessage(data.data ,data.from);
    });
  };

  this.disconnect=function(){
    if(wsServer)
      wsServer.close();
  };

}
