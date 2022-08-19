// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global Map, Promise, setTimeout */

'use strict';

import Logger from '../base/logger.js';
import {
  EventDispatcher,
  MessageEvent,
  OwtEvent,
  ErrorEvent,
  MuteEvent,
} from '../base/event.js';
import {TrackKind} from '../base/mediaformat.js';
import {Publication} from '../base/publication.js';
import {Subscription} from './subscription.js';
import {ConferenceError} from './error.js';
import * as Utils from '../base/utils.js';
import * as SdpUtils from '../base/sdputils.js';
import {TransportSettings, TransportType} from '../base/transport.js';

/**
 * @class ConferencePeerConnectionChannel
 * @classDesc A channel for a connection between client and conference server.
 * Currently, only one stream could be tranmitted in a channel.
 * @hideconstructor
 * @private
 */
export class ConferencePeerConnectionChannel extends EventDispatcher {
  // eslint-disable-next-line require-jsdoc
  constructor(config, signaling) {
    super();
    this.pc = null;
    this._config = config;
    this._videoCodecs = undefined;
    this._options = null;
    this._videoCodecs = undefined;
    this._signaling = signaling;
    this._internalId = null; // It's publication ID or subscription ID.
    this._pendingCandidates = [];
    this._subscribePromises = new Map(); // internalId => { resolve, reject }
    this._publishPromises = new Map(); // internalId => { resolve, reject }
    this._publications = new Map(); // PublicationId => Publication
    this._subscriptions = new Map(); // SubscriptionId => Subscription
    this._publishTransceivers = new Map(); // internalId => { id, transceivers: [Transceiver] }
    this._subscribeTransceivers = new Map(); // internalId => { id, transceivers: [Transceiver] }
    this._reverseIdMap = new Map(); // PublicationId || SubscriptionId => internalId
    // Timer for PeerConnection disconnected. Will stop connection after timer.
    this._disconnectTimer = null;
    this._ended = false;
    // Channel ID assigned by conference
    this._id = undefined;
    // Used to create internal ID for publication/subscription
    this._internalCount = 0;
    this._sdpPromise = Promise.resolve();
    this._sdpResolverMap = new Map(); // internalId => {finish, resolve, reject}
    this._sdpResolvers = []; // [{finish, resolve, reject}]
    this._sdpResolveNum = 0;
    this._remoteMediaStreams = new Map(); // Key is subscription ID, value is MediaStream.

    this._createPeerConnection();
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
          this._sdpHandler(message.data);
        } else if (message.status === 'ready') {
          this._readyHandler(message.sessionId);
        } else if (message.status === 'error') {
          this._errorHandler(message.sessionId, message.data);
        }
        break;
      case 'stream':
        this._onStreamEvent(message);
        break;
      default:
        Logger.warning('Unknown notification from MCU.');
    }
  }

  async publishWithTransceivers(stream, transceivers) {
    for (const t of transceivers) {
      if (t.direction !== 'sendonly') {
        return Promise.reject(
            'RTCRtpTransceiver\'s direction must be sendonly.');
      }
      if (!stream.stream.getTracks().includes(t.sender.track)) {
        return Promise.reject(
            'The track associated with RTCRtpSender is not included in ' +
            'stream.');
      }
      if (transceivers.length > 2) {
        // Not supported by server.
        return Promise.reject(
            'At most one transceiver for audio and one transceiver for video ' +
            'are accepted.');
      }
      const transceiverDescription = transceivers.map((t) => {
        const kind = t.sender.track.kind;
        return {
          type: kind,
          transceiver: t,
          source: stream.source[kind],
          option: {},
        };
      });
      const internalId = this._createInternalId();
      await this._chainSdpPromise(internalId); // Copied from publish method.
      this._publishTransceivers.set(internalId, transceiverDescription);
      const offer=await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      const trackOptions = transceivers.map((t) => {
        const kind = t.sender.track.kind;
        return {
          type: kind,
          source: stream.source[kind],
          mid: t.mid,
        };
      });
      const publicationResp =
        await this._signaling.sendSignalingMessage('publish', {
          media: {tracks: trackOptions},
          attributes: stream.attributes,
          transport: {id: this._id, type: 'webrtc'},
        });
      const publicationId = publicationResp.id;
      this._publishTransceivers.get(internalId).id = publicationId;
      this._reverseIdMap.set(publicationId, internalId);

      if (this._id && this._id !== publicationResp.transportId) {
        Logger.warning('Server returns conflict ID: ' + publicationResp
            .transportId);
        return;
      }
      this._id = publicationResp.transportId;

      const messageEvent = new MessageEvent('id', {
        message: publicationId,
        origin: this._remoteId,
      });
      this.dispatchEvent(messageEvent);

      await this._signaling.sendSignalingMessage(
          'soac', {id: this._id, signaling: offer});
      return new Promise((resolve, reject) => {
        this._publishPromises.set(internalId, {
          resolve: resolve,
          reject: reject,
        });
      });
    }
  }

  async publish(stream, options, videoCodecs) {
    if (this._ended) {
      return Promise.reject('Connection closed');
    }
    if (Array.isArray(options)) {
      // The second argument is an array of RTCRtpTransceivers.
      return this.publishWithTransceivers(stream, options);
    }
    if (options === undefined) {
      options = {
        audio: !!stream.mediaStream.getAudioTracks().length,
        video: !!stream.mediaStream.getVideoTracks().length,
      };
    }
    if (typeof options !== 'object') {
      return Promise.reject(new TypeError('Options should be an object.'));
    }
    if ((this._isRtpEncodingParameters(options.audio) &&
         this._isOwtEncodingParameters(options.video)) ||
        (this._isOwtEncodingParameters(options.audio) &&
         this._isRtpEncodingParameters(options.video))) {
      return Promise.reject(new ConferenceError(
          'Mixing RTCRtpEncodingParameters and ' +
          'AudioEncodingParameters/VideoEncodingParameters is not allowed.'));
    }
    if (options.audio === undefined) {
      options.audio = !!stream.mediaStream.getAudioTracks().length;
    }
    if (options.video === undefined) {
      options.video = !!stream.mediaStream.getVideoTracks().length;
    }
    if ((!!options.audio && !stream.mediaStream.getAudioTracks().length) ||
        (!!options.video && !stream.mediaStream.getVideoTracks().length)) {
      return Promise.reject(new ConferenceError(
          'options.audio/video is inconsistent with tracks presented in the ' +
          'MediaStream.',
      ));
    }
    if ((options.audio === false || options.audio === null) &&
      (options.video === false || options.video === null)) {
      return Promise.reject(new ConferenceError(
          'Cannot publish a stream without audio and video.'));
    }
    if (typeof options.audio === 'object') {
      if (!Array.isArray(options.audio)) {
        return Promise.reject(new TypeError(
            'options.audio should be a boolean or an array.'));
      }
      for (const parameters of options.audio) {
        if (!parameters.codec || typeof parameters.codec.name !== 'string' || (
          parameters.maxBitrate !== undefined && typeof parameters.maxBitrate
          !== 'number')) {
          return Promise.reject(new TypeError(
              'options.audio has incorrect parameters.'));
        }
      }
    }
    if (typeof options.video === 'object' && !Array.isArray(options.video)) {
      return Promise.reject(new TypeError(
          'options.video should be a boolean or an array.'));
    }
    if (this._isOwtEncodingParameters(options.video)) {
      for (const parameters of options.video) {
        if (!parameters.codec || typeof parameters.codec.name !== 'string' ||
          (
            parameters.maxBitrate !== undefined && typeof parameters
                .maxBitrate !==
            'number') || (parameters.codec.profile !== undefined &&
            typeof parameters.codec.profile !== 'string')) {
          return Promise.reject(new TypeError(
              'options.video has incorrect parameters.'));
        }
      }
    }
    const mediaOptions = {};
    if (stream.mediaStream.getAudioTracks().length > 0 && options.audio !==
      false && options.audio !== null) {
      if (stream.mediaStream.getAudioTracks().length > 1) {
        Logger.warning(
            'Publishing a stream with multiple audio tracks is not fully'
            + ' supported.',
        );
      }
      if (typeof options.audio !== 'boolean' && typeof options.audio !==
        'object') {
        return Promise.reject(new ConferenceError(
            'Type of audio options should be boolean or an object.',
        ));
      }
      mediaOptions.audio = {};
      mediaOptions.audio.source = stream.source.audio;
    } else {
      mediaOptions.audio = false;
    }
    if (stream.mediaStream.getVideoTracks().length > 0 && options.video !==
      false && options.video !== null) {
      if (stream.mediaStream.getVideoTracks().length > 1) {
        Logger.warning(
            'Publishing a stream with multiple video tracks is not fully '
            + 'supported.',
        );
      }
      mediaOptions.video = {};
      mediaOptions.video.source = stream.source.video;
      const trackSettings = stream.mediaStream.getVideoTracks()[0]
          .getSettings();
      mediaOptions.video.parameters = {
        resolution: {
          width: trackSettings.width,
          height: trackSettings.height,
        },
        framerate: trackSettings.frameRate,
      };
    } else {
      mediaOptions.video = false;
    }

    const internalId = this._createInternalId();
    // Waiting for previous SDP negotiation if needed
    await this._chainSdpPromise(internalId);

    const offerOptions = {};
    const transceivers = [];
    if (typeof this.pc.addTransceiver === 'function') {
      // |direction| seems not working on Safari.
      if (mediaOptions.audio && stream.mediaStream.getAudioTracks().length >
        0) {
        const transceiverInit = {
          direction: 'sendonly',
          streams: [stream.mediaStream],
        };
        if (this._isRtpEncodingParameters(options.audio)) {
          transceiverInit.sendEncodings = options.audio;
        }
        const transceiver = this.pc.addTransceiver(
            stream.mediaStream.getAudioTracks()[0],
            transceiverInit);
        transceivers.push({
          type: 'audio',
          transceiver,
          source: mediaOptions.audio.source,
          option: {audio: options.audio},
        });

        if (Utils.isFirefox()) {
          // Firefox does not support encodings setting in addTransceiver.
          const parameters = transceiver.sender.getParameters();
          parameters.encodings = transceiverInit.sendEncodings;
          await transceiver.sender.setParameters(parameters);
        }
      }
      if (mediaOptions.video && stream.mediaStream.getVideoTracks().length >
        0) {
        const transceiverInit = {
          direction: 'sendonly',
          streams: [stream.mediaStream],
        };
        if (this._isRtpEncodingParameters(options.video)) {
          transceiverInit.sendEncodings = options.video;
          this._videoCodecs = videoCodecs;
        }
        const transceiver = this.pc.addTransceiver(
            stream.mediaStream.getVideoTracks()[0],
            transceiverInit);
        transceivers.push({
          type: 'video',
          transceiver,
          source: mediaOptions.video.source,
          option: {video: options.video},
        });

        if (Utils.isFirefox()) {
          // Firefox does not support encodings setting in addTransceiver.
          const parameters = transceiver.sender.getParameters();
          parameters.encodings = transceiverInit.sendEncodings;
          await transceiver.sender.setParameters(parameters);
        }
      }
    } else {
      // Should not reach here
      if (mediaOptions.audio &&
          stream.mediaStream.getAudioTracks().length > 0) {
        for (const track of stream.mediaStream.getAudioTracks()) {
          this.pc.addTrack(track, stream.mediaStream);
        }
      }
      if (mediaOptions.video &&
          stream.mediaStream.getVideoTracks().length > 0) {
        for (const track of stream.mediaStream.getVideoTracks()) {
          this.pc.addTrack(track, stream.mediaStream);
        }
      }
      offerOptions.offerToReceiveAudio = false;
      offerOptions.offerToReceiveVideo = false;
    }
    this._publishTransceivers.set(internalId, {transceivers});

    let localDesc;
    this.pc.createOffer(offerOptions).then((desc) => {
      localDesc = desc;
      return this.pc.setLocalDescription(desc);
    }).then(() => {
      const trackOptions = [];
      transceivers.forEach(({type, transceiver, source}) => {
        trackOptions.push({
          type,
          mid: transceiver.mid,
          source,
        });
      });
      return this._signaling.sendSignalingMessage('publish', {
        media: {tracks: trackOptions},
        attributes: stream.attributes,
        transport: {id: this._id, type: 'webrtc'},
      }).catch((e) => {
        // Send SDP even when failed to get Answer.
        this._signaling.sendSignalingMessage('soac', {
          id: this._id,
          signaling: localDesc,
        });
        throw e;
      });
    }).then((data) => {
      const publicationId = data.id;
      this._publishTransceivers.get(internalId).id = publicationId;
      this._reverseIdMap.set(publicationId, internalId);

      if (this._id && this._id !== data.transportId) {
        Logger.warning('Server returns conflict ID: ' + data.transportId);
        return;
      }
      this._id = data.transportId;

      const messageEvent = new MessageEvent('id', {
        message: publicationId,
        origin: this._remoteId,
      });
      this.dispatchEvent(messageEvent);

      // Modify local SDP before sending
      if (options) {
        transceivers.forEach(({type, transceiver, option}) => {
          localDesc.sdp = this._setRtpReceiverOptions(
              localDesc.sdp, option, transceiver.mid);
          localDesc.sdp = this._setRtpSenderOptions(
              localDesc.sdp, option, transceiver.mid);
        });
      }
      this._signaling.sendSignalingMessage('soac', {
        id: this._id,
        signaling: localDesc,
      });
    }).catch((e) => {
      Logger.error('Failed to create offer or set SDP. Message: '
          + e.message);
      if (this._publishTransceivers.get(internalId).id) {
        this._unpublish(internalId);
        this._rejectPromise(e);
        this._fireEndedEventOnPublicationOrSubscription();
      } else {
        this._unpublish(internalId);
      }
    });
    return new Promise((resolve, reject) => {
      this._publishPromises.set(internalId, {
        resolve: resolve,
        reject: reject,
      });
    });
  }

  async subscribe(stream, options) {
    if (this._ended) {
      return Promise.reject('Connection closed');
    }
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
    if ((options.audio !== undefined && typeof options.audio !== 'object' &&
        typeof options.audio !== 'boolean' && options.audio !== null) || (
      options.video !== undefined && typeof options.video !== 'object' &&
        typeof options.video !== 'boolean' && options.video !== null)) {
      return Promise.reject(new TypeError('Invalid options type.'));
    }
    if (options.audio && !stream.settings.audio || (options.video &&
        !stream.settings.video)) {
      return Promise.reject(new ConferenceError(
          'options.audio/video cannot be true or an object if there is no '
          + 'audio/video track in remote stream.',
      ));
    }
    if (options.audio === false && options.video === false) {
      return Promise.reject(new ConferenceError(
          'Cannot subscribe a stream without audio and video.'));
    }
    const mediaOptions = {};
    if (options.audio) {
      if (typeof options.audio === 'object' &&
          Array.isArray(options.audio.codecs)) {
        if (options.audio.codecs.length === 0) {
          return Promise.reject(new TypeError(
              'Audio codec cannot be an empty array.'));
        }
      }
      mediaOptions.audio = {};
      mediaOptions.audio.from = stream.id;
    } else {
      mediaOptions.audio = false;
    }
    if (options.video) {
      if (typeof options.video === 'object' &&
          Array.isArray(options.video.codecs)) {
        if (options.video.codecs.length === 0) {
          return Promise.reject(new TypeError(
              'Video codec cannot be an empty array.'));
        }
      }
      mediaOptions.video = {};
      mediaOptions.video.from = stream.id;
      if (options.video.resolution || options.video.frameRate || (options.video
          .bitrateMultiplier && options.video.bitrateMultiplier !== 1) ||
        options.video.keyFrameInterval) {
        mediaOptions.video.parameters = {
          resolution: options.video.resolution,
          framerate: options.video.frameRate,
          bitrate: options.video.bitrateMultiplier ? 'x'
              + options.video.bitrateMultiplier.toString() : undefined,
          keyFrameInterval: options.video.keyFrameInterval,
        };
      }
      if (options.video.rid) {
        // Use rid matched track ID as from if possible
        const matchedSetting = stream.settings.video
            .find((video) => video.rid === options.video.rid);
        if (matchedSetting && matchedSetting._trackId) {
          mediaOptions.video.from = matchedSetting._trackId;
          // Ignore other settings when RID set.
          delete mediaOptions.video.parameters;
        }
        options.video = true;
      }
    } else {
      mediaOptions.video = false;
    }

    const internalId = this._createInternalId();
    // Waiting for previous SDP negotiation if needed
    await this._chainSdpPromise(internalId);

    const offerOptions = {};
    const transceivers = [];
    if (typeof this.pc.addTransceiver === 'function') {
      // |direction| seems not working on Safari.
      if (mediaOptions.audio) {
        const transceiver = this.pc.addTransceiver(
            'audio', {direction: 'recvonly'});
        transceivers.push({
          type: 'audio',
          transceiver,
          from: mediaOptions.audio.from,
          option: {audio: options.audio},
        });
      }
      if (mediaOptions.video) {
        const transceiver = this.pc.addTransceiver(
            'video', {direction: 'recvonly'});
        transceivers.push({
          type: 'video',
          transceiver,
          from: mediaOptions.video.from,
          parameters: mediaOptions.video.parameters,
          option: {video: options.video},
        });
      }
    } else {
      offerOptions.offerToReceiveAudio = !!options.audio;
      offerOptions.offerToReceiveVideo = !!options.video;
    }
    this._subscribeTransceivers.set(internalId, {transceivers});

    let localDesc;
    this.pc.createOffer(offerOptions).then((desc) => {
      localDesc = desc;
      return this.pc.setLocalDescription(desc)
          .catch((errorMessage) => {
            Logger.error('Set local description failed. Message: ' +
                JSON.stringify(errorMessage));
            throw errorMessage;
          });
    }, function(error) {
      Logger.error('Create offer failed. Error info: ' + JSON.stringify(
          error));
      throw error;
    }).then(() => {
      const trackOptions = [];
      transceivers.forEach(({type, transceiver, from, parameters, option}) => {
        trackOptions.push({
          type,
          mid: transceiver.mid,
          from: from,
          parameters: parameters,
        });
      });
      return this._signaling.sendSignalingMessage('subscribe', {
        media: {tracks: trackOptions},
        transport: {id: this._id, type: 'webrtc'},
      }).catch((e) => {
        // Send SDP even when failed to get Answer.
        this._signaling.sendSignalingMessage('soac', {
          id: this._id,
          signaling: localDesc,
        });
        throw e;
      });
    }).then((data) => {
      const subscriptionId = data.id;
      this._subscribeTransceivers.get(internalId).id = subscriptionId;
      this._reverseIdMap.set(subscriptionId, internalId);
      if (this._id && this._id !== data.transportId) {
        Logger.warning('Server returns conflict ID: ' + data.transportId);
        return;
      }
      this._id = data.transportId;

      const messageEvent = new MessageEvent('id', {
        message: subscriptionId,
        origin: this._remoteId,
      });
      this.dispatchEvent(messageEvent);

      // Modify local SDP before sending
      if (options) {
        transceivers.forEach(({type, transceiver, option}) => {
          localDesc.sdp = this._setRtpReceiverOptions(
              localDesc.sdp, option, transceiver.mid);
        });
      }
      this._signaling.sendSignalingMessage('soac', {
        id: this._id,
        signaling: localDesc,
      });
    }).catch((e) => {
      Logger.error('Failed to create offer or set SDP. Message: '
          + e.message);
      if (this._subscribeTransceivers.get(internalId).id) {
        this._unsubscribe(internalId);
        this._rejectPromise(e);
        this._fireEndedEventOnPublicationOrSubscription();
      } else {
        this._unsubscribe(internalId);
      }
    });
    return new Promise((resolve, reject) => {
      this._subscribePromises.set(internalId, {
        resolve: resolve,
        reject: reject,
      });
    });
  }

  close() {
    if (this.pc && this.pc.signalingState !== 'closed') {
      this.pc.close();
    }
  }

  _chainSdpPromise(internalId) {
    const prior = this._sdpPromise;
    const negotiationTimeout = 10000;
    this._sdpPromise = prior.then(
        () => new Promise((resolve, reject) => {
          const resolver = {finish: false, resolve, reject};
          this._sdpResolvers.push(resolver);
          this._sdpResolverMap.set(internalId, resolver);
          setTimeout(() => reject('Timeout to get SDP answer'),
              negotiationTimeout);
        }));
    return prior.catch((e)=>{
      //
    });
  }

  _nextSdpPromise() {
    let ret = false;
    // Skip the finished sdp promise
    while (this._sdpResolveNum < this._sdpResolvers.length) {
      const resolver = this._sdpResolvers[this._sdpResolveNum];
      this._sdpResolveNum++;
      if (!resolver.finish) {
        resolver.resolve();
        resolver.finish = true;
        ret = true;
      }
    }
    return ret;
  }

  _createInternalId() {
    return this._internalCount++;
  }

  _unpublish(internalId) {
    if (this._publishTransceivers.has(internalId)) {
      const {id, transceivers} = this._publishTransceivers.get(internalId);
      if (id) {
        this._signaling.sendSignalingMessage('unpublish', {id})
            .catch((e) => {
              Logger.warning('MCU returns negative ack for unpublishing, ' + e);
            });
        this._reverseIdMap.delete(id);
      }
      // Clean transceiver
      transceivers.forEach(({transceiver}) => {
        if (this.pc.signalingState === 'stable') {
          transceiver.sender.replaceTrack(null);
          this.pc.removeTrack(transceiver.sender);
        }
      });
      this._publishTransceivers.delete(internalId);
      // Fire ended event
      if (this._publications.has(id)) {
        const event = new OwtEvent('ended');
        this._publications.get(id).dispatchEvent(event);
        this._publications.delete(id);
      } else {
        Logger.warning('Invalid publication to unpublish: ' + id);
        if (this._publishPromises.has(internalId)) {
          this._publishPromises.get(internalId).reject(
              new ConferenceError('Failed to publish'));
        }
      }
      if (this._sdpResolverMap.has(internalId)) {
        const resolver = this._sdpResolverMap.get(internalId);
        if (!resolver.finish) {
          resolver.resolve();
          resolver.finish = true;
        }
        this._sdpResolverMap.delete(internalId);
      }
      // Create offer, set local and remote description
    }
  }

  _unsubscribe(internalId) {
    if (this._subscribeTransceivers.has(internalId)) {
      const {id, transceivers} = this._subscribeTransceivers.get(internalId);
      if (id) {
        this._signaling.sendSignalingMessage('unsubscribe', {id})
            .catch((e) => {
              Logger.warning(
                  'MCU returns negative ack for unsubscribing, ' + e);
            });
      }
      // Clean transceiver
      transceivers.forEach(({transceiver}) => {
        transceiver.receiver.track.stop();
      });
      this._subscribeTransceivers.delete(internalId);
      // Fire ended event
      if (this._subscriptions.has(id)) {
        const event = new OwtEvent('ended');
        this._subscriptions.get(id).dispatchEvent(event);
        this._subscriptions.delete(id);
      } else {
        Logger.warning('Invalid subscription to unsubscribe: ' + id);
        if (this._subscribePromises.has(internalId)) {
          this._subscribePromises.get(internalId).reject(
              new ConferenceError('Failed to subscribe'));
        }
      }
      if (this._sdpResolverMap.has(internalId)) {
        const resolver = this._sdpResolverMap.get(internalId);
        if (!resolver.finish) {
          resolver.resolve();
          resolver.finish = true;
        }
        this._sdpResolverMap.delete(internalId);
      }
      // Disable media in remote SDP
      // Set remoteDescription and set localDescription
    }
  }

  _muteOrUnmute(sessionId, isMute, isPub, trackKind) {
    const eventName = isPub ? 'stream-control' :
      'subscription-control';
    const operation = isMute ? 'pause' : 'play';
    return this._signaling.sendSignalingMessage(eventName, {
      id: sessionId,
      operation: operation,
      data: trackKind,
    }).then(() => {
      if (!isPub) {
        const muteEventName = isMute ? 'mute' : 'unmute';
        this._subscriptions.get(sessionId).dispatchEvent(
            new MuteEvent(muteEventName, {kind: trackKind}));
      }
    });
  }

  _applyOptions(sessionId, options) {
    if (typeof options !== 'object' || typeof options.video !== 'object') {
      return Promise.reject(new ConferenceError(
          'Options should be an object.'));
    }
    const videoOptions = {};
    videoOptions.resolution = options.video.resolution;
    videoOptions.framerate = options.video.frameRate;
    videoOptions.bitrate = options.video.bitrateMultiplier ? 'x' + options.video
        .bitrateMultiplier
        .toString() : undefined;
    videoOptions.keyFrameInterval = options.video.keyFrameInterval;
    return this._signaling.sendSignalingMessage('subscription-control', {
      id: sessionId,
      operation: 'update',
      data: {
        video: {parameters: videoOptions},
      },
    }).then();
  }

  _onRemoteStreamAdded(event) {
    Logger.debug('Remote stream added.');
    for (const [internalId, sub] of this._subscribeTransceivers) {
      if (sub.transceivers.find((t) => t.transceiver === event.transceiver)) {
        if (this._subscriptions.has(sub.id)) {
          const subscription = this._subscriptions.get(sub.id);
          subscription.stream = event.streams[0];
          if (this._subscribePromises.has(internalId)) {
            this._subscribePromises.get(internalId).resolve(subscription);
            this._subscribePromises.delete(internalId);
          }
        } else {
          this._remoteMediaStreams.set(sub.id, event.streams[0]);
        }
        return;
      }
    }
    // This is not expected path. However, this is going to happen on Safari
    // because it does not support setting direction of transceiver.
    Logger.warning('Received remote stream without subscription.');
  }

  _onLocalIceCandidate(event) {
    if (event.candidate) {
      if (this.pc.signalingState !== 'stable') {
        this._pendingCandidates.push(event.candidate);
      } else {
        this._sendCandidate(event.candidate);
      }
    } else {
      Logger.debug('Empty candidate.');
    }
  }

  _fireEndedEventOnPublicationOrSubscription() {
    if (this._ended) {
      return;
    }
    this._ended = true;
    const event = new OwtEvent('ended');
    for (const [/* id */, publication] of this._publications) {
      publication.dispatchEvent(event);
      publication.stop();
    }
    for (const [/* id */, subscription] of this._subscriptions) {
      subscription.dispatchEvent(event);
      subscription.stop();
    }
    this.dispatchEvent(event);
    this.close();
  }

  _rejectPromise(error) {
    if (!error) {
      error = new ConferenceError('Connection failed or closed.');
    }
    if (this.pc && this.pc.iceConnectionState !== 'closed') {
      this.pc.close();
    }

    // Rejecting all corresponding promises if publishing and subscribing is ongoing.
    for (const [/* id */, promise] of this._publishPromises) {
      promise.reject(error);
    }
    this._publishPromises.clear();
    for (const [/* id */, promise] of this._subscribePromises) {
      promise.reject(error);
    }
    this._subscribePromises.clear();
  }

  _onIceConnectionStateChange(event) {
    if (!event || !event.currentTarget) {
      return;
    }

    Logger.debug('ICE connection state changed to ' +
        event.currentTarget.iceConnectionState);
    if (event.currentTarget.iceConnectionState === 'closed' ||
        event.currentTarget.iceConnectionState === 'failed') {
      if (event.currentTarget.iceConnectionState === 'failed') {
        this._handleError('connection failed.');
      } else {
        // Fire ended event if publication or subscription exists.
        this._fireEndedEventOnPublicationOrSubscription();
      }
    }
  }

  _onConnectionStateChange(event) {
    if (this.pc.connectionState === 'closed' ||
        this.pc.connectionState === 'failed') {
      if (this.pc.connectionState === 'failed') {
        this._handleError('connection failed.');
      } else {
        // Fire ended event if publication or subscription exists.
        this._fireEndedEventOnPublicationOrSubscription();
      }
    }
  }

  _sendCandidate(candidate) {
    this._signaling.sendSignalingMessage('soac', {
      id: this._id,
      signaling: {
        type: 'candidate',
        candidate: {
          candidate: 'a=' + candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex,
        },
      },
    });
  }

  _createPeerConnection() {
    if (this.pc) {
      Logger.warning('A PeerConnection was created. Cannot create again for ' +
        'the same PeerConnectionChannel.');
      return;
    }

    const pcConfiguration = this._config.rtcConfiguration || {};
    if (Utils.isChrome()) {
      pcConfiguration.bundlePolicy = 'max-bundle';
    }
    this.pc = new RTCPeerConnection(pcConfiguration);
    this.pc.onicecandidate = (event) => {
      this._onLocalIceCandidate.apply(this, [event]);
    };
    this.pc.ontrack = (event) => {
      this._onRemoteStreamAdded.apply(this, [event]);
    };
    this.pc.oniceconnectionstatechange = (event) => {
      this._onIceConnectionStateChange.apply(this, [event]);
    };
    this.pc.onconnectionstatechange = (event) => {
      this._onConnectionStateChange.apply(this, [event]);
    };
  }

  _getStats() {
    if (this.pc) {
      return this.pc.getStats();
    } else {
      return Promise.reject(new ConferenceError(
          'PeerConnection is not available.'));
    }
  }

  _readyHandler(sessionId) {
    const internalId = this._reverseIdMap.get(sessionId);
    if (this._subscribePromises.has(internalId)) {
      const mediaStream = this._remoteMediaStreams.get(sessionId);
      const transportSettings =
          new TransportSettings(TransportType.WEBRTC, this._id);
      transportSettings.rtpTransceivers =
          this._subscribeTransceivers.get(internalId).transceivers;
      const subscription = new Subscription(
          sessionId, mediaStream, transportSettings,
          () => {
            this._unsubscribe(internalId);
          },
          () => this._getStats(),
          (trackKind) => this._muteOrUnmute(sessionId, true, false, trackKind),
          (trackKind) => this._muteOrUnmute(sessionId, false, false, trackKind),
          (options) => this._applyOptions(sessionId, options));
      this._subscriptions.set(sessionId, subscription);
      // Resolve subscription if mediaStream is ready.
      if (this._subscriptions.get(sessionId).stream) {
        this._subscribePromises.get(internalId).resolve(subscription);
        this._subscribePromises.delete(internalId);
      }
    } else if (this._publishPromises.has(internalId)) {
      const transportSettings =
          new TransportSettings(TransportType.WEBRTC, this._id);
      transportSettings.transceivers =
          this._publishTransceivers.get(internalId).transceivers;
      const publication = new Publication(
          sessionId,
          transportSettings,
          () => {
            this._unpublish(internalId);
            return Promise.resolve();
          },
          () => this._getStats(),
          (trackKind) => this._muteOrUnmute(sessionId, true, true, trackKind),
          (trackKind) => this._muteOrUnmute(sessionId, false, true, trackKind));
      this._publications.set(sessionId, publication);
      this._publishPromises.get(internalId).resolve(publication);
      // Do not fire publication's ended event when associated stream is ended.
      // It may still sending silence or black frames.
      // Refer to https://w3c.github.io/webrtc-pc/#rtcrtpsender-interface.
    } else if (!sessionId) {
      // Channel ready
    }
  }

  _sdpHandler(sdp) {
    if (sdp.type === 'answer') {
      this.pc.setRemoteDescription(sdp).then(() => {
        if (this._pendingCandidates.length > 0) {
          for (const candidate of this._pendingCandidates) {
            this._sendCandidate(candidate);
          }
        }
      }, (error) => {
        Logger.error('Set remote description failed: ' + error);
        this._rejectPromise(error);
        this._fireEndedEventOnPublicationOrSubscription();
      }).then(() => {
        if (!this._nextSdpPromise()) {
          Logger.warning('Unexpected SDP promise state');
        }
      });
    }
  }

  _errorHandler(sessionId, errorMessage) {
    if (!sessionId) {
      // Transport error
      return this._handleError(errorMessage);
    }

    // Fire error event on publication or subscription
    const errorEvent = new ErrorEvent('error', {
      error: new ConferenceError(errorMessage),
    });
    if (this._publications.has(sessionId)) {
      this._publications.get(sessionId).dispatchEvent(errorEvent);
    }
    if (this._subscriptions.has(sessionId)) {
      this._subscriptions.get(sessionId).dispatchEvent(errorEvent);
    }
    // Stop publication or subscription
    const internalId = this._reverseIdMap.get(sessionId);
    if (this._publishTransceivers.has(internalId)) {
      this._unpublish(internalId);
    }
    if (this._subscribeTransceivers.has(internalId)) {
      this._unsubscribe(internalId);
    }
  }

  _handleError(errorMessage) {
    const error = new ConferenceError(errorMessage);
    if (this._ended) {
      return;
    }
    const errorEvent = new ErrorEvent('error', {
      error: error,
    });
    for (const [/* id */, publication] of this._publications) {
      publication.dispatchEvent(errorEvent);
    }
    for (const [/* id */, subscription] of this._subscriptions) {
      subscription.dispatchEvent(errorEvent);
    }
    // Fire ended event when error occured
    this._fireEndedEventOnPublicationOrSubscription();
  }

  _setCodecOrder(sdp, options, mid) {
    if (options.audio) {
      if (options.audio.codecs) {
        const audioCodecNames = Array.from(options.audio.codecs, (codec) =>
          codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'audio', audioCodecNames, mid);
      } else {
        const audioCodecNames = Array.from(options.audio,
            (encodingParameters) => encodingParameters.codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'audio', audioCodecNames, mid);
      }
    }
    if (options.video) {
      if (options.video.codecs) {
        const videoCodecNames = Array.from(options.video.codecs, (codec) =>
          codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'video', videoCodecNames, mid);
      } else {
        const videoCodecNames = Array.from(options.video,
            (encodingParameters) => encodingParameters.codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'video', videoCodecNames, mid);
      }
    }
    return sdp;
  }

  _setMaxBitrate(sdp, options, mid) {
    if (typeof options.audio === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.audio, mid);
    }
    if (typeof options.video === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.video, mid);
    }
    return sdp;
  }

  _setRtpSenderOptions(sdp, options, mid) {
    // SDP mugling is deprecated, moving to `setParameters`.
    if (this._isRtpEncodingParameters(options.audio) ||
        this._isRtpEncodingParameters(options.video)) {
      return sdp;
    }
    sdp = this._setMaxBitrate(sdp, options, mid);
    return sdp;
  }

  _setRtpReceiverOptions(sdp, options, mid) {
    // Add legacy simulcast in SDP for safari.
    if (this._isRtpEncodingParameters(options.video) && Utils.isSafari()) {
      if (options.video.length > 1) {
        sdp = SdpUtils.addLegacySimulcast(
            sdp, 'video', options.video.length, mid);
      }
    }

    // _videoCodecs is a workaround for setting video codecs. It will be moved to RTCRtpSendParameters.
    if (this._isRtpEncodingParameters(options.video) && this._videoCodecs) {
      sdp = SdpUtils.reorderCodecs(sdp, 'video', this._videoCodecs, mid);
      return sdp;
    }
    if (this._isRtpEncodingParameters(options.audio) ||
        this._isRtpEncodingParameters(options.video)) {
      return sdp;
    }
    sdp = this._setCodecOrder(sdp, options, mid);
    return sdp;
  }

  // Handle stream event sent from MCU. Some stream update events sent from
  // server, more specifically audio.status and video.status events should be
  // publication event or subscription events. They don't change MediaStream's
  // status. See
  // https://github.com/open-webrtc-toolkit/owt-server/blob/master/doc/Client-Portal%20Protocol.md#339-participant-is-notified-on-streams-update-in-room
  // for more information.
  _onStreamEvent(message) {
    const eventTargets = [];
    if (this._publications.has(message.id)) {
      eventTargets.push(this._publications.get(message.id));
    }
    for (const subscription of this._subscriptions) {
      if (message.id === subscription._audioTrackId ||
          message.id === subscription._videoTrackId) {
        eventTargets.push(subscription);
      }
    }
    if (!eventTargets.length) {
      return;
    }
    let trackKind;
    if (message.data.field === 'audio.status') {
      trackKind = TrackKind.AUDIO;
    } else if (message.data.field === 'video.status') {
      trackKind = TrackKind.VIDEO;
    } else {
      Logger.warning('Invalid data field for stream update info.');
    }
    if (message.data.value === 'active') {
      eventTargets.forEach((target) =>
        target.dispatchEvent(new MuteEvent('unmute', {kind: trackKind})));
    } else if (message.data.value === 'inactive') {
      eventTargets.forEach((target) =>
        target.dispatchEvent(new MuteEvent('mute', {kind: trackKind})));
    } else {
      Logger.warning('Invalid data value for stream update info.');
    }
  }

  _isRtpEncodingParameters(obj) {
    if (!Array.isArray(obj)) {
      return false;
    }
    // Only check the first one.
    const param = obj[0];
    return !!(
      param.codecPayloadType || param.dtx || param.active || param.ptime ||
      param.maxFramerate || param.scaleResolutionDownBy || param.rid ||
      param.scalabilityMode);
  }

  _isOwtEncodingParameters(obj) {
    if (!Array.isArray(obj)) {
      return false;
    }
    // Only check the first one.
    const param = obj[0];
    return !!param.codec;
  }
}
