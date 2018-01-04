// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import { EventDispatcher } from '../base/event.js'
import { ConferenceSioSignaling as Signaling } from './signaling.js'
import Logger from '../base/logger.js'
import { Base64} from '../base/base64.js'
import { ConferenceError } from './error.js'
import * as Utils from '../base/utils.js'
import * as StreamModule from '../base/stream.js'
import {Participant} from './participant.js'
import {ConferenceInfo} from './info.js'
import {ConferencePeerConnectionChannel } from './channel.js'
import {RemoteMixedStream} from './mixedstream.js'

const SignalingState = {
  READY: 1,
  CONNECTING: 2,
  CONNECTED: 3
};

const protocolVersion = '1.0';

export const ConferenceClient = function(config, signalingImpl) {
  config=config||{};
  let signalingState = SignalingState.READY;
  const signaling = signalingImpl ? signalingImpl : (new Signaling());
  let myId = null;
  let myParticipantId = null;
  let remoteStreams = new Map();  // Key is stream ID, value is a RemoteStream.
  const participants = new Map();  // Key is participant ID, value is a Participant object.
  const publishChannels = new Map();  // Key is MediaStream's ID, value is pc channel.
  const channels = new Map();  // Key is channel's internal ID, value is channel.

  signaling.onMessage = function(notification, data) {
    if(!channels.has(data.id)){
      Logger.warning('Cannot find a channel for incoming data.');
      return;
    }
    channels.get(data.id).onMessage(notification, data);
  };

  function createRemoteStream(streamInfo) {
    if (streamInfo.type === 'mixed') {
      return new RemoteMixedStream(streamInfo);
    } else {
      return new StreamModule.RemoteStream(streamInfo.id, undefined, undefined,
        new StreamModule
        .StreamSourceInfo('mixed', 'mixed'));
    }
  }

  function sendSignalingMessage(type, message) {
    return signaling.send(type, message);
  };

  function createPeerConnectionChannel() {
    // Construct an signaling sender/receiver for ConferencePeerConnection.
    const signalingForChannel = Object.create(EventDispatcher);
    signalingForChannel.sendSignalingMessage = sendSignalingMessage;
    const pcc = new ConferencePeerConnectionChannel(config.rtcConfiguration,
      signalingForChannel);
    pcc.addEventListener('id', (messageEvent)=>{
      channels.set(messageEvent.message, pcc);
    });
    return pcc;
  }

  this.join = function(tokenString) {
    return new Promise((resolve, reject) => {
      const token = JSON.parse(Base64.decodeBase64(tokenString));
      const isSecured = (token.secure === true);
      let host = token.host;
      let room=null;
      if (typeof host !== 'string') {
        reject(new ConferenceError('Invalid host.'));
      }
      if (host.indexOf('http') === -1) {
        host = isSecured ? ('https://' + host) : ('http://' + host);
      }
      if (signalingState !== SignalingState.READY) {
        reject(new ConferenceError('connection state invalid'));
      }

      signalingState=SignalingState.CONNECTING;

      const loginInfo = {
        token: tokenString,
        userAgent: Utils.sysInfo(),
        protocol: protocolVersion
      };

      signaling.connect(host, isSecured, loginInfo).then((resp) => {
        signalingState = SignalingState.CONNECTED;
        myId = resp.user;
        myParticipantId = resp.id;
        room = resp.room;
        if (room.streams !== undefined) {
          for(const st of room.streams){
            if (st.type === 'mixed') {
              st.viewport = st.info.label;
            }
            remoteStreams.set(st.id,createRemoteStream(st));
          };
        }
        let me;
        if (resp.room && resp.room.participants !== undefined) {
          for (const p of resp.room.participants) {
            participants.set(p.id, new Participant(p.id, p.role, p.user));
            if (p.id === resp.id) {
              me = participants.get(p.id);
            }
          }
        }
        resolve(new ConferenceInfo(resp.id, Array.from(participants.values()), Array
          .from(remoteStreams.values()), me));
      }, (e) => {
        self.state = DISCONNECTED;
        reject(new ConferenceError('Connect to server error.'))
      });
    });
  };

  this.publish = function(stream) {
    if (!(stream instanceof StreamModule.LocalStream)) {
      return Promise.reject(new ConferenceError('Invalid stream.'));
    }
    if (publishChannels.has(stream.mediaStream.id)) {
      return Promise.reject(new ConferenceError(
        'Cannot publish a published stream.'));
    }
    const channel = createPeerConnectionChannel();
    return channel.publish(stream);
  };

  this.subscribe = function(stream, options) {
    if (!(stream instanceof StreamModule.RemoteStream)) {
      return Promise.reject(new ConferenceError('Invalid stream.'));
    }
    const channel = createPeerConnectionChannel();
    return channel.subscribe(stream, options);
  };
};

ConferenceClient.prototype = new EventDispatcher();
