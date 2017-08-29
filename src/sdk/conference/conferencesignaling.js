/* global io */
(function() {
  'use strict';

  const handleResponse = function(status, data, resolve, reject) {
    if (status === 'ok' || status === 'success') {
      resolve(data);
    } else if (status === 'error') {
      reject(data);
    } else {
      L.Logger.error('MCU returns unknown ack.');
    }
  };

  function ConferenceSioSignaling() {
    this.socket = null;
  }

  function sendMessage(socket, requestName, requestData) {
    return new Promise((resolve, reject) => {
      socket.emit(requestName, requestData, (status, data) => {
        handleResponse(status, data, resolve, reject);
      });
    });
  }

  ConferenceSioSignaling.prototype.constructor = ConferenceSioSignaling;

  ConferenceSioSignaling.prototype = Woogeen.EventDispatcher({});

  ConferenceSioSignaling.create = function(spec) {
    return new ConferenceSioSignaling(spec);
  };

  ConferenceSioSignaling.prototype.connect = function(host, isSecured,
    loginInfo) {
    const self = this;
    return new Promise((resolve, reject) => {
      self.socket = io.connect(host, {
        reconnect: false,
        secure: isSecured,
        'force new connection': true
      });
      ['drop', 'participant', 'text', 'stream', 'progress'].forEach((
            notification) => {
        self.socket.on(notification, (data) => {
          const evt = new Woogeen.MessageEvent({
            type: notification,
            msg: data
          });
          self.dispatchEvent(evt);
        });
      });
      self.socket.on('disconnect', ()=>{
        self.dispatchEvent({type: 'disconnect'});
      });
      self.socket.emit('login', loginInfo, (status, data) => {
        handleResponse(status, data, resolve, reject);
      });
    });
  };

  ConferenceSioSignaling.prototype.disconnect = function() {
    const self = this;
    return new Promise((resolve, reject) => {
      self.socket.emit('logout', (status, data) => {
        self.socket.disconnect();
        handleResponse(status, data, resolve, reject);
      });
    });
  };

  ConferenceSioSignaling.prototype.sendMessage = function(requestName,
    requestData) {
    return sendMessage(this.socket, requestName, requestData);
  };

  Woogeen.ConferenceSioSignaling = ConferenceSioSignaling;
}());

