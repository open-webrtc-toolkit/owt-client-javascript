// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* global Map, Promise */

'use strict';

import * as EventModule from '../base/event.js';
import {SioSignaling as Signaling} from './signaling.js';
import Logger from '../base/logger.js';
import {Base64} from '../base/base64.js';
import {ConferenceError} from './error.js';
import * as Utils from '../base/utils.js';
import * as StreamModule from '../base/stream.js';
import {Participant} from './participant.js';
import {ConferenceInfo} from './info.js';
import {ConferencePeerConnectionChannel} from './channel.js';
import {
  RemoteMixedStream,
  ActiveAudioInputChangeEvent,
  LayoutChangeEvent,
} from './mixedstream.js';
import * as StreamUtilsModule from './streamutils.js';

const SignalingState = {
  READY: 1,
  CONNECTING: 2,
  CONNECTED: 3,
};

const protocolVersion = '1.1';

/* eslint-disable valid-jsdoc */
/**
 * @class ParticipantEvent
 * @classDesc Class ParticipantEvent represents a participant event.
   @extends Owt.Base.OwtEvent
 * @memberof Owt.Conference
 * @hideconstructor
 */
const ParticipantEvent = function(type, init) {
  const that = new EventModule.OwtEvent(type, init);
  /**
   * @member {Owt.Conference.Participant} participant
   * @instance
   * @memberof Owt.Conference.ParticipantEvent
   */
  that.participant = init.participant;
  return that;
};
/* eslint-enable valid-jsdoc */

/**
 * @class ConferenceClientConfiguration
 * @classDesc Configuration for ConferenceClient.
 * @memberOf Owt.Conference
 * @hideconstructor
 */
class ConferenceClientConfiguration { // eslint-disable-line no-unused-vars
  // eslint-disable-next-line require-jsdoc
  constructor() {
    /**
     * @member {?RTCConfiguration} rtcConfiguration
     * @instance
     * @memberof Owt.Conference.ConferenceClientConfiguration
     * @desc It will be used for creating PeerConnection.
     * @see {@link https://www.w3.org/TR/webrtc/#rtcconfiguration-dictionary|RTCConfiguration Dictionary of WebRTC 1.0}.
     * @example
     * // Following object can be set to conferenceClientConfiguration.rtcConfiguration.
     * {
     *   iceServers: [{
     *      urls: "stun:example.com:3478"
     *   }, {
     *     urls: [
     *       "turn:example.com:3478?transport=udp",
     *       "turn:example.com:3478?transport=tcp"
     *     ],
     *      credential: "password",
     *      username: "username"
     *   }
     * }
     */
    this.rtcConfiguration = undefined;
  }
}

/**
 * @class ConferenceClient
 * @classdesc The ConferenceClient handles PeerConnections between client and server. For conference controlling, please refer to REST API guide.
 * Events:
 *
 * | Event Name            | Argument Type                    | Fired when       |
 * | --------------------- | ---------------------------------| ---------------- |
 * | streamadded           | Owt.Base.StreamEvent             | A new stream is available in the conference. |
 * | participantjoined     | Owt.Conference.ParticipantEvent  | A new participant joined the conference. |
 * | messagereceived       | Owt.Base.MessageEvent            | A new message is received. |
 * | serverdisconnected    | Owt.Base.OwtEvent                | Disconnected from conference server. |
 *
 * @memberof Owt.Conference
 * @extends Owt.Base.EventDispatcher
 * @constructor
 * @param {?Owt.Conference.ConferenceClientConfiguration } config Configuration for ConferenceClient.
 * @param {?Owt.Conference.SioSignaling } signalingImpl Signaling channel implementation for ConferenceClient. SDK uses default signaling channel implementation if this parameter is undefined. Currently, a Socket.IO signaling channel implementation was provided as ics.conference.SioSignaling. However, it is not recommended to directly access signaling channel or customize signaling channel for ConferenceClient as this time.
 */
