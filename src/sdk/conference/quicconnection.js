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
import {Subscription} from './subscription.js';

/**
 * @class QuicConnection
 * @classDesc A channel for a QUIC transport between client and conference server.
 * @hideconstructor
 * @private
 */
export class QuicConnection extends EventDispatcher {
  constructor(url, token, signaling) {
    super();
    this._signaling = signaling;
    this._ended = false;
    this._quicStreams = new Map(); // Key is publication or subscription ID.
    this._quicTransport = new QuicTransport(url);
    this._subscribePromises = new Map(); // Key is subscription ID.
    this._init(token);
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

  async _init(token) {
    this._authenticate(token);
    const receiveStreamReader =
        this._quicTransport.receiveStreams().getReader();
    Logger.info('Reader: '+receiveStreamReader);
    while (true) {
      const {
        value: receiveStream,
        done: readingReceiveStreamsDone
      } = await receiveStreamReader.read();
      Logger.info('New stream received');
      if (readingReceiveStreamsDone) {
        break;
      }
      const chunkReader = receiveStream.readable.getReader();
      const {
        value: uuid,
        done: readingChunksDone
      } = await chunkReader.read();
      if (readingChunksDone) {
        Logger.error('Stream closed unexpectedly.');
        return;
      }
      if (uuid.length != 16) {
        Logger.error('Unexpected length for UUID.');
        return;
      }
      chunkReader.releaseLock();
      const subscriptionId = this._uint8ArrayToUuid(uuid);
      this._quicStreams.set(subscriptionId, receiveStream);
      if (this._subscribePromises.has(subscriptionId)) {
        const subscription =
            this._createSubscription(subscriptionId, receiveStream);
        this._subscribePromises.get(subscriptionId).resolve(subscription);
      }
    }
  }

  _createSubscription(id, receiveStream) {
    // TODO: Incomplete subscription.
    const subscription = new Subscription(id, () => {
      receiveStream.abortReading();
    });
    subscription.stream = receiveStream;
    return subscription;
  }

  async _authenticate(token) {
    await this._quicTransport.ready;
    const quicStream = await this._quicTransport.createSendStream();
    const writer = quicStream.writable.getWriter();
    await writer.ready;
    writer.write(new Uint8Array(16));
    const encoder = new TextEncoder();
    writer.write(encoder.encode(token));
  }

  async createSendStream(sessionId) {
    Logger.info('Create stream.');
    await this._quicTransport.ready;
    // TODO: Creating quicStream and initializing publication concurrently.
    const quicStream = await this._quicTransport.createSendStream();
    const publicationId = await this._initiatePublication();
    const writer= quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this._uuidToUint8Array(publicationId));
    writer.write(this._uuidToUint8Array(publicationId));
    this._quicStreams.set(publicationId, quicStream);
  }

  hasContentSessionId(id) {
    return this._quicStreams.has(id);
  }

  _uuidToUint8Array(uuidString) {
    if (uuidString.length != 32) {
      throw new TypeError('Incorrect UUID.');
    }
    const uuidArray = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      uuidArray[i] = parseInt(uuidString.substring(i * 2, i * 2 + 2), 16);
    }
    console.log(uuidArray);
    return uuidArray;
  }

  _uint8ArrayToUuid(uuidBytes) {
    let s = '';
    for (let hex of uuidBytes) {
      const str = hex.toString(16);
      s += str.padStart(2, '0');
    }
    return s;
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
    const p = new Promise((resolve, reject) => {
      this._signaling
          .sendSignalingMessage(
              'subscribe',
              {media: null, data: {from: stream.id}, transport: {type: 'quic'}})
          .then((data) => {
            if (this._quicStreams.has(data.id)) {
              // QUIC stream created before signaling returns.
              const subscription = this._createSubscription(
                  data.id, this._quicStreams.get(data.id));
              resolve(subscription);
            } else {
              // QUIC stream is not created yet, resolve promise after getting
              // QUIC stream.
              this._subscribePromises.set(
                  data.id, {resolve: resolve, reject: reject});
            }
          });
    });
    return p;
  }

  _readAndPrint() {
    this._quicStreams[0].waitForReadable(5).then(() => {
      let data = new Uint8Array(this._quicStreams[0].readBufferedAmount);
      this._quicStreams[0].readInto(data);
      Logger.info('Read data: ' + data);
      this._readAndPrint();
    });
  }

  async _initiatePublication() {
    const data = await this._signaling.sendSignalingMessage('publish', {
      media: null,
      data: true,
      transport: {type:'quic'}
    });
    return data.id;
  }

  _readyHandler() {
    // Ready message from server is useless for QuicStream since QuicStream has its own status. Do nothing here.
  }
};
