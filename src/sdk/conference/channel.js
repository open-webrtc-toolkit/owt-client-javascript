// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import Logger from '../base/logger.js';
import { EventDispatcher, MessageEvent, IcsEvent, ErrorEvent, MuteEvent } from '../base/event.js';
import { TrackKind } from '../base/mediaformat.js'
import { Publication } from '../base/publication.js';
import { Subscription } from './subscription.js'
import { ConferenceError } from './error.js'
import * as Utils from '../base/utils.js';
import * as ErrorModule from './error.js';
import * as StreamModule from '../base/stream.js';
import * as SdpUtils from '../base/sdputils.js';

export class ConferencePeerConnectionChannel extends EventDispatcher {
  constructor(config, signaling) {
    super();
    this._config = config;
    this._options = null;
    this._signaling = signaling;
    this._pc = null;
    this._internalId = null;  // It's publication ID or subscription ID.
    this._pendingCandidates = [];
    this._subscribePromise = null;
    this._publishPromise = null;
    this._subscribedStream = null;
    this._publishedStream = null;
    this._publication = null;
    this._subscription = null;
    this._disconnectTimer = null;  // Timer for PeerConnection disconnected. Will stop connection after timer.
    this._ended = false;
  }

  onMessage(notification, message) {
    switch (notification) {
      case 'progress':
        if (message.status === 'soac')
          this._sdpHandler(message.data);
        else if (message.status === 'ready')
          this._readyHandler();
        else if(message.status === 'error')
          this._errorHandler(message.data);
        break;
      case 'stream':
        this._onStreamEvent(message);
        break;
      default:
        Logger.warning('Unknown notification from MCU.');
    }
  }

