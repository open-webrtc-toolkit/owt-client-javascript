// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* global io, Promise */
import Logger from '../base/logger.js';
import * as EventModule from '../base/event.js';
import {ConferenceError} from './error.js';

'use strict';

// eslint-disable-next-line require-jsdoc
function handleResponse(status, data, resolve, reject) {
  if (status === 'ok' || status === 'success') {
    resolve(data);
  } else if (status === 'error') {
    reject(data);
  } else {
    Logger.error('MCU returns unknown ack.');
  }
}

const MAX_TRIALS = 5;
/**
 * @class SioSignaling
 * @classdesc Socket.IO signaling channel for ConferenceClient. It is not recommended to directly access this class.
 * @memberof Owt.Conference
 * @extends Owt.Base.EventDispatcher
 * @constructor
 * @param {?Object } sioConfig Configuration for Socket.IO options.
 * @see https://socket.io/docs/client-api/#io-url-options
 */
export class SioSignaling extends EventModule.EventDispatcher {
  // eslint-disable-next-line require-jsdoc
  constructor() {
    super();
    this._socket = null;
    this._loggedIn = false;
    this._reconnectTimes = 0;
    this._reconnectionTicket = null;
  }

  /**
   * @function connect
   * @instance
   * @desc Connect to a portal.
   * @memberof Oms.Conference.SioSignaling
   * @return {Promise<Object, Error>} Return a promise resolved with the data returned by portal if successfully logged in. Or return a promise rejected with a newly created Oms.Error if failed.
   * @param {string} host Host of the portal.
   * @param {string} isSecured Is secure connection or not.
   * @param {string} loginInfo Infomation required for logging in.
   * @private.
   */
  connect(host, isSecured, loginInfo) {
    return new Promise((resolve, reject) => {
      const opts = {
        'reconnection': true,
        'reconnectionAttempts': MAX_TRIALS,
        'force new connection': true,
      };
      this._socket = io(host, opts);
      ['participant', 'text', 'stream', 'progress'].forEach((
          notification) => {
        this._socket.on(notification, (data) => {
          this.dispatchEvent(new EventModule.MessageEvent('data', {
            message: {
              notification: notification,
              data: data,
            },
          }));
        });
      });
      this._socket.on('reconnecting', () => {
        this._reconnectTimes++;
      });
      this._socket.on('reconnect_failed', () => {
        if (this._reconnectTimes >= MAX_TRIALS) {
          this.dispatchEvent(new EventModule.OwtEvent('disconnect'));
        }
      });
      this._socket.on('drop', () => {
        this._reconnectTimes = MAX_TRIALS;
      });
      this._socket.on('disconnect', () => {
        if (this._reconnectTimes >= MAX_TRIALS) {
          this._loggedIn = false;
          this.dispatchEvent(new EventModule.OwtEvent('disconnect'));
        }
      });
      this._socket.emit('login', loginInfo, (status, data) => {
        if (status === 'ok') {
          this._loggedIn = true;
          this._reconnectionTicket = data.reconnectionTicket;
          this._socket.on('connect', () => {
            // re-login with reconnection ticket.
            this._socket.emit('relogin', this._reconnectionTicket, (status,
                data) => {
              if (status === 'ok') {
                this._reconnectTimes = 0;
                this._reconnectionTicket = data;
              } else {
                this.dispatchEvent(new EventModule.OwtEvent('disconnect'));
              }
            });
          });
        }
        handleResponse(status, data, resolve, reject);
      });
    });
  }

  /**
   * @function disconnect
   * @instance
   * @desc Disconnect from a portal.
   * @memberof Oms.Conference.SioSignaling
   * @return {Promise<Object, Error>} Return a promise resolved with the data returned by portal if successfully disconnected. Or return a promise rejected with a newly created Oms.Error if failed.
   * @private.
   */
  disconnect() {
    if (!this._socket || this._socket.disconnected) {
      return Promise.reject(new ConferenceError(
          'Portal is not connected.'));
    }
    return new Promise((resolve, reject) => {
      this._socket.emit('logout', (status, data) => {
        // Maximize the reconnect times to disable reconnection.
        this._reconnectTimes = MAX_TRIALS;
        this._socket.disconnect();
        handleResponse(status, data, resolve, reject);
      });
    });
  }

  /**
   * @function send
   * @instance
   * @desc Send data to portal.
   * @memberof Oms.Conference.SioSignaling
   * @return {Promise<Object, Error>} Return a promise resolved with the data returned by portal. Or return a promise rejected with a newly created Oms.Error if failed to send the message.
   * @param {string} requestName Name defined in client-server protocol.
   * @param {string} requestData Data format is defined in client-server protocol.
   * @private.
   */
  send(requestName, requestData) {
    return new Promise((resolve, reject) => {
      this._socket.emit(requestName, requestData, (status, data) => {
        handleResponse(status, data, resolve, reject);
      });
    });
  }
}
