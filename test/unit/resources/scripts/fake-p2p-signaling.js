// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

import Logger from '../../../../src/sdk/base/logger.js';

'use strict';

const onMessageHandlers = new Map();
const onServerDisconnectedHandlers = new Map();
const messageQueue = [];

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

  drainMessageQueue() {
    while (messageQueue.length > 0) {
      const m = messageQueue.shift();
      if (onMessageHandlers.has(m.target)) {
        onMessageHandlers.get(m.target)(m.sender, m.message);
        m.resolve();
      } else {
        console.error('Cannot send to message to ' + m.target);
        m.reject();
      }
    }
  }

  send(targetId, message) {
    return new Promise((resolve, reject) => {
      messageQueue.push({ target: targetId, message, resolve, reject, sender: this.userId });
      setTimeout(() => {
        this.drainMessageQueue();
      }, 0);
    });
  };

  connect(loginInfo) {
    if(onMessageHandlers.has(loginInfo)){
      console.error('Duplicated '+loginInfo);
    }
    Logger.debug(loginInfo + ' connected.');
    onMessageHandlers.set(loginInfo, this.onMessage);
    onServerDisconnectedHandlers.set(loginInfo, this.onServerDisconnected);
    this.userId = loginInfo;
    return new Promise((resolve) => {
      setTimeout(() => {
        return resolve(loginInfo);
      }, 0);
    });
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
