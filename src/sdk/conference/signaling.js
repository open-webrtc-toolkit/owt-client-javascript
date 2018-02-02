/* global io */
import Logger from '../base/logger.js'
import * as EventModule from '../base/event.js'

'use strict';

function handleResponse(status, data, resolve, reject) {
  if (status === 'ok' || status === 'success') {
    resolve(data);
  } else if (status === 'error') {
    reject(data);
  } else {
    Logger.error('MCU returns unknown ack.');
  }
};

export class ConferenceSioSignaling extends EventModule.EventDispatcher {
  constructor() {
    super();
    this._socket = null;
  }

  connect(host, isSecured, loginInfo) {
    return new Promise((resolve, reject) => {
      this._socket = io.connect(host, {
        reconnect: false,
        secure: isSecured,
        'force new connection': true
      });
      ['drop', 'participant', 'text', 'stream', 'progress'].forEach((
        notification) => {
        this._socket.on(notification, (data) => {
          this.dispatchEvent(new EventModule.MessageEvent('data', { message: { notification: notification,
              data: data } }));
        });
      });
      this._socket.on('disconnect', () => {
        this.dispatchEvent(new EventModule.IcsEvent('disconnect'));
      });
      this._socket.emit('login', loginInfo, (status, data) => {
        handleResponse(status, data, resolve, reject);
      });
    });
  }

  disconnect() {
    return new Promise((resolve, reject) => {
      this._socket.emit('logout', (status, data) => {
        this._socket.disconnect();
        handleResponse(status, data, resolve, reject);
      });
    });
  }

  send(requestName, requestData) {
    return new Promise((resolve, reject) => {
      this._socket.emit(requestName, requestData, (status, data) => {
        handleResponse(status, data, resolve, reject);
      });
    });
  }
}
