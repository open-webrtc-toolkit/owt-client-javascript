// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

import Logger from '../../../../src/sdk/base/logger.js';

'use strict';

const onMessageHandlers = new Map();
const onServerDisconnectedHandlers = new Map();

/**
 * A fake P2P signaling channel.
 */
export default class FakeP2PSignalingChannel {

  /* TODO: Do remember to trigger onMessage when new message is received.
     if(this.onMessage)
       this.onMessage(from, message);
   */

  constructor(onMessage, onServerDisconnected) {
    this.onMessage = onMessage;
    this.onServerDisconnected = onServerDisconnected;
  };

  send(targetId, message) {
    Logger.debug(this.userId + ' -> ' + targetId + ': ' + message);
    return new Promise((resolve, reject) => {
      if (onMessageHandlers.has(targetId)) {
        setTimeout(() => {
          onMessageHandlers.get(targetId)(this.userId, message)
          return resolve();
        }, 0);;
      } else {
        console.error('Cannot send to message to ' + targetId);
        return reject();
      }
    })
  };

  connect(loginInfo) {
    Logger.debug(loginInfo+' connected.');
    onMessageHandlers.set(loginInfo, this.onMessage);
    onServerDisconnectedHandlers.set(loginInfo, this.onServerDisconnected);
    this.userId = loginInfo;
    return Promise.resolve(loginInfo);
  };

  disconnect() {
    Logger.debug(this.userId+' disconnected.');
    onMessageHandlers.delete(this.userId);
    if (onServerDisconnectedHandlers.has(this.userId)) {
      const onDisconnected = onServerDisconnectedHandlers.get(this.userId);
      if (typeof onDisconnected === 'function') {
        onDisconnected();
      }
    } else {
      console.error('Cannot find onServerDisconnected event handler for ' +
        this.userId);
    }
    onServerDisconnectedHandlers.delete(this.userId);
  };
}
