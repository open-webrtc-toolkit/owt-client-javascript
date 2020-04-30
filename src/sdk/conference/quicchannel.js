// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global Promise, Map, QuicTransport, Uint8Array */

'use strict';

import Logger from '../base/logger.js';
import {
  EventDispatcher,
  MessageEvent,
} from '../base/event.js';

/**
 * @class QuicChannel
 * @classDesc A channel for a QUIC transport between client and conference server.
 * @hideconstructor
 * @private
 */
export class QuicChannel extends EventDispatcher {
  constructor(url, signaling) {
    super();
    this._signaling = signaling;
    this._ended = false;
    this._quicStreams = new Map(); // Key is publication or subscription ID.
    this._quicTransport = new QuicTransport(url);
  }

  /**
   * @function onMessage
   * @desc Received a message from conference portal. Defined in client-server protocol.
   * @param {string} notification Notification type.
   * @param {object} message Message received.
   * @private
   */
  onMessage(notification, message) {
    switch (notification) {
      case 'progress':
        if (message.status === 'soac') {
          this._soacHandler(message.data);
        } else if (message.status === 'ready') {
          this._readyHandler();
        } else if (message.status === 'error') {
          this._errorHandler(message.data);
        }
        break;
      case 'stream':
        this._onStreamEvent(message);
        break;
      default:
        Logger.warning('Unknown notification from MCU.');
    }
  }

  async createSendStream(sessionId) {
    Logger.info('Create stream.');
    await this._quicTransport.ready;
    // TODO: Creating quicStream and initializing publication concurrently.
    const quicStream = await this._quicTransport.createSendStream();
    const publicationId = await this._initializePublication();
    const writer= quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this.uuidToUint8Array(publicationId));
  }

  uuidToUint8Array(uuidString) {
    if (uuidString.length != 32) {
      throw new TypeError('Incorrect UUID.');
    }
    const uuidArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      uuidArray[i] = parseInt(uuidString.substring(i * 2, i * 2 + 2), 16);
    }
    return uuidArray;
  }

  /**
   * @function createStream
   * @desc Create a bidirectional stream.
   * @param {string} sessionId Publication or subscription ID.
   * @private
   */
  createStream(sessionId) {
    Logger.info('Create stream.');
    if (this._quicTransport && this._quicTransport.state == 'connected') {
      this._quicStreams.push(stream);
      return Promise.resolve(stream);
    }
    if (!this._quicTransport) {
      this._initialize();
    }
    return new Promise((resolve, reject) => {
      this._createStreamPromise = {
        resolve: resolve,
        reject: reject
      };
    });
  }

  subscribe(stream) {
    this._outgoing=false;
    this._streamSubscribed = stream;
    if (!this._quicTransport) {
      this.createStream();
    }
  }

  _readAndPrint(){
    this._quicStreams[0].waitForReadable(5).then(()=>{
      let data = new Uint8Array(this._quicStreams[0].readBufferedAmount);
      this._quicStreams[0].readInto(data);
      Logger.info('Read data: ' + data);
      this._readAndPrint();
    });
  }

  async _initializePublication() {
    const data = await this._signaling.sendSignalingMessage('publish', {
      media: null,
      data: true
    });
    return data.id;
  }
};