  publish(stream, options) {
    if (options === undefined) {
      options = { audio: !!stream.mediaStream.getAudioTracks(), video: !!stream
          .mediaStream.getVideoTracks() };
    }
    if (typeof options !== 'object') {
      return Promise.reject(new TypeError('Options should be an object.'));
    }
    if (options.audio === undefined) {
      options.audio = !!stream.mediaStream.getAudioTracks();
    }
    if (options.video === undefined) {
      options.video = !!stream.mediaStream.getVideoTracks();
    }
    if (options.audio && !stream.mediaStream.getAudioTracks() || (options.video &&
        !stream.mediaStream.getVideoTracks())) {
      return Promise.reject(new ConferenceError(
        'options.audio/video cannot be true or an object if there is no audio/video track present in the MediaStream.'
      ));
    }
    if (options.audio === false && options.video === false) {
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
            parameters.maxBitrate !== undefined && typeof parameters.maxBitrate !==
            'number')) {
          return Promise.reject(new TypeError(
            'options.audio has incorrect parameters.'));
        }
      }
    }
    if (typeof options.video === 'object') {
      if (!Array.isArray(options.video)) {
        return Promise.reject(new TypeError(
          'options.video should be a boolean or an array.'));
      }
      for (const parameters of options.video) {
        if (!parameters.codec || typeof parameters.codec.name !== 'string' || (
            parameters.maxBitrate !== undefined && typeof parameters.maxBitrate !==
            'number') || (parameters.codec.profile !== undefined && typeof parameters
            .codec.profile !== 'string')) {
          return Promise.reject(new TypeError(
            'options.video has incorrect parameters.'));
        }
      }
    }
    this._options = options;
    const mediaOptions = {};
    if (stream.mediaStream.getAudioTracks().length > 0) {
      if (stream.mediaStream.getAudioTracks().length > 1) {
        Logger.warning(
          'Publishing a stream with multiple audio tracks is not fully supported.'
        );
      }
      if (typeof options.audio !== 'boolean' && typeof options.audio !==
        'object') {
        return Promise.reject(new ConferenceError(
          'Type of audio options should be boolean or an object.'
        ));
      }
      mediaOptions.audio = {};
      mediaOptions.audio.source = stream.source.audio;
    } else {
      mediaOptions.audio = false;
    }
    if (stream.mediaStream.getVideoTracks().length > 0) {
      if (stream.mediaStream.getVideoTracks().length > 1) {
        Logger.warning(
          'Publishing a stream with multiple video tracks is not fully supported.'
        );
      }
      mediaOptions.video = {};
      mediaOptions.video.source = stream.source.video;
      const trackSettings = stream.mediaStream.getVideoTracks()[0].getSettings();
      mediaOptions.video.parameters = {
        resolution: {
          width: trackSettings.width,
          height: trackSettings.height
        },
        framerate: trackSettings.frameRate
      };
    } else {
      mediaOptions.video = false;
    }
    this._publishedStream = stream;
    this._signaling.sendSignalingMessage('publish', {
      media: mediaOptions,
      attributes: stream.attributes
    }).then((data) => {
      const messageEvent = new MessageEvent('id', {
        message: data.id,
        origin: this._remoteId
      });
      this.dispatchEvent(messageEvent);
      this._internalId = data.id;
      this._createPeerConnection();
      this._pc.addStream(stream.mediaStream);
      const offerOptions = {
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      };
      if (this._isAddTransceiverSupported()) {
        // |direction| seems not working on Safari.
        if (mediaOptions.audio && stream.mediaStream.getAudioTracks() > 0) {
          const audioTransceiver = this._pc.addTransceiver('audio', { direction: 'sendonly' });
        }
        if (mediaOptions.video && stream.mediaStream.getVideoTracks() > 0) {
          const videoTransceiver = this._pc.addTransceiver('video', { direction: 'sendonly' });
        }
      }
      let localDesc;
      this._pc.createOffer(offerOptions).then(desc => {
        if (options) {
          desc.sdp = this._setRtpReceiverOptions(desc.sdp, options);
        }
        return desc;
      }).then(desc => {
        localDesc = desc;
        return this._pc.setLocalDescription(desc);
      }).then(() => {
        this._signaling.sendSignalingMessage('soac', {
          id: this
            ._internalId,
          signaling: localDesc
        });
      }).catch(e => {
        Logger.error('Failed to create offer or set SDP. Message: ' + e.message);
        this._unpublish();
        this._rejectPromise(e);
        this._fireEndedEventOnPublicationOrSubscription();
      });
    }).catch(e => {
      this._unpublish();
      this._rejectPromise(e);
      this._fireEndedEventOnPublicationOrSubscription();
    });
    return new Promise((resolve, reject) => {
      this._publishPromise = { resolve: resolve, reject: reject };
    });
  }

  subscribe(stream, options) {
    if (options === undefined) {
      options = {
        audio: !!stream.capabilities.audio,
        video: !!stream.capabilities.video
      };
    }
    if (typeof options !== 'object') {
      return Promise.reject(new TypeError('Options should be an object.'));
    }
    if (options.audio === undefined) {
      options.audio = !!stream.capabilities.audio
    }
    if (options.video === undefined) {
      options.video = !!stream.capabilities.video
    }
    if ((options.audio !== undefined && typeof options.audio !== 'object' &&
        typeof options.audio !== 'boolean' && options.audio !== null) || (
        options.video !== undefined && typeof options.video !== 'object' &&
        typeof options.video !== 'boolean' && options.video !== null)) {
      return Promise.reject(new TypeError('Invalid options type.'))
    }
    if (options.audio && !stream.capabilities.audio || (options.video &&
        !stream.capabilities.video)) {
      return Promise.reject(new ConferenceError(
        'options.audio/video cannot be true or an object if there is no audio/video track in remote stream.'
      ));
    }
    if (options.audio === false && options.video === false) {
      return Promise.reject(new ConferenceError(
        'Cannot subscribe a stream without audio and video.'));
    }
    this._options = options;
    const mediaOptions = {};
    if (options.audio) {
      mediaOptions.audio = {};
      mediaOptions.audio.from = stream.id;
    } else {
      mediaOptions.audio = false;
    }
    if (options.video) {
      mediaOptions.video = {};
      mediaOptions.video.from = stream.id;
      if (options.video.resolution || options.video.frameRate || (options.video
          .bitrateMultiplier && options.video.bitrateMultiplier !== 1) ||
        options.video.keyFrameInterval) {
        mediaOptions.video.parameters = {
          resolution: options.video.resolution,
          framerate: options.video.frameRate,
          bitrate: options.video.bitrateMultiplier ? 'x' + options.video.bitrateMultiplier
            .toString() : undefined,
          keyFrameInterval: options.video.keyFrameInterval
        }
      }
    } else {
      mediaOptions.video = false;
    }
    this._subscribedStream = stream;
    this._signaling.sendSignalingMessage('subscribe', {
      media: mediaOptions
    }).then((data) => {
      const messageEvent = new MessageEvent('id', {
        message: data.id,
        origin: this._remoteId
      });
      this.dispatchEvent(messageEvent);
      this._internalId = data.id;
      this._createPeerConnection();
      const offerOptions = {
        offerToReceiveAudio: !!options.audio,
        offerToReceiveVideo: !!options.video
      };
      if (this._isAddTransceiverSupported()) {
        // |direction| seems not working on Safari.
        if (mediaOptions.audio) {
          const audioTransceiver = this._pc.addTransceiver('audio', { direction: 'recvonly' });
        }
        if (mediaOptions.video) {
          const videoTransceiver = this._pc.addTransceiver('video', { direction: 'recvonly' });
        }
      }
      this._pc.createOffer(offerOptions).then(desc => {
        if (options) {
          desc.sdp = this._setRtpReceiverOptions(desc.sdp, options);
        }
        this._pc.setLocalDescription(desc).then(() => {
          this._signaling.sendSignalingMessage('soac', {
            id: this
              ._internalId,
            signaling: desc
          })
        }, function(errorMessage) {
          Logger.error('Set local description failed. Message: ' +
            JSON.stringify(errorMessage));
        });
      }, function(error) {
        Logger.error('Create offer failed. Error info: ' + JSON.stringify(
          error));
      });
    }).catch(e => {
      this._unsubscribe();
      this._rejectPromise(e);
      this._fireEndedEventOnPublicationOrSubscription();
    });
    return new Promise((resolve, reject) => {
      this._subscribePromise = { resolve: resolve, reject: reject };
    });
  }

  _unpublish() {
    this._signaling.sendSignalingMessage('unpublish', { id: this._internalId })
      .catch(e => {
        Logger.warning('MCU returns negative ack for unpublishing, ' + e);
      });
    if (this._pc.signalingState !== 'closed') {
      this._pc.close();
    }
  }

  _unsubscribe() {
    this._signaling.sendSignalingMessage('unsubscribe', {
        id: this._internalId
      })
      .catch(e => {
        Logger.warning('MCU returns negative ack for unsubscribing, ' + e);
      });
    if (this._pc && this._pc.signalingState !== 'closed') {
      this._pc.close();
    }
  }

  _muteOrUnmute(isMute, isPub, trackKind) {
    const eventName = isPub ? 'stream-control' :
      'subscription-control';
    const operation = isMute ? 'pause' : 'play';
    return this._signaling.sendSignalingMessage(eventName, {
      id: this._internalId,
      operation: operation,
      data: trackKind
    }).then(() => {
      if (!isPub) {
        const muteEventName = isMute ? 'mute' : 'unmute';
        this._subscription.dispatchEvent(new MuteEvent(muteEventName, { kind: trackKind }));
      }
    });
  }

  _applyOptions(options) {
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
      id: this._internalId,
      operation: 'update',
      data: {
        video: { parameters: videoOptions }
      }
    }).then();
  }

  _onRemoteStreamAdded(event) {
    Logger.debug('Remote stream added.');
    if (this._subscribedStream) {
      this._subscribedStream.mediaStream = event.stream;
    } else {
      // This is not expected path. However, this is going to happen on Safari
      // because it does not support setting direction of transceiver.
      Logger.warning('Received remote stream without subscription.');
    }
  }

  _onLocalIceCandidate(event) {
    if (event.candidate) {
      if (this._pc.signalingState !== 'stable') {
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
    const event = new IcsEvent('ended')
    if (this._publication) {
      this._publication.dispatchEvent(event);
      this._publication.stop();
    } else if (this._subscription) {
      this._subscription.dispatchEvent(event);
      this._subscription.stop();
    }
  }

  _rejectPromise(error) {
    if (!error) {
      const error = new ConferenceError('Connection failed or closed.');
    }
    // Rejecting corresponding promise if publishing and subscribing is ongoing.
    if (this._publishPromise) {
      this._publishPromise.reject(error);
      this._publishPromise = undefined;
    } else if (this._subscribePromise) {
      this._subscribePromise.reject(error);
      this._subscribePromise = undefined;
    }
  }

  _onIceConnectionStateChange(event) {
    if (!event || !event.currentTarget)
      return;

    Logger.debug('ICE connection state changed to ' + event.currentTarget.iceConnectionState);
    if (event.currentTarget.iceConnectionState === 'closed' || event.currentTarget
      .iceConnectionState === 'failed') {
      this._rejectPromise(new ConferenceError('ICE connection failed or closed.'));
      // Fire ended event if publication or subscription exists.
      this._fireEndedEventOnPublicationOrSubscription();
    }
  }

  _sendCandidate(candidate) {
    this._signaling.sendSignalingMessage('soac', {
      id: this._internalId,
      signaling: {
        type: 'candidate',
        candidate: {
          candidate: 'a=' + candidate.candidate,
          sdpMid: candidate.sdpMid,
          sdpMLineIndex: candidate.sdpMLineIndex
        }
      }
    });
  }

  _createPeerConnection() {
    const pcConfiguration = this._config.rtcConfiguration || {};
    if (Utils.isChrome()) {
      pcConfiguration.sdpSemantics = 'plan-b';
    }
    this._pc = new RTCPeerConnection(pcConfiguration);
    this._pc.onicecandidate = (event) => {
      this._onLocalIceCandidate.apply(this, [event]);
    };
    this._pc.onaddstream = (event) => {
      this._onRemoteStreamAdded.apply(this, [event]);
    };
    this._pc.oniceconnectionstatechange = (event) => {
      this._onIceConnectionStateChange.apply(this, [event]);
    };
  }

  _getStats() {
    if (this._pc) {
      return this._pc.getStats();
    } else {
      return Promise.reject(new ConferenceError(
        'PeerConnection is not available.'));
    }
  }

  _readyHandler() {
    if (this._subscribePromise) {
      this._subscription = new Subscription(this._internalId, () => {
          this._unsubscribe();
          return Promise.resolve();
        }, () => this._getStats(),
        trackKind => this._muteOrUnmute(true, false, trackKind),
        trackKind => this._muteOrUnmute(false, false, trackKind),
        options => this._applyOptions(options));
      // Fire subscription's ended event when associated stream is ended.
      this._subscribedStream.addEventListener('ended', () => {
        this._subscription.dispatchEvent('ended', new IcsEvent('ended'));
      });
      this._subscribePromise.resolve(this._subscription);
    } else if (this._publishPromise) {
      this._publication = new Publication(this._internalId, () => {
          this._unpublish();
          return Promise.resolve();
        }, () => this._getStats(),
        trackKind => this._muteOrUnmute(true, true, trackKind),
        trackKind => this._muteOrUnmute(false, true, trackKind));
      this._publishPromise.resolve(this._publication);
      // Do not fire publication's ended event when associated stream is ended.
      // It may still sending silence or black frames.
      // Refer to https://w3c.github.io/webrtc-pc/#rtcrtpsender-interface.
    }
    this._publishPromise = null;
    this._subscribePromise = null;
  }

  _sdpHandler(sdp) {
    if (sdp.type === 'answer') {
      if ((this._publication || this._publishPromise) && this._options) {
        sdp.sdp = this._setRtpSenderOptions(sdp.sdp, this._options);
      }
      this._pc.setRemoteDescription(sdp).then(() => {
        if (this._pendingCandidates.length > 0) {
          for (const candidate of this._pendingCandidates) {
            this._sendCandidate(candidate);
          }
        }
      }, (error) => {
        Logger.error('Set remote description failed: ' + error);
        this._rejectPromise(error);
        this._fireEndedEventOnPublicationOrSubscription();
      });
    }
  }

  _errorHandler(errorMessage) {
    const p = this._publishPromise || this._subscribePromise;
    if (p) {
      p.reject(new ConferenceError(errorMessage));
      return;
    }
    const dispatcher = this._publication || this._subscription;
    if (!dispatcher) {
      Logger.warning('Neither publication nor subscription is available.');
      return;
    }
    const error = new ConferenceError(errorMessage);
    const errorEvent = new ErrorEvent('error', {
      error: error
    });
    dispatcher.dispatchEvent(errorEvent);
  }

  _setCodecOrder(sdp, options) {
    if (this._publication || this._publishPromise) {
      if (options.audio) {
        const audioCodecNames = Array.from(options.audio,
          encodingParameters => encodingParameters.codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'audio', audioCodecNames);
      }
      if (options.video) {
        const videoCodecNames = Array.from(options.video,
          encodingParameters => encodingParameters.codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'video', videoCodecNames);
      }
    } else {
      if (options.audio && options.audio.codecs) {
        const audioCodecNames = Array.from(options.audio.codecs, codec =>
          codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'audio', audioCodecNames);
      }
      if (options.video && options.video.codecs) {
        const videoCodecNames = Array.from(options.video.codecs, codec =>
          codec.name);
        sdp = SdpUtils.reorderCodecs(sdp, 'video', videoCodecNames);
      }
    }
    return sdp;
  }

  _setMaxBitrate(sdp, options) {
    if (typeof options.audio === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.audio);
    }
    if (typeof options.video === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.video);
    }
    return sdp;
  }

  _setRtpSenderOptions(sdp, options) {
    sdp = this._setMaxBitrate(sdp, options);
    return sdp;
  }

  _setRtpReceiverOptions(sdp, options) {
    sdp = this._setCodecOrder(sdp, options);
    return sdp;
  }

  // Handle stream event sent from MCU. Some stream events should be publication event or subscription event. It will be handled here.
  _onStreamEvent(message) {
    let eventTarget;
    if (this._publication && message.id === this._publication.id) {
      eventTarget = this._publication;
    } else if (
      this._subscribedStream && message.id === this._subscribedStream.id) {
      eventTarget = this._subscription;
    }
    if (!eventTarget) {
      Logger.debug('Cannot find valid event target.');
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
      eventTarget.dispatchEvent(new MuteEvent('unmute', { kind: trackKind }));
    } else if (message.data.value === 'inactive') {
      eventTarget.dispatchEvent(new MuteEvent('mute', { kind: trackKind }));
    } else {
      Logger.warning('Invalid data value for stream update info.');
    }
  }

  _isAddTransceiverSupported() {
    const sysInfo = Utils.sysInfo();
    return (typeof this._pc.addTransceiver === 'function' && ((sysInfo.runtime
      .name !== 'Chrome') || sysInfo.runtime.version <= 68));
  }
}
