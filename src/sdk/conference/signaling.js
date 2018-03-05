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

/**
 * @class SioSignaling
 * @classdesc Socket.IO signaling channel for ConferenceClient. It is not recommended to directly access this class.
 * @memberof Ics.Conference
 * @extends Ics.Base.EventDispatcher
 * @constructor
 * @param {?Object } sioConfig Configuration for Socket.IO options.
 * @see https://socket.io/docs/client-api/#io-url-options
 */
export class SioSignaling extends EventModule.EventDispatcher {
  constructor(sioConfig) {
    super();
    this._socket = null;
    this._sioConfig = sioConfig || {};
  }

  connect(host, isSecured, loginInfo) {
    this._sioConfig.secure = isSecured;
    if (this._sioConfig['force new connection'] === undefined) {
      this._sioConfig['force new connection'] = true;
    }
    return new Promise((resolve, reject) => {
      this._socket = io.connect(host, this._sioConfig);
      ['drop', 'participant', 'text', 'stream', 'progress'].forEach((
        notification) => {
        this._socket.on(notification, (data) => {
          this.dispatchEvent(new EventModule.MessageEvent('data', {
            message: {
              notification: notification,
              data: data
            }
          }));
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
