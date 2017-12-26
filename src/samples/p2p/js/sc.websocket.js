/**
 * @class SignalingChannel
 * @classDesc Signaling module for Intel CS for WebRTC P2P chat
 */
function SignalingChannel() {

  this.onMessage = null;
  this.onServerDisconnected = null;

  var clientType = 'Web';
  var clientVersion = '4.0';

  var wsServer = null;

  var self = this;

  let connectPromise=null;

  /* TODO: Do remember to trigger onMessage when new message is received.
     if(this.onMessage)
       this.onMessage(from, message);
   */

  // message should a string.
  this.send = function(targetId, message) {
    var data = {
      data: message,
      to: targetId
    };
    return new Promise((resolve, reject) => {
      wsServer.emit('ics-message', data, function(err) {
        if (err)
          reject(err);
        else
          resolve();
      });
    });
  };

  this.connect = function(loginInfo) {
    var serverAddress = loginInfo.host;
    var token = loginInfo.token;
    var paramters = [];
    var queryString = null;
    paramters.push('clientType=' + clientType);
    paramters.push('clientVersion=' + clientVersion);
    if (token)
      paramters.push('token=' + encodeURIComponent(token));
    if (paramters)
      queryString = paramters.join('&');
    console.log('Query string: ' + queryString);
    var opts = {
      query: queryString,
      'reconnection': true,
      'reconnectionAttempts': 10,
      'force new connection': true
    };
    wsServer = io(serverAddress, opts);

    wsServer.on('connect', function() {
      console.info('Connected to websocket server.');
    });

    wsServer.on('server-authenticated', function(data) {
      console.log('Authentication passed. User ID: ' + data.uid);
      if(connectPromise){
        connectPromise.resolve(data.uid);
      }
      connectPromise=null;
    });

    wsServer.on('disconnect', function() {
      console.info('Disconnected from websocket server.');
      if (self.onServerDisconnected)
        self.onServerDisconnected();
    });

    wsServer.on('connect_failed', function(errorCode) {
      console.error('Connect to websocket server failed, error:' +
        errorCode + '.');
      if (connectPromise) {
        connectPromise.reject(parseInt(errorCode))
      }
      connectPromise = null;
    });

    wsServer.on('error', function(err) {
      console.error('Socket.IO error:' + err);
      if (err == '2103' && connectPromise) {
        connectPromise.reject(err)
        connectPromise=null;
      }
    });

    wsServer.on('ics-message', function(data) {
      console.info('Received woogeen message.');
      if (self.onMessage)
        self.onMessage(data.from, data.data);
    });

    return new Promise((resolve, reject) => {
      connectPromise = {
        resolve: resolve,
        reject: reject
      };
    });
  };

  this.disconnect = function() {
    if (wsServer)
      wsServer.close();
    return Promise.resolve();
  };

}
