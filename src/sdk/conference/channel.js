// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import Logger from '../base/logger.js';
import { EventDispatcher, MessageEvent, IcsEvent, ErrorEvent } from '../base/event.js';
import { Publication } from '../base/publication.js';
import { Subscription } from './subscription.js'
import { ConferenceError } from './error.js'
import * as Utils from '../base/utils.js';
import * as ErrorModule from './error.js';
import * as StreamModule from '../base/stream.js';

export class ConferencePeerConnectionChannel extends EventDispatcher {
  constructor(config, signaling) {
    super();
    this._config = config;
    this._signaling = signaling;
    this._pc = null;
    this._internalId = null; // It's publication ID or subscription ID.
    this._pendingCandidates = [];
    this._subscribePromise = null;
    this._publishPromise = null;
    this._subscribedStream = null;
    this._publication = null;
    this._subscription = null;
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
      default:
        Logger.warning('Unknown notification from MCU.');
    }
  }

  publish(stream) {
    const mediaOptions = {};
    if (stream.mediaStream.getAudioTracks().length > 0) {
      if (stream.mediaStream.getAudioTracks().length > 1) {
        Logger.warning(
          'Publishing a stream with multiple audio tracks is not fully supported.'
        );
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
    this._signaling.sendSignalingMessage('publish', {
      type: 'webrtc',
      connection: undefined,
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
      this._pc.createOffer(offerOptions).then(desc => {
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
    });
    return new Promise((resolve, reject) => {
      this._publishPromise = { resolve: resolve, reject: reject };
    });
  }

  subscribe(stream, options) {
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
      type: 'webrtc',
      connection: undefined,
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
      this._pc.createOffer(offerOptions).then(desc => {
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
    });
    return new Promise((resolve, reject) => {
      this._subscribePromise = { resolve: resolve, reject: reject };
    });
  }

  _unpublish(){
    this._signaling.sendSignalingMessage('unpublish', {id: this._internalId});
  }

  _unsubscribe() {
    this._signaling.sendSignalingMessage('unsubscribe', { id: this._internalId });
    this._pc.close();
  }

  _onRemoteStreamAdded(event) {
    Logger.debug('Remote stream added.');
    this._subscribedStream.mediaStream = event.stream;
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
    this._pc = new RTCPeerConnection(this._config);
    this._pc.onicecandidate = (event) => {
      this._onLocalIceCandidate.apply(this, [event]);
    };
    this._pc.onaddstream = (event) => {
      this._onRemoteStreamAdded.apply(this, [event]);
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
      }, () => {
        return this._getStats();
      });
      this._subscribePromise.resolve(this._subscription);
    } else if (this._publishPromise) {
      this._publication = new Publication(this._internalId, () => {
        this._unpublish();
        return Promise.resolve();
      }, () => {
        return this._getStats();
      });
      this._publishPromise.resolve(this._publication);
    }
    this._publishPromise = null;
    this._subscribePromise = null;
  }

  _sdpHandler(sdp) {
    if (sdp.type === 'answer') {
      this._pc.setRemoteDescription(sdp).then(() => {
        if (this._pendingCandidates.length > 0) {
          for (const candidate of this._pendingCandidates) {
            this._sendCandidate(candidate);
          }
        }
      });
    }
  }

  _errorHandler(errorMessage) {
    const dispatcher = this._publication || this._subscription;
    if (!dispatcher) {
      Logger.warning('Neither publication nor subscription is available.');
    }
    const error = new ConferenceError(errorMessage);
    const errorEvent = new ErrorEvent('error', {
      error: error
    });
    dispatcher.dispatchEvent(errorEvent);
    // TODO: test
  }
}
