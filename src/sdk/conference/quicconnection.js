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
import {Publication} from '../base/publication.js';
import {Subscription} from './subscription.js';

/**
 * @class QuicConnection
 * @classDesc A channel for a QUIC transport between client and conference server.
 * @hideconstructor
 * @private
 */
export class QuicConnection extends EventDispatcher {
  constructor(url, signaling) {
    super();
    this._signaling = signaling;
    this._ended = false;
    this._quicStreams = new Map(); // Key is publication or subscription ID.
    this._quicTransport = new QuicTransport(url);
    this._subscribePromises = new Map(); // Key is subscription ID.
    this._transportId = undefined;
    this._init();
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

  async _init() {
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
    Logger.info('End of auth.');
  }

  async createSendStream() {
    await this._quicTransport.ready;
    const quicStream = await this._quicTransport.createSendStream();
    return quicStream;
  }

  async createSendStream1(sessionId) {
    Logger.info('Create stream.');
    await this._quicTransport.ready;
    // TODO: Potential failure because of publication stream is created faster
    // than signaling stream(created by the 1st call to initiatePublication).
    const publicationId = await this._initiatePublication();
    const quicStream = await this._quicTransport.createSendStream();
    const writer= quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this._uuidToUint8Array(publicationId));
    writer.releaseLock();
    this._quicStreams.set(publicationId, quicStream);
    return quicStream;
  }

  async publish(stream) {
    // TODO: Avoid a stream to be published twice. The first 16 bit data send to
    // server must be it's publication ID.
    // TODO: Potential failure because of publication stream is created faster
    // than signaling stream(created by the 1st call to initiatePublication).
    const publicationId = await this._initiatePublication();
    const quicStream = stream.stream;
    const writer = quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this._uuidToUint8Array(publicationId));
    writer.releaseLock();
    Logger.info('publish id');
    this._quicStreams.set(publicationId, quicStream);
    const publication = new Publication(publicationId, () => {
      this._signaling.sendSignalingMessage('unpublish', {id: publication})
          .catch((e) => {
            Logger.warning('MCU returns negative ack for unpublishing, ' + e);
          });
    } /* TODO: getStats, mute, unmute is not implemented */);
    return publication;
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

  subscribe(stream) {
    const p = new Promise((resolve, reject) => {
      this._signaling
          .sendSignalingMessage('subscribe', {
            media: null,
            data: {from: stream.id},
            transport: {type: 'quic', id: this._transportId},
          })
          .then((data) => {
            if (this._quicStreams.has(data.id)) {
              // QUIC stream created before signaling returns.
              const subscription = this._createSubscription(
                  data.id, this._quicStreams.get(data.id));
              resolve(subscription);
            } else {
              this._quicStreams.set(data.id, null);
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

  async _updateTransportId(id) {
    if (this._transportId) {
      Logger.error('Update transport ID is not supported.');
      return;
    }
    this._transportId = id;
    await this._authenticate(id);
  }

  async _initiatePublication() {
    const data = await this._signaling.sendSignalingMessage('publish', {
      media: null,
      data: true,
      transport: {type: 'quic', id: this._transportId},
    });
    if (data.transportId) {
      await this._updateTransportId(data.transportId);
    } else {
      if (this._transportId !== data.transportId) {
        throw new Error('Transport ID not match.');
      }
    }
    return data.id;
  }

  _readyHandler() {
    // Ready message from server is useless for QuicStream since QuicStream has its own status. Do nothing here.
  }
};