export const ConferenceClient = function(config, signalingImpl) {
  Object.setPrototypeOf(this, new EventModule.EventDispatcher());
  config = config || {};
  const self = this;
  let signalingState = SignalingState.READY;
  const signaling = signalingImpl ? signalingImpl : (new Signaling());
  let me;
  let room;
  const remoteStreams = new Map(); // Key is stream ID, value is a RemoteStream.
  const participants = new Map(); // Key is participant ID, value is a Participant object.
  const publishChannels = new Map(); // Key is MediaStream's ID, value is pc channel.
  const channels = new Map(); // Key is channel's internal ID, value is channel.

  /**
   * @function onSignalingMessage
   * @desc Received a message from conference portal. Defined in client-server protocol.
   * @param {string} notification Notification type.
   * @param {object} data Data received.
   * @private
   */
  function onSignalingMessage(notification, data) {
    if (notification === 'soac' || notification === 'progress') {
      if (!channels.has(data.id)) {
        Logger.warning('Cannot find a channel for incoming data.');
        return;
      }
      channels.get(data.id).onMessage(notification, data);
    } else if (notification === 'stream') {
      if (data.status === 'add') {
        fireStreamAdded(data.data);
      } else if (data.status === 'remove') {
        fireStreamRemoved(data);
      } else if (data.status === 'update') {
        // Broadcast audio/video update status to channel so specific events can be fired on publication or subscription.
        if (data.data.field === 'audio.status' || data.data.field ===
          'video.status') {
          channels.forEach((c) => {
            c.onMessage(notification, data);
          });
        } else if (data.data.field === 'activeInput') {
          fireActiveAudioInputChange(data);
        } else if (data.data.field === 'video.layout') {
          fireLayoutChange(data);
        } else if (data.data.field === '.') {
          updateRemoteStream(data.data.value);
        } else {
          Logger.warning('Unknown stream event from MCU.');
        }
      }
    } else if (notification === 'text') {
      fireMessageReceived(data);
    } else if (notification === 'participant') {
      fireParticipantEvent(data);
    }
  }

  signaling.addEventListener('data', (event) => {
    onSignalingMessage(event.message.notification, event.message.data);
  });

  signaling.addEventListener('disconnect', () => {
    clean();
    signalingState = SignalingState.READY;
    self.dispatchEvent(new EventModule.OwtEvent('serverdisconnected'));
  });

  // eslint-disable-next-line require-jsdoc
  function fireParticipantEvent(data) {
    if (data.action === 'join') {
      data = data.data;
      const participant = new Participant(data.id, data.role, data.user);
      participants.set(data.id, participant);
      const event = new ParticipantEvent(
          'participantjoined', {participant: participant});
      self.dispatchEvent(event);
    } else if (data.action === 'leave') {
      const participantId = data.data;
      if (!participants.has(participantId)) {
        Logger.warning(
            'Received leave message from MCU for an unknown participant.');
        return;
      }
      const participant = participants.get(participantId);
      participants.delete(participantId);
      participant.dispatchEvent(new EventModule.OwtEvent('left'));
    }
  }

  // eslint-disable-next-line require-jsdoc
  function fireMessageReceived(data) {
    const messageEvent = new EventModule.MessageEvent('messagereceived', {
      message: data.message,
      origin: data.from,
      to: data.to,
    });
    self.dispatchEvent(messageEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function fireStreamAdded(info) {
    const stream = createRemoteStream(info);
    remoteStreams.set(stream.id, stream);
    const streamEvent = new StreamModule.StreamEvent('streamadded', {
      stream: stream,
    });
    self.dispatchEvent(streamEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function fireStreamRemoved(info) {
    if (!remoteStreams.has(info.id)) {
      Logger.warning('Cannot find specific remote stream.');
      return;
    }
    const stream = remoteStreams.get(info.id);
    const streamEvent = new EventModule.OwtEvent('ended');
    remoteStreams.delete(stream.id);
    stream.dispatchEvent(streamEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function fireActiveAudioInputChange(info) {
    if (!remoteStreams.has(info.id)) {
      Logger.warning('Cannot find specific remote stream.');
      return;
    }
    const stream = remoteStreams.get(info.id);
    const streamEvent = new ActiveAudioInputChangeEvent(
        'activeaudioinputchange', {
          activeAudioInputStreamId: info.data.value,
        });
    stream.dispatchEvent(streamEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function fireLayoutChange(info) {
    if (!remoteStreams.has(info.id)) {
      Logger.warning('Cannot find specific remote stream.');
      return;
    }
    const stream = remoteStreams.get(info.id);
    const streamEvent = new LayoutChangeEvent(
        'layoutchange', {
          layout: info.data.value,
        });
    stream.dispatchEvent(streamEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function updateRemoteStream(streamInfo) {
    if (!remoteStreams.has(streamInfo.id)) {
      Logger.warning('Cannot find specific remote stream.');
      return;
    }
    const stream = remoteStreams.get(streamInfo.id);
    stream.settings = StreamUtilsModule.convertToPublicationSettings(streamInfo
        .media);
    stream.extraCapabilities = StreamUtilsModule
      .convertToSubscriptionCapabilities(
        streamInfo.media);
    const streamEvent = new EventModule.OwtEvent('updated');
    stream.dispatchEvent(streamEvent);
  }

  // eslint-disable-next-line require-jsdoc
  function createRemoteStream(streamInfo) {
    if (streamInfo.type === 'mixed') {
      return new RemoteMixedStream(streamInfo);
    } else {
      let audioSourceInfo; let videoSourceInfo;
      if (streamInfo.media.audio) {
        audioSourceInfo = streamInfo.media.audio.source;
      }
      if (streamInfo.media.video) {
        videoSourceInfo = streamInfo.media.video.source;
      }
      const stream = new StreamModule.RemoteStream(streamInfo.id,
          streamInfo.info.owner, undefined, new StreamModule.StreamSourceInfo(
              audioSourceInfo, videoSourceInfo), streamInfo.info.attributes);
      stream.settings = StreamUtilsModule.convertToPublicationSettings(
          streamInfo.media);
      stream.extraCapabilities = StreamUtilsModule
        .convertToSubscriptionCapabilities(
          streamInfo.media);
      return stream;
    }
  }

  // eslint-disable-next-line require-jsdoc
  function sendSignalingMessage(type, message) {
    return signaling.send(type, message);
  }

  // eslint-disable-next-line require-jsdoc
  function createPeerConnectionChannel() {
    // Construct an signaling sender/receiver for ConferencePeerConnection.
    const signalingForChannel = Object.create(EventModule.EventDispatcher);
    signalingForChannel.sendSignalingMessage = sendSignalingMessage;
    const pcc = new ConferencePeerConnectionChannel(
        config, signalingForChannel);
    pcc.addEventListener('id', (messageEvent) => {
      channels.set(messageEvent.message, pcc);
    });
    return pcc;
  }

  // eslint-disable-next-line require-jsdoc
  function clean() {
    participants.clear();
    remoteStreams.clear();
  }

  Object.defineProperty(this, 'info', {
    configurable: false,
    get: () => {
      if (!room) {
        return null;
      }
      return new ConferenceInfo(room.id, Array.from(participants, (x) => x[
          1]), Array.from(remoteStreams, (x) => x[1]), me);
    },
  });

  /**
   * @function join
   * @instance
   * @desc Join a conference.
   * @memberof Owt.Conference.ConferenceClient
   * @returns {Promise<ConferenceInfo, Error>} Return a promise resolved with current conference's information if successfully join the conference. Or return a promise rejected with a newly created Owt.Error if failed to join the conference.
   * @param {string} tokenString Token is issued by conference server(nuve).
   */
  this.join = function(tokenString) {
    return new Promise((resolve, reject) => {
      const token = JSON.parse(Base64.decodeBase64(tokenString));
      const isSecured = (token.secure === true);
      let host = token.host;
      if (typeof host !== 'string') {
        reject(new ConferenceError('Invalid host.'));
        return;
      }
      if (host.indexOf('http') === -1) {
        host = isSecured ? ('https://' + host) : ('http://' + host);
      }
      if (signalingState !== SignalingState.READY) {
        reject(new ConferenceError('connection state invalid'));
        return;
      }

      signalingState = SignalingState.CONNECTING;

      const loginInfo = {
        token: tokenString,
        userAgent: Utils.sysInfo(),
        protocol: protocolVersion,
      };

      signaling.connect(host, isSecured, loginInfo).then((resp) => {
        signalingState = SignalingState.CONNECTED;
        room = resp.room;
        if (room.streams !== undefined) {
          for (const st of room.streams) {
            if (st.type === 'mixed') {
              st.viewport = st.info.label;
            }
            remoteStreams.set(st.id, createRemoteStream(st));
          }
        }
        if (resp.room && resp.room.participants !== undefined) {
          for (const p of resp.room.participants) {
            participants.set(p.id, new Participant(p.id, p.role, p.user));
            if (p.id === resp.id) {
              me = participants.get(p.id);
            }
          }
        }
        resolve(new ConferenceInfo(resp.room.id, Array.from(participants
            .values()), Array.from(remoteStreams.values()), me));
      }, (e) => {
        signalingState = SignalingState.READY;
        reject(new ConferenceError(e));
      });
    });
  };

  /**
   * @function publish
   * @memberof Owt.Conference.ConferenceClient
   * @instance
   * @desc Publish a LocalStream to conference server. Other participants will be able to subscribe this stream when it is successfully published.
   * @param {Owt.Base.LocalStream} stream The stream to be published.
   * @param {Owt.Base.PublishOptions} options Options for publication.
   * @param {string[]} videoCodecs Video codec names for publishing. Valid values are 'VP8', 'VP9' and 'H264'. This parameter only valid when options.video is RTCRtpEncodingParameters. Publishing with RTCRtpEncodingParameters is an experimental feature. This parameter is subject to change.
   * @returns {Promise<Publication, Error>} Returned promise will be resolved with a newly created Publication once specific stream is successfully published, or rejected with a newly created Error if stream is invalid or options cannot be satisfied. Successfully published means PeerConnection is established and server is able to process media data.
   */
  this.publish = function(stream, options, videoCodecs) {
    if (!(stream instanceof StreamModule.LocalStream)) {
      return Promise.reject(new ConferenceError('Invalid stream.'));
    }
    if (publishChannels.has(stream.mediaStream.id)) {
      return Promise.reject(new ConferenceError(
          'Cannot publish a published stream.'));
    }
    const channel = createPeerConnectionChannel();
    return channel.publish(stream, options, videoCodecs);
  };

  /**
   * @function subscribe
   * @memberof Owt.Conference.ConferenceClient
   * @instance
   * @desc Subscribe a RemoteStream from conference server.
   * @param {Owt.Base.RemoteStream} stream The stream to be subscribed.
   * @param {Owt.Conference.SubscribeOptions} options Options for subscription.
   * @returns {Promise<Subscription, Error>} Returned promise will be resolved with a newly created Subscription once specific stream is successfully subscribed, or rejected with a newly created Error if stream is invalid or options cannot be satisfied. Successfully subscribed means PeerConnection is established and server was started to send media data.
   */
  this.subscribe = function(stream, options) {
    if (!(stream instanceof StreamModule.RemoteStream)) {
      return Promise.reject(new ConferenceError('Invalid stream.'));
    }
    const channel = createPeerConnectionChannel();
    return channel.subscribe(stream, options);
  };

  /**
   * @function send
   * @memberof Owt.Conference.ConferenceClient
   * @instance
   * @desc Send a text message to a participant or all participants.
   * @param {string} message Message to be sent.
   * @param {string} participantId Receiver of this message. Message will be sent to all participants if participantId is undefined.
   * @return {Promise<void, Error>} Returned promise will be resolved when conference server received certain message.
   */
  this.send = function(message, participantId) {
    if (participantId === undefined) {
      participantId = 'all';
    }
    return sendSignalingMessage('text', {to: participantId, message: message});
  };

  /**
   * @function leave
   * @memberOf Owt.Conference.ConferenceClient
   * @instance
   * @desc Leave a conference.
   * @return {Promise<void, Error>} Returned promise will be resolved with undefined once the connection is disconnected.
   */
  this.leave = function() {
    return signaling.disconnect().then(() => {
      clean();
      signalingState = SignalingState.READY;
    });
  };
};
