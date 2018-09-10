// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';
import Logger from '../base/logger.js';
import {EventDispatcher, IcsEvent} from '../base/event.js';
import * as Utils from '../base/utils.js';
import * as ErrorModule from './error.js';
import P2PPeerConnectionChannel from './peerconnection-channel.js';
import * as StreamModule from '../base/stream.js';

const ConnectionState = {
  READY: 1,
  CONNECTING: 2,
  CONNECTED: 3
};

const pcDisconnectTimeout = 15000; // Close peerconnection after disconnect 15s.let isConnectedToSignalingChannel = false;
const offerOptions = {
  'offerToReceiveAudio': true,
  'offerToReceiveVideo': true
};
const sysInfo = Utils.sysInfo();
const supportsPlanB = navigator.mozGetUserMedia ? false : true;
const supportsUnifiedPlan = navigator.mozGetUserMedia ? true : false;
/**
 * @function isArray
 * @desc Test if an object is an array.
 * @return {boolean} DESCRIPTION
 * @private
 */
function isArray(obj) {
  return (Object.prototype.toString.call(obj) === '[object Array]');
}
/*
 * Return negative value if id1<id2, positive value if id1>id2
 */
var compareID = function(id1, id2) {
  return id1.localeCompare(id2);
};
// If targetId is peerId, then return targetId.
var getPeerId = function(targetId) {
  return targetId;
};
var changeNegotiationState = function(peer, state) {
  peer.negotiationState = state;
};
// Do stop chat locally.
var stopChatLocally = function(peer, originatorId) {
  if (peer.state === PeerState.CONNECTED || peer.state === PeerState.CONNECTING) {
    if (peer.sendDataChannel) {
      peer.sendDataChannel.close();
    }
    if (peer.receiveDataChannel) {
      peer.receiveDataChannel.close();
    }
    if (peer.connection && peer.connection.iceConnectionState !== 'closed') {
      peer.connection.close();
    }
    if (peer.state !== PeerState.READY) {
      peer.state = PeerState.READY;
      that.dispatchEvent(new Woogeen.ChatEvent({
        type: 'chat-stopped',
        peerId: peer.id,
        senderId: originatorId
      }));
    }
    // Unbind events for the pc, so the old pc will not impact new peerconnections created for the same target later.
    unbindEvetsToPeerConnection(peer.connection);
  }
};

/**
 * @class P2PClientConfiguration
 * @classDesc Configuration for P2PClient.
 * @memberOf Ics.P2P
 * @hideconstructor
 */
