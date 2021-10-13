// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global Promise, Map, WebTransport, Uint8Array, Uint32Array, TextEncoder,
 * ArrayBuffer */

'use strict';

import Logger from '../../base/logger.js';
import {EventDispatcher} from '../../base/event.js';
import {Publication} from '../../base/publication.js';
import {SubscribeOptions, Subscription} from '../subscription.js';
import {Base64} from '../../base/base64.js';

const uuidByteLength = 16;

/**
 * @class QuicConnection
 * @classDesc A channel for a QUIC transport between client and conference
 * server.
 * @hideconstructor
 * @private
 */
export class QuicConnection extends EventDispatcher {
  // `tokenString` is a base64 string of the token object. It's in the return
  // value of `ConferenceClient.join`.
  constructor(url, tokenString, signaling, webTransportOptions) {
    super();
    this._tokenString = tokenString;
    this._token = JSON.parse(Base64.decodeBase64(tokenString));
    this._signaling = signaling;
    this._ended = false;
    this._quicStreams = new Map(); // Key is publication or subscription ID.
    this._quicTransport = new WebTransport(url, webTransportOptions);
    this._subscribePromises = new Map(); // Key is subscription ID.
    this._subscribeOptions = new Map(); // Key is subscription ID.
    this._subscriptionInfoReady =
        new Map();  // Key is subscription ID, value is a promise.
    this._transportId = this._token.transportId;
    this._initReceiveStreamReader();
    //this._initDatagrams();
  }

