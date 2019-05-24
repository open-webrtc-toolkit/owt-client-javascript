// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global Promise */

'use strict';

import Logger from '../base/logger.js';
import {
  EventDispatcher,
  MessageEvent,
} from '../base/event.js';

/**
 * @class ConferenceDataChannel
 * @classDesc A channel for a QUIC transport between client and conference server.
 * @hideconstructor
 * @private
 */
export class ConferenceDataChannel extends EventDispatcher {
  constructor(config, signaling) {
    super();
    this._config = config;
    this._signaling = signaling;
    this._iceTransport = null;
    this._quicTransport = null;
    this._internalId = null; // It's publication ID or subscription ID.
    this._pendingCandidates = [];
    this._ended = false;
    this._quicStreams = [];
    this._createStreamPromise = null;
    this._streamSubscribed = null;
    this._outgoing =
    true; // This is actually a bidirectional channel. But server side cannot handle mutiplexing at this time.
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

  /**
   * @function createStream
   * @desc Create a bidirectional stream.
   * @private
   */
  createStream() {
    if (this._quicTransport && this._quicTransport.state == 'connected') {
      const stream = this._quicTransport.createStream()
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

  _onicecandidate(event) {
    if (event.candidate) {
      this._signaling.sendSignalingMessage('soac', {
        id: this._internalId,
        signaling: {
          type: 'candidate',
          candidate: {
            candidate: event.candidate.candidate,
            sdpMid: 0,
            sdpMLineIndex: 0
          }
        }
      });
    }
  }

  _onicestatechange(event) {
    Logger.info('onstatechange: ' + this._iceTransport.state);
    if (this._iceTransport.state === 'connected' && this._quicTransport
      .state === 'new') {
      this._quicTransport.connect();
    }
  }

  _onquicstatechange(event) {
    Logger.info('on QUIC state change: ' + this._quicTransport.state);
    if (this._quicTransport.state === 'connected') {
      if (this._quicStreams.length === 0) {
        this._quicStreams.push(this._quicTransport.createStream());
        if (this._createStreamPromise) {
          this._createStreamPromise.resolve(this._quicStreams[0]);
        }
      }
    }
  }

  _createQuicTransport() {
    this._iceTransport = new RTCIceTransport(this._config.rtcConfiguration ||
    {});
    this._iceTransport.onicecandidate = (event) => {
      this._onicecandidate.apply(this, [event]);
    };
    this._iceTransport.onstatechange = (event) => {
      this._onicestatechange.apply(this, [event]);
    };
    this._quicTransport = new RTCQuicTransport(this._iceTransport);
    this._quicTransport.onstatechange = (event) => {
      this._onquicstatechange.apply(this, [event]);
    }
    Logger.info('QUIC key: ' + Array.from(new Uint8Array(this._quicTransport
      .getKey())));
    this._signaling.sendSignalingMessage('soac', {
      id: this._internalId,
      signaling: {
        type: 'quic-p2p-client-parameters',
        quicKey: Array.from(new Uint8Array(this._quicTransport.getKey())),
        iceParameters: this._iceTransport.getLocalParameters()
      }
    });
    this._iceTransport.gather({});
  }

  _initialize() {
    this._signaling.sendSignalingMessage(this._outgoing ? 'publish' :
      'subscribe', {
        media: false,
        //media: {audio:{source:"mic"},video:{source:"camera",parameters:{resolution:{width:640,height:480},framerate:20}}},  // Fake media info here because server requires this info.
        data: this._outgoing ? true : {
          from: this._streamSubscribed.id
        }
      }).then((data) => {
      const messageEvent = new MessageEvent('id', {
        message: data.id,
        origin: undefined,
      });
      this.dispatchEvent(messageEvent);
      this._internalId = data.id;
      this._createQuicTransport();
    });
  }

  _soacHandler(soacMessage) {
    if (soacMessage.type === 'quic-p2p-server-parameters') {
      this._iceTransport.start(soacMessage.iceParameters);
    }
  }

  _readyHandler() {
    Logger.info('Ready.');
  }
};
