// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global Promise, Map, WebTransport, WebTransportBidirectionalStream,
   Uint8Array, Uint32Array, TextEncoder, Worker, MediaStreamTrackProcessor,
   MediaStreamTrackGenerator, proto */

'use strict';

import Logger from '../../base/logger.js';
import {EventDispatcher} from '../../base/event.js';
import {Publication} from '../../base/publication.js';
import {Subscription} from '../subscription.js';
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
  constructor(url, tokenString, signaling, webTransportOptions, workerDir) {
    super();
    this._tokenString = tokenString;
    this._token = JSON.parse(Base64.decodeBase64(tokenString));
    this._signaling = signaling;
    this._ended = false;
    // Key is publication or subscription ID, value is a list of streams.
    this._quicDataStreams = new Map();
    // Key is MediaStreamTrack ID, value is a bidirectional stream.
    this._quicMediaStreamTracks = new Map();
    this._quicTransport = new WebTransport(url, webTransportOptions);
    this._subscribePromises = new Map(); // Key is subscription ID.
    this._subscribeOptions = new Map(); // Key is subscription ID.
    this._subscriptionInfoReady =
        new Map(); // Key is subscription ID, value is a promise.
    // Key is subscription ID, value is an object with audio and video RTP
    // configs.
    this._rtpConfigs = new Map();
    this._transportId = this._token.transportId;
    this._initReceiveStreamReader();
    this._worker = new Worker(workerDir + '/media-worker.js', {type: 'module'});
    this._initHandlersForWorker();
    // Key is subscription ID, value is a MediaStreamTrackGenerator writer.
    this._mstVideoGeneratorWriters = new Map();
    this._initRtpModule();
    this._initDatagramReader();
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
        } else if (message.status === 'rtp') {
          this._rtpHandler(message);
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

  _initRtpModule() {
    this._worker.postMessage(['init-rtp']);
  }

  async _initReceiveStreamReader() {
    const receiveStreamReader =
        this._quicTransport.incomingBidirectionalStreams.getReader();
    let receivingDone = false;
    while (!receivingDone) {
      const {value: receiveStream, done: readingReceiveStreamsDone} =
          await receiveStreamReader.read();
      Logger.debug('New stream received.');
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
      const readingChunksDone = false;
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
      this._quicDataStreams.set(subscriptionId, [receiveStream]);
      if (this._subscribePromises.has(subscriptionId)) {
        const subscription =
            this._createSubscription(subscriptionId, receiveStream);
        this._subscribePromises.get(subscriptionId).resolve(subscription);
      }
    }
  }

  async _initDatagramReader() {
    const datagramReader = this._quicTransport.datagrams.readable.getReader();
    let receivingDone = false;
    while (!receivingDone) {
      const {value: datagram, done: readingDatagramsDone} =
          await datagramReader.read();
      this._worker.postMessage(['rtp-packet', datagram]);
      if (readingDatagramsDone) {
        receivingDone = true;
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

  async bindFeedbackReader(stream, publicationId) {
    // The receiver side of a publication stream starts with a UUID of
    // publication ID, then each feedback message has a 4 bytes header indicates
    // its length, and followed by protobuf encoded body.
    const feedbackChunkReader = stream.readable.getReader();
    let feedbackChunksDone = false;
    let publicationIdOffset = 0;
    const headerSize=4;
    const header = new Uint8Array(headerSize);
    let headerOffset = 0;
    let bodySize = 0;
    let bodyOffset = 0;
    let bodyBytes;
    while (!feedbackChunksDone) {
      let valueOffset=0;
      const {value, done} = await feedbackChunkReader.read();
      Logger.debug(value);
      while (valueOffset < value.byteLength) {
        if (publicationIdOffset < uuidByteLength) {
          // TODO: Check publication ID matches. For now, we just skip this ID.
          const readLength =
              Math.min(uuidByteLength - publicationIdOffset, value.byteLength);
          valueOffset += readLength;
          publicationIdOffset += readLength;
        }
        if (headerOffset < headerSize) {
          // Read header.
          const copyLength = Math.min(
              headerSize - headerOffset, value.byteLength - valueOffset);
          if (copyLength === 0) {
            continue;
          }
          header.set(
              value.subarray(valueOffset, valueOffset + copyLength),
              headerOffset);
          headerOffset += copyLength;
          valueOffset += copyLength;
          if (headerOffset < headerSize) {
            continue;
          }
          bodySize = 0;
          bodyOffset = 0;
          for (let i = 0; i < headerSize; i++) {
            bodySize += (header[i] << ((headerSize - 1 - i) * 8));
          }
          bodyBytes = new Uint8Array(bodySize);
          Logger.debug('Body size ' + bodySize);
        }
        if (bodyOffset < bodySize) {
          const copyLength =
              Math.min(bodySize - bodyOffset, value.byteLength - valueOffset);
          if (copyLength === 0) {
            continue;
          }
          Logger.debug('Bytes for body: '+copyLength);
          bodyBytes.set(
              value.subarray(valueOffset, valueOffset + copyLength),
              bodyOffset);
          bodyOffset += copyLength;
          valueOffset += copyLength;
          if (valueOffset < bodySize) {
            continue;
          }
          // Decode body.
          const feedback =
              proto.owt.protobuf.Feedback.deserializeBinary(bodyBytes);
          this.handleFeedback(feedback, publicationId);
        }
      }
      if (done) {
        feedbackChunksDone = true;
        break;
      }
    }
  }

  async handleFeedback(feedback, publicationId) {
    Logger.debug(
        'Key frame request type: ' +
        proto.owt.protobuf.Feedback.Type.KEY_FRAME_REQUEST);
    if (feedback.getType() ===
        proto.owt.protobuf.Feedback.Type.KEY_FRAME_REQUEST) {
      this._worker.postMessage(
          ['rtcp-feedback', ['key-frame-request', publicationId]]);
    } else {
      Logger.warning('Unrecognized feedback type ' + feedback.getType());
    }
  }

  async publish(stream, options) {
    // TODO: Avoid a stream to be published twice. The first 16 bit data send to
    // server must be it's publication ID.
    // TODO: Potential failure because of publication stream is created faster
    // than signaling stream(created by the 1st call to initiatePublication).
    const publicationId = await this._initiatePublication(stream, options);
    const quicStreams = [];
    if (stream.stream instanceof WebTransportBidirectionalStream) {
      quicStreams.push(stream.stream);
      this._quicDataStreams.set(publicationId, stream.streams);
    } else if (stream.stream instanceof MediaStream) {
      if (typeof MediaStreamTrackProcessor === 'undefined') {
        throw new TypeError(
            'MediaStreamTrackProcessor is not supported by your browser.');
      }
      for (const track of stream.stream.getTracks()) {
        const quicStream =
            await this._quicTransport.createBidirectionalStream();
        this.bindFeedbackReader(quicStream, publicationId);
        this._quicMediaStreamTracks.set(track.id, quicStream);
        quicStreams.push(quicStream);
      }
    } else {
      throw new TypeError('Invalid stream.');
    }
    for (const quicStream of quicStreams) {
      const writer = quicStream.writable.getWriter();
      await writer.ready;
      writer.write(this._uuidToUint8Array(publicationId));
      writer.releaseLock();
    }
    if (stream.stream instanceof MediaStream) {
      for (const track of stream.stream.getTracks()) {
        let encoderConfig;
        if (track.kind === 'audio') {
          encoderConfig = {
            codec: 'opus',
            numberOfChannels: 1,
            sampleRate: 48000,
          };
        } else if (track.kind === 'video') {
          encoderConfig = {
            codec: 'avc1.4d002a',
            width: 640,
            height: 480,
            framerate: 30,
            latencyMode: 'realtime',
            avc: {format: 'annexb'},
          };
        }
        const quicStream = this._quicMediaStreamTracks.get(track.id);
        const processor = new MediaStreamTrackProcessor(track);
        this._worker.postMessage(
            [
              'media-sender',
              [
                publicationId,
                track.id,
                track.kind,
                processor.readable,
                quicStream.writable,
                encoderConfig,
              ],
            ],
            [processor.readable, quicStream.writable]);
      }
    }
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
    return this._quicDataStreams.has(id);
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
    if (options.audio === undefined) {
      options.audio = !!stream.settings.audio;
    }
    if (options.video === undefined) {
      options.video = !!stream.settings.video;
    }
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
            if (dataOptions) {
              // A WebTransport stream is associated with a subscription for
              // data.
              if (this._quicDataStreams.has(data.id)) {
                // QUIC stream created before signaling returns.
                // TODO: Update subscription to accept list of QUIC streams.
                const subscription = this._createSubscription(
                    data.id, this._quicDataStreams.get(data.id)[0]);
                resolve(subscription);
              } else {
                this._quicDataStreams.set(data.id, null);
                // QUIC stream is not created yet, resolve promise after getting
                // QUIC stream.
                this._subscribePromises.set(
                    data.id, {resolve: resolve, reject: reject});
              }
            } else {
              // A MediaStream is associated with a subscription for media.
              // Media packets are received over WebTransport datagram.
              const generators = [];
              for (const track of mediaOptions.tracks) {
                const generator =
                    new MediaStreamTrackGenerator({kind: track.type});
                generators.push(generator);
                // TODO: Update key with the correct SSRC.
                this._mstVideoGeneratorWriters.set(
                    data.id, generator.writable.getWriter());
              }
              const mediaStream = new MediaStream(generators);
              const subscription =
                  this._createSubscription(data.id, mediaStream);
              this._worker.postMessage([
                'add-subscription',
                [
                  subscription.id, options,
                  this._rtpConfigs.get(subscription.id),
                ],
              ]);
              resolve(subscription);
            }
            if (this._subscriptionInfoReady.has(data.id)) {
              this._subscriptionInfoReady.get(data.id)();
            }
          });
    });
    return p;
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
    const resp = await this._signaling.sendSignalingMessage('publish', {
      media: stream.source.data ? null : media,
      data: stream.source.data,
      transport: {type: 'quic', id: this._transportId},
    });
    if (this._transportId !== resp.transportId) {
      throw new Error('Transport ID not match.');
    }
    return resp.id;
  }

  _readyHandler() {
    // Ready message from server is useless for QuicStream since QuicStream has
    // its own status. Do nothing here.
  }

  _rtpHandler(message) {
    Logger.debug(`RTP config: ${JSON.stringify(message.data)}.`);
    this._rtpConfigs.set(message.id, message.data);
  }

  datagramReader() {
    return this._quicTransport.datagrams.readable.getReader();
  }

  async _sendRtcp(buffer) {
    const writer = this._quicTransport.datagrams.writable.getWriter();
    await writer.ready;
    writer.write(buffer);
    writer.releaseLock();
  }

  _initHandlersForWorker() {
    this._worker.onmessage = ((e) => {
      const [command, args] = e.data;
      switch (command) {
        case 'video-frame':
          this._mstVideoGeneratorWriters.get(args[0]).write(args[1]);
          break;
        case 'rtcp-packet':
          this._sendRtcp(...args);
          break;
        default:
          Logger.warn('Unrecognized command ' + command);
      }
    });
  }
}