  /**
   * @function onMessage
   * @desc Received a message from conference portal. Defined in client-server
   * protocol.
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

  async init() {
    await this._authenticate(this._tokenString);
  }

  async _initDatagrams() {
    const datagramReader = this._quicTransport.datagrams.readable.getReader();
    while (true) {
      const value = await datagramReader.read();
      console.log(value);
    }
  }

  async _initReceiveStreamReader() {
    const receiveStreamReader =
        this._quicTransport.incomingBidirectionalStreams.getReader();
    Logger.info('Reader: ' + receiveStreamReader);
    let receivingDone = false;
    while (!receivingDone) {
      const {value: receiveStream, done: readingReceiveStreamsDone} =
          await receiveStreamReader.read();
      Logger.info('New stream received');
      const subscriptionIdBytes = new Uint8Array(uuidByteLength);
      let subscriptionIdBytesOffset = 0;
      const trackIdBytes = new Uint8Array(uuidByteLength);
      let trackIdBytesOffset = 0;
      if (readingReceiveStreamsDone) {
        receivingDone = true;
        break;
      }
      // Use BYOB reader when it's supported to avoid copy. See
      // https://github.com/w3c/webtransport/issues/131. Issue tracker:
      // https://crbug.com/1182905.
      const chunkReader = receiveStream.readable.getReader();
      let readingChunksDone = false;
      let readingHeaderDone = false;
      let mediaStream = false;
      let subscriptionId;
      while (!readingChunksDone && !readingHeaderDone) {
        const {value, done: readingChunksDone} = await chunkReader.read();
        let valueOffset = 0;
        if (subscriptionIdBytesOffset < uuidByteLength) {
          const copyLength = Math.min(
              uuidByteLength - subscriptionIdBytesOffset,
              value.byteLength - valueOffset);
          subscriptionIdBytes.set(
              value.subarray(valueOffset, valueOffset + copyLength),
              subscriptionIdBytesOffset);
          subscriptionIdBytesOffset += copyLength;
          valueOffset += copyLength;
          if (subscriptionIdBytesOffset < uuidByteLength) {
            continue;
          }
          subscriptionId =
              this._uint8ArrayToUuid(new Uint8Array(subscriptionIdBytes));
          if (!this._subscribeOptions.has(subscriptionId)) {
            Logger.debug('Subscribe options is not ready.');
            const p = new Promise((resolve) => {
              this._subscriptionInfoReady.set(subscriptionId, resolve);
            });
            await p;
            this._subscriptionInfoReady.delete(subscriptionId);
          }
          const subscribeOptions = this._subscribeOptions.get(subscriptionId);
          if (subscribeOptions.audio || subscribeOptions.video) {
            mediaStream = true;
          }
          if (!mediaStream) {
            readingHeaderDone = true;
            if (copyLength < value.byteLength) {
              Logger.warning(
                  'Potential data lose. Expect to be fixed when BYOB reader ' +
                  'is supported.');
            }
            continue;
          }
        }
        if (valueOffset < value.byteLength) {
          const copyLength = Math.min(
              uuidByteLength - trackIdBytesOffset,
              value.byteLength - valueOffset);
          trackIdBytes.set(
              value.subarray(valueOffset, valueOffset + copyLength),
              trackIdBytesOffset);
          trackIdBytesOffset += copyLength;
          valueOffset += copyLength;
          if (trackIdBytesOffset < uuidByteLength) {
            continue;
          }
          const trackId = this._uint8ArrayToUuid(trackIdBytes);
          Logger.debug(`WebTransport stream for subscription ID ${
            subscriptionId} and track ID ${
            trackId} is ready to receive data.`);
        }
        if (readingChunksDone) {
          Logger.error('Stream closed unexpectedly.');
          return;
        }
      }
      chunkReader.releaseLock();
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
    const quicStream = await this._quicTransport.createBidirectionalStream();
    const chunkReader = quicStream.readable.getReader();
    const writer = quicStream.writable.getWriter();
    await writer.ready;
    // 128 bit of zero indicates this is a stream for signaling.
    writer.write(new Uint8Array(16));
    // Send token as described in
    // https://github.com/open-webrtc-toolkit/owt-server/blob/20e8aad216cc446095f63c409339c34c7ee770ee/doc/design/quic-transport-payload-format.md.
    const encoder = new TextEncoder();
    const encodedToken = encoder.encode(token);
    writer.write(Uint32Array.of(encodedToken.length));
    writer.write(encodedToken);
    // Server returns transport ID as an ack. Ignore it here.
    await chunkReader.read();
    Logger.info('Authentication success.');
  }

  async createSendStream() {
    await this._quicTransport.ready;
    const quicStream = await this._quicTransport.createBidirectionalStream();
    return quicStream;
  }

  async createSendStream1(sessionId) {
    Logger.info('Create stream.');
    await this._quicTransport.ready;
    // TODO: Potential failure because of publication stream is created faster
    // than signaling stream(created by the 1st call to initiatePublication).
    const publicationId = await this._initiatePublication();
    const quicStream = await this._quicTransport.createSendStream();
    const writer = quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this._uuidToUint8Array(publicationId));
    writer.releaseLock();
    this._quicStreams.set(publicationId, quicStream);
    return quicStream;
  }

  async publish(stream, options) {
    // TODO: Avoid a stream to be published twice. The first 16 bit data send to
    // server must be it's publication ID.
    // TODO: Potential failure because of publication stream is created faster
    // than signaling stream(created by the 1st call to initiatePublication).
    const publicationId = await this._initiatePublication(stream, options);
    const quicStream = stream.stream;
    const writer = quicStream.writable.getWriter();
    await writer.ready;
    writer.write(this._uuidToUint8Array(publicationId));
    writer.releaseLock();
    this._quicStreams.set(publicationId, quicStream);
    const publication = new Publication(publicationId, () => {
      this._signaling.sendSignalingMessage('unpublish', {id: publication})
          .catch((e) => {
            Logger.warning(
                'Server returns negative ack for unpublishing, ' + e);
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
    return uuidArray;
  }

  _uint8ArrayToUuid(uuidBytes) {
    let s = '';
    for (const hex of uuidBytes) {
      const str = hex.toString(16);
      s += str.padStart(2, '0');
    }
    return s;
  }

  async subscribe(stream, options) {
    // TODO: Combine this with channel.js.
    if (options === undefined) {
      options = {
        audio: !!stream.settings.audio,
        video: !!stream.settings.video,
      };
    }
    if (typeof options !== 'object') {
      return Promise.reject(new TypeError('Options should be an object.'));
    }
    // if (options.audio === undefined) {
    //   options.audio = !!stream.settings.audio;
    // }
    // if (options.video === undefined) {
    //   options.video = !!stream.settings.video;
    // }
    let mediaOptions;
    let dataOptions;
    if (options.audio || options.video) {
      mediaOptions = {tracks: []};
      dataOptions = undefined;
      if (options.audio) {
        const trackOptions = {type: 'audio', from: stream.id};
        if (typeof options.audio !== 'object' ||
            !Array.isArray(options.audio.codecs) ||
            options.audio.codecs.length !== 1) {
          return Promise.reject(new TypeError(
              'Audio codec is expect to be a list with one item.'));
        }
        mediaOptions.tracks.push(trackOptions);
      }
      if (options.video) {
        const trackOptions = {type: 'video', from: stream.id};
        if (typeof options.video !== 'object' ||
            !Array.isArray(options.video.codecs) ||
            options.video.codecs.length !== 1) {
          return Promise.reject(new TypeError(
              'Video codec is expect to be a list with one item.'));
        }
        if (options.video.resolution || options.video.frameRate ||
            (options.video.bitrateMultiplier &&
             options.video.bitrateMultiplier !== 1) ||
            options.video.keyFrameInterval) {
          trackOptions.parameters = {
            resolution: options.video.resolution,
            framerate: options.video.frameRate,
            bitrate: options.video.bitrateMultiplier ?
                'x' + options.video.bitrateMultiplier.toString() :
                undefined,
            keyFrameInterval: options.video.keyFrameInterval,
          };
        }
        mediaOptions.tracks.push(trackOptions);
      }
    } else {
      // Data stream.
      mediaOptions = null;
      dataOptions = {from: stream.id};
    }
    const p = new Promise((resolve, reject) => {
      this._signaling
          .sendSignalingMessage('subscribe', {
            media: mediaOptions,
            data: dataOptions,
            transport: {type: 'quic', id: this._transportId},
          })
          .then((data) => {
            this._subscribeOptions.set(data.id, options);
            Logger.debug('Subscribe info is set.');
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
            if (this._subscriptionInfoReady.has(data.id)) {
              this._subscriptionInfoReady.get(data.id)();
            }
          });
    });
    return p;
  }

  _readAndPrint() {
    this._quicStreams[0].waitForReadable(5).then(() => {
      const data = new Uint8Array(this._quicStreams[0].readBufferedAmount);
      this._quicStreams[0].readInto(data);
      Logger.info('Read data: ' + data);
      this._readAndPrint();
    });
  }

  async _initiatePublication(stream, options) {
    const media = {tracks: []};
    if (stream.source.audio) {
      if (!options.audio) {
        throw new TypeError(
            'Options for audio is missing. Publish audio track with ' +
            'WebTransport must have AudioEncoderConfig specified.');
      }
      const track = {
        from: stream.id,
        source: stream.source.audio,
        type: 'audio',
        format: {
          codec: options.audio.codec,
          sampleRate: options.audio.sampleRate,
          channelNum: options.audio.numberOfChannels,
        },
      };
      media.tracks.push(track);
    }
    if (stream.source.video) {
      if (!options.video) {
        throw new TypeError(
            'Options for audio is missing. Publish video track with ' +
            'WebTransport must have VideoEncoderConfig specified.');
      }
      const track = {
        from: stream.id,
        source: stream.source.video,
        type: 'video',
        // TODO: convert from MIME type to the format required by server.
        format: {
          codec: 'h264',
          profile: 'B',
        },
      };
      media.tracks.push(track);
    }
    const data = await this._signaling.sendSignalingMessage('publish', {
      media: stream.source.data ? null : media,
      data: stream.source.data,
      transport: {type: 'quic', id: this._transportId},
    });
    if (this._transportId !== data.transportId) {
      throw new Error('Transport ID not match.');
    }
    return data.id;
  }

  _readyHandler() {
    // Ready message from server is useless for QuicStream since QuicStream has
    // its own status. Do nothing here.
  }

  datagramReader() {
    return this._quicTransport.datagrams.readable.getReader();
  }
}