const P2PClientConfiguration = function() {
  /**
   * @member {?Array<Ics.Base.AudioEncodingParameters>} audioEncoding
   * @instance
   * @desc Encoding parameters for publishing audio tracks.
   * @memberof Ics.P2P.P2PClientConfiguration
   */
  this.audioEncoding = undefined;
  /**
   * @member {?Array<Ics.Base.VideoEncodingParameters>} videoEncoding
   * @instance
   * @desc Encoding parameters for publishing video tracks.
   * @memberof Ics.P2P.P2PClientConfiguration
   */
  this.videoEncoding = undefined;
  /**
   * @member {?RTCConfiguration} rtcConfiguration
   * @instance
   * @memberof Ics.P2P.P2PClientConfiguration
   * @desc It will be used for creating PeerConnection.
   * @see {@link https://www.w3.org/TR/webrtc/#rtcconfiguration-dictionary|RTCConfiguration Dictionary of WebRTC 1.0}.
   * @example
   * // Following object can be set to p2pClientConfiguration.rtcConfiguration.
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
};

/**
 * @class P2PClient
 * @classDesc The P2PClient handles PeerConnections between different clients.
 * Events:
 *
 * | Event Name            | Argument Type    | Fired when       |
 * | --------------------- | ---------------- | ---------------- |
 * | streamadded           | StreamEvent      | A new stream is sent from remote endpoint. |
 * | messagereceived       | MessageEvent     | A new message is received. |
 * | serverdisconnected    | IcsEvent         | Disconnected from signaling server. |
 *
 * @memberof Ics.P2P
 * @extends Ics.Base.EventDispatcher
 * @constructor
 * @param {?Ics.P2P.P2PClientConfiguration } config Configuration for P2PClient.
 */
const P2PClient = function(configuration, signalingChannel) {
  Object.setPrototypeOf(this, new EventDispatcher());
  const config = configuration;
  const signaling = signalingChannel;
  const channels = new Map(); // Map of PeerConnectionChannels.
  const self=this;
  let state = ConnectionState.READY;
  let myId;

  signaling.onMessage = function(origin, message) {
    Logger.debug('Received signaling message from ' + origin + ': ' + message);
    const data = JSON.parse(message);
    if (data.type === 'chat-closed' && !channels.has(origin)) {
      return;
    }
    if (self.allowedRemoteIds.indexOf(origin) >= 0) {
      getOrCreateChannel(origin).onMessage(data);
    } else if (data.type !== 'chat-denied') {
      sendSignalingMessage(origin, 'chat-denied');
    }
  };

  signaling.onServerDisconnected = function() {
    state = ConnectionState.READY;
    self.dispatchEvent(new IcsEvent('serverdisconnected'));
  };

  /**
   * @member {array} allowedRemoteIds
   * @memberof Ics.P2P.P2PClient
   * @instance
   * @desc Only allowed remote endpoint IDs are able to publish stream or send message to current endpoint. Removing an ID from allowedRemoteIds does stop existing connection with certain endpoint. Please call stop to stop the PeerConnection.
   */
  this.allowedRemoteIds=[];

  /**
   * @function connect
   * @instance
   * @desc Connect to signaling server. Since signaling can be customized, this method does not define how a token looks like. SDK passes token to signaling channel without changes.
   * @memberof Ics.P2P.P2PClient
   * @returns {Promise<object, Error>} It returns a promise resolved with an object returned by signaling channel once signaling channel reports connection has been established.
   */
  this.connect = function(token) {
    if (state === ConnectionState.READY) {
      state = ConnectionState.CONNECTING;
    } else {
      Logger.warning('Invalid connection state: ' + state);
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE));
    }
    return new Promise((resolve, reject) => {
      signaling.connect(token).then((id) => {
        myId = id;
        state = ConnectionState.CONNECTED;
        resolve(myId);
      }, (errCode) => {
        reject(new ErrorModule.P2PError(ErrorModule.getErrorByCode(
          errCode)));
      });
    });
  };

  /**
   * @function disconnect
   * @instance
   * @desc Disconnect from the signaling channel. It stops all existing sessions with remote endpoints.
   * @memberof Ics.P2P.P2PClient
   * @returns {Promise<undefined, Error>}
   */
  this.disconnect = function() {
    if (state == ConnectionState.READY) {
      return;
    }
    channels.forEach((channel)=>{
      channel.stop();
    });
    channels.clear();
    signaling.disconnect();
  };

  /**
   * @function publish
   * @instance
   * @desc Publish a stream to a remote endpoint.
   * @memberof Ics.P2P.P2PClient
   * @param {string} remoteId Remote endpoint's ID.
   * @param {LocalStream} stream A LocalStream to be published.
   * @returns {Promise<Publication, Error>} A promised resolved when remote side received the certain stream. However, remote endpoint may not display this stream, or ignore it.
   */
  this.publish = function(remoteId, stream) {
    if (state !== ConnectionState.CONNECTED) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
        'P2P Client is not connected to signaling channel.'));
    }
    if (this.allowedRemoteIds.indexOf(remoteId) < 0) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_NOT_ALLOWED));
    }
    return Promise.resolve(getOrCreateChannel(remoteId).publish(stream));
  };

  /**
   * @function send
   * @instance
   * @desc Send a message to remote endpoint.
   * @memberof Ics.P2P.P2PClient
   * @param {string} remoteId Remote endpoint's ID.
   * @param {string} message Message to be sent. It should be a string.
   * @returns {Promise<undefined, Error>} It returns a promise resolved when remote endpoint received certain message.
   */
  this.send=function(remoteId, message){
    if (state !== ConnectionState.CONNECTED) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
        'P2P Client is not connected to signaling channel.'));
    }
    if (this.allowedRemoteIds.indexOf(remoteId) < 0) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_NOT_ALLOWED));
    }
    return Promise.resolve(getOrCreateChannel(remoteId).send(message));
  };

  /**
   * @function stop
   * @instance
   * @desc Clean all resources associated with given remote endpoint. It may include RTCPeerConnection, RTCRtpTransceiver and RTCDataChannel. It still possible to publish a stream, or send a message to given remote endpoint after stop.
   * @memberof Ics.P2P.P2PClient
   * @param {string} remoteId Remote endpoint's ID.
   * @returns {undefined}
   */
  this.stop = function(remoteId) {
    if (!channels.has(remoteId)) {
      Logger.warning(
        'No PeerConnection between current endpoint and specific remote endpoint.'
      );
      return;
    }
    channels.get(remoteId).stop();
    channels.delete(remoteId);
  };

  /**
   * @function getStats
   * @instance
   * @desc Get stats of underlying PeerConnection.
   * @memberof Ics.P2P.P2PClient
   * @param {string} remoteId Remote endpoint's ID.
   * @returns {Promise<RTCStatsReport, Error>} It returns a promise resolved with an RTCStatsReport or reject with an Error if there is no connection with specific user.
   */
  this.getStats = function(remoteId){
    if(!channels.has(remoteId)){
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,'No PeerConnection between current endpoint and specific remote endpoint.'));
    }
    return channels.get(remoteId).getStats();
  }

  const sendSignalingMessage = function(remoteId, type, message) {
    const msg = {
      type: type
    };
    if (message) {
      msg.data = message;
    }
    return signaling.send(remoteId, JSON.stringify(msg)).catch(e => {
      if (typeof e === 'number') {
        throw ErrorModule.getErrorByCode(e);
      }
    });
  };

  const getOrCreateChannel = function(remoteId) {
    if (!channels.has(remoteId)) {
      // Construct an signaling sender/receiver for P2PPeerConnection.
      const signalingForChannel = Object.create(EventDispatcher);
      signalingForChannel.sendSignalingMessage = sendSignalingMessage;
      const pcc = new P2PPeerConnectionChannel(config, myId, remoteId,
        signalingForChannel);
      pcc.addEventListener('streamadded', (streamEvent)=>{
        self.dispatchEvent(streamEvent);
      });
      pcc.addEventListener('messagereceived', (messageEvent)=>{
        self.dispatchEvent(messageEvent);
      });
      pcc.addEventListener('ended', ()=>{
        channels.delete(remoteId);
      })
      channels.set(remoteId, pcc);
    }
    return channels.get(remoteId);
  };
};

export default P2PClient;
