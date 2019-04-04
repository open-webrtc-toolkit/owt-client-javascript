// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// This file doesn't have public APIs.
/* eslint-disable valid-jsdoc */
/* eslint-disable require-jsdoc */
/* global Event, Map, Promise, RTCIceCandidate */

'use strict';

import Logger from '../base/logger.js';
import {EventDispatcher, MessageEvent, OwtEvent} from '../base/event.js';
import {Publication} from '../base/publication.js';
import * as Utils from '../base/utils.js';
import * as ErrorModule from './error.js';
import * as StreamModule from '../base/stream.js';
import * as SdpUtils from '../base/sdputils.js';

/**
 * @class P2PPeerConnectionChannelEvent
 * @desc Event for Stream.
 * @memberOf Owt.P2P
 * @private
 * */
export class P2PPeerConnectionChannelEvent extends Event {
  /* eslint-disable-next-line require-jsdoc */
  constructor(init) {
    super(init);
    this.stream = init.stream;
  }
}

const DataChannelLabel = {
  MESSAGE: 'message',
  FILE: 'file',
};

const SignalingType = {
  DENIED: 'chat-denied',
  CLOSED: 'chat-closed',
  NEGOTIATION_NEEDED: 'chat-negotiation-needed',
  TRACK_SOURCES: 'chat-track-sources',
  STREAM_INFO: 'chat-stream-info',
  SDP: 'chat-signal',
  TRACKS_ADDED: 'chat-tracks-added',
  TRACKS_REMOVED: 'chat-tracks-removed',
  DATA_RECEIVED: 'chat-data-received',
  UA: 'chat-ua',
};

const sysInfo = Utils.sysInfo();

/**
 * @class P2PPeerConnectionChannel
 * @desc A P2PPeerConnectionChannel handles all interactions between this endpoint and a remote endpoint.
 * @memberOf Owt.P2P
 * @private
 */
class P2PPeerConnectionChannel extends EventDispatcher {
  // |signaling| is an object has a method |sendSignalingMessage|.
  /* eslint-disable-next-line require-jsdoc */
  constructor(config, localId, remoteId, signaling) {
    super();
    this._config = config;
    this._localId = localId;
    this._remoteId = remoteId;
    this._signaling = signaling;
    this._pc = null;
    this._publishedStreams = new Map(); // Key is streams published, value is its publication.
    this._pendingStreams = []; // Streams going to be added to PeerConnection.
    this._publishingStreams = []; // Streams have been added to PeerConnection, but does not receive ack from remote side.
    this._pendingUnpublishStreams = []; // Streams going to be removed.
    // Key is MediaStream's ID, value is an object {source:{audio:string, video:string}, attributes: object, stream: RemoteStream, mediaStream: MediaStream}. `stream` and `mediaStream` will be set when `track` event is fired on `RTCPeerConnection`. `mediaStream` will be `null` after `streamadded` event is fired on `P2PClient`. Other propertes will be set upon `STREAM_INFO` event from signaling channel.
    this._remoteStreamInfo = new Map();
    this._remoteStreams = [];
    this._remoteTrackSourceInfo = new Map(); // Key is MediaStreamTrack's ID, value is source info.
    this._publishPromises = new Map(); // Key is MediaStream's ID, value is an object has |resolve| and |reject|.
    this._unpublishPromises = new Map(); // Key is MediaStream's ID, value is an object has |resolve| and |reject|.
    this._publishingStreamTracks = new Map(); // Key is MediaStream's ID, value is an array of the ID of its MediaStreamTracks that haven't been acked.
    this._publishedStreamTracks = new Map(); // Key is MediaStream's ID, value is an array of the ID of its MediaStreamTracks that haven't been removed.
    this._isNegotiationNeeded = false;
    this._remoteSideSupportsRemoveStream = true;
    this._remoteSideSupportsPlanB = true;
    this._remoteSideSupportsUnifiedPlan = true;
    this._remoteIceCandidates = [];
    this._dataChannels = new Map(); // Key is data channel's label, value is a RTCDataChannel.
    this._pendingMessages = [];
    this._dataSeq = 1; // Sequence number for data channel messages.
    this._sendDataPromises = new Map(); // Key is data sequence number, value is an object has |resolve| and |reject|.
    this._addedTrackIds = []; // Tracks that have been added after receiving remote SDP but before connection is established. Draining these messages when ICE connection state is connected.
    this._isCaller = true;
    this._infoSent = false;
    this._disposed = false;
    this._createPeerConnection();
  }

  /**
   * @function publish
   * @desc Publish a stream to the remote endpoint.
   * @private
   */
  publish(stream) {
    if (!(stream instanceof StreamModule.LocalStream)) {
      return Promise.reject(new TypeError('Invalid stream.'));
    }
    if (this._publishedStreams.has(stream)) {
      return Promise.reject(new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_ILLEGAL_ARGUMENT,
          'Duplicated stream.'));
    }
    if (this._areAllTracksEnded(stream.mediaStream)) {
      return Promise.reject(new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
          'All tracks are ended.'));
    }
    return Promise.all([this._sendClosedMsgIfNecessary(),
      this._sendSysInfoIfNecessary(),
      this._sendStreamInfo(stream)]).then(() => {
      return new Promise((resolve, reject) => {
        // Replace |addStream| with PeerConnection.addTrack when all browsers are ready.
        for (const track of stream.mediaStream.getTracks()) {
          this._pc.addTrack(track, stream.mediaStream);
        }
        this._onNegotiationneeded();
        this._publishingStreams.push(stream);
        const trackIds = Array.from(stream.mediaStream.getTracks(),
            (track) => track.id);
        this._publishingStreamTracks.set(stream.mediaStream.id,
            trackIds);
        this._publishPromises.set(stream.mediaStream.id, {
          resolve: resolve,
          reject: reject,
        });
      });
    });
  }

  /**
   * @function send
   * @desc Send a message to the remote endpoint.
   * @private
   */
  send(message) {
    if (!(typeof message === 'string')) {
      return Promise.reject(new TypeError('Invalid message.'));
    }
    const data = {
      id: this._dataSeq++,
      data: message,
    };
    const promise = new Promise((resolve, reject) => {
      this._sendDataPromises.set(data.id, {
        resolve: resolve,
        reject: reject,
      });
    });
    if (!this._dataChannels.has(DataChannelLabel.MESSAGE)) {
      this._createDataChannel(DataChannelLabel.MESSAGE);
    }

    this._sendClosedMsgIfNecessary().catch((err) => {
      Logger.debug('Failed to send closed message.' + err.message);
    });

    this._sendSysInfoIfNecessary().catch((err) => {
      Logger.debug('Failed to send sysInfo.' + err.message);
    });

    const dc = this._dataChannels.get(DataChannelLabel.MESSAGE);
    if (dc.readyState === 'open') {
      this._dataChannels.get(DataChannelLabel.MESSAGE).send(
          JSON.stringify(data));
    } else {
      this._pendingMessages.push(data);
    }
    return promise;
  }

  /**
   * @function stop
   * @desc Stop the connection with remote endpoint.
   * @private
   */
  stop() {
    this._stop(undefined, true);
  }

  /**
   * @function getStats
   * @desc Get stats for a specific MediaStream.
   * @private
   */
  getStats(mediaStream) {
    if (this._pc) {
      if (mediaStream === undefined) {
        return this._pc.getStats();
      } else {
        const tracksStatsReports = [];
        return Promise.all([mediaStream.getTracks().forEach((track) => {
          this._getStats(track, tracksStatsReports);
        })]).then(
            () => {
              return new Promise((resolve, reject) => {
                resolve(tracksStatsReports);
              });
            });
      }
    } else {
      return Promise.reject(new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_INVALID_STATE));
    }
  }

  _getStats(mediaStreamTrack, reportsResult) {
    return this._pc.getStats(mediaStreamTrack).then(
        (statsReport) => {
          reportsResult.push(statsReport);
        });
  }

  /**
   * @function onMessage
   * @desc This method is called by P2PClient when there is new signaling message arrived.
   * @private
   */
  onMessage(message) {
    this._SignalingMesssageHandler(message);
  }

  _sendSdp(sdp) {
    return this._signaling.sendSignalingMessage(
        this._remoteId, SignalingType.SDP, sdp);
  }

  _sendSignalingMessage(type, message) {
    return this._signaling.sendSignalingMessage(this._remoteId, type, message);
  }

  _SignalingMesssageHandler(message) {
    Logger.debug('Channel received message: ' + message);
    switch (message.type) {
      case SignalingType.UA:
        this._handleRemoteCapability(message.data);
        this._sendSysInfoIfNecessary();
        break;
      case SignalingType.TRACK_SOURCES:
        this._trackSourcesHandler(message.data);
        break;
      case SignalingType.STREAM_INFO:
        this._streamInfoHandler(message.data);
        break;
      case SignalingType.SDP:
        this._sdpHandler(message.data);
        break;
      case SignalingType.TRACKS_ADDED:
        this._tracksAddedHandler(message.data);
        break;
      case SignalingType.TRACKS_REMOVED:
        this._tracksRemovedHandler(message.data);
        break;
      case SignalingType.DATA_RECEIVED:
        this._dataReceivedHandler(message.data);
        break;
      case SignalingType.CLOSED:
        this._chatClosedHandler(message.data);
        break;
      default:
        Logger.error('Invalid signaling message received. Type: ' +
            message.type);
    }
  }

  /**
   * @function _tracksAddedHandler
   * @desc Handle track added event from remote side.
   * @private
   */
  _tracksAddedHandler(ids) {
    // Currently, |ids| contains all track IDs of a MediaStream. Following algorithm also handles |ids| is a part of a MediaStream's tracks.
    for (const id of ids) {
      // It could be a problem if there is a track published with different MediaStreams.
      this._publishingStreamTracks.forEach((mediaTrackIds, mediaStreamId) => {
        for (let i = 0; i < mediaTrackIds.length; i++) {
          if (mediaTrackIds[i] === id) {
            // Move this track from publishing tracks to published tracks.
            if (!this._publishedStreamTracks.has(mediaStreamId)) {
              this._publishedStreamTracks.set(mediaStreamId, []);
            }
            this._publishedStreamTracks.get(mediaStreamId).push(
                mediaTrackIds[i]);
            mediaTrackIds.splice(i, 1);
          }
          // Resolving certain publish promise when remote endpoint received all tracks of a MediaStream.
          if (mediaTrackIds.length == 0) {
            if (!this._publishPromises.has(mediaStreamId)) {
              Logger.warning('Cannot find the promise for publishing ' +
                mediaStreamId);
              continue;
            }
            const targetStreamIndex = this._publishingStreams.findIndex(
                (element) => element.mediaStream.id == mediaStreamId);
            const targetStream = this._publishingStreams[targetStreamIndex];
            this._publishingStreams.splice(targetStreamIndex, 1);
            const publication = new Publication(
                id, () => {
                  this._unpublish(targetStream).then(() => {
                    publication.dispatchEvent(new OwtEvent('ended'));
                  }, (err) => {
                  // Use debug mode because this error usually doesn't block stopping a publication.
                    Logger.debug(
                        'Something wrong happened during stopping a '+
                        'publication. ' + err.message);
                  });
                }, () => {
                  if (!targetStream || !targetStream.mediaStream) {
                    return Promise.reject(new ErrorModule.P2PError(
                        ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
                        'Publication is not available.'));
                  }
                  return this.getStats(targetStream.mediaStream);
                });
            this._publishedStreams.set(targetStream, publication);
            this._publishPromises.get(mediaStreamId).resolve(publication);
            this._publishPromises.delete(mediaStreamId);
          }
        }
      });
    }
  }

  /**
   * @function _tracksRemovedHandler
   * @desc Handle track removed event from remote side.
   * @private
   */
  _tracksRemovedHandler(ids) {
    // Currently, |ids| contains all track IDs of a MediaStream. Following algorithm also handles |ids| is a part of a MediaStream's tracks.
    for (const id of ids) {
      // It could be a problem if there is a track published with different MediaStreams.
      this._publishedStreamTracks.forEach((mediaTrackIds, mediaStreamId) => {
        for (let i = 0; i < mediaTrackIds.length; i++) {
          if (mediaTrackIds[i] === id) {
            mediaTrackIds.splice(i, 1);
          }
        }
      });
    }
  }

  /**
   * @function _dataReceivedHandler
   * @desc Handle data received event from remote side.
   * @private
   */
  _dataReceivedHandler(id) {
    if (!this._sendDataPromises.has(id)) {
      Logger.warning('Received unknown data received message. ID: ' + id);
      return;
    } else {
      this._sendDataPromises.get(id).resolve();
    }
  }

  /**
   * @function _sdpHandler
   * @desc Handle SDP received event from remote side.
   * @private
   */
  _sdpHandler(sdp) {
    if (sdp.type === 'offer') {
      this._onOffer(sdp);
    } else if (sdp.type === 'answer') {
      this._onAnswer(sdp);
    } else if (sdp.type === 'candidates') {
      this._onRemoteIceCandidate(sdp);
    }
  }

  /**
   * @function _trackSourcesHandler
   * @desc Received track source information from remote side.
   * @private
   */
  _trackSourcesHandler(data) {
    for (const info of data) {
      this._remoteTrackSourceInfo.set(info.id, info.source);
    }
  }

  /**
   * @function _streamInfoHandler
   * @desc Received stream information from remote side.
   * @private
   */
  _streamInfoHandler(data) {
    if (!data) {
      Logger.warning('Unexpected stream info.');
      return;
    }
    this._remoteStreamInfo.set(data.id, {
      source: data.source,
      attributes: data.attributes,
      stream: null,
      mediaStream: null,
      trackIds: data.tracks, // Track IDs may not match at sender and receiver sides. Keep it for legacy porposes.
    });
  }

  /**
   * @function _chatClosedHandler
   * @desc Received chat closed event from remote side.
   * @private
   */
  _chatClosedHandler(data) {
    this._disposed = true;
    this._stop(data, false);
  }

  _onOffer(sdp) {
    Logger.debug('About to set remote description. Signaling state: ' +
      this._pc.signalingState);
    sdp.sdp = this._setRtpSenderOptions(sdp.sdp, this._config);
    // Firefox only has one codec in answer, which does not truly reflect its
    // decoding capability. So we set codec preference to remote offer, and let
    // Firefox choose its preferred codec.
    // Reference: https://bugzilla.mozilla.org/show_bug.cgi?id=814227.
    if (Utils.isFirefox()) {
      sdp.sdp = this._setCodecOrder(sdp.sdp);
    }
    const sessionDescription = new RTCSessionDescription(sdp);
    this._pc.setRemoteDescription(sessionDescription).then(() => {
      this._createAndSendAnswer();
    }, (error) => {
      Logger.debug('Set remote description failed. Message: ' + error.message);
      this._stop(error, true);
    });
  }

  _onAnswer(sdp) {
    Logger.debug('About to set remote description. Signaling state: ' +
      this._pc.signalingState);
    sdp.sdp = this._setRtpSenderOptions(sdp.sdp, this._config);
    const sessionDescription = new RTCSessionDescription(sdp);
    this._pc.setRemoteDescription(new RTCSessionDescription(
        sessionDescription)).then(() => {
      Logger.debug('Set remote descripiton successfully.');
      this._drainPendingMessages();
    }, (error) => {
      Logger.debug('Set remote description failed. Message: ' + error.message);
      this._stop(error, true);
    });
  }

  _onLocalIceCandidate(event) {
    if (event.candidate) {
      this._sendSdp({
        type: 'candidates',
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex,
      }).catch((e)=>{
        Logger.warning('Failed to send candidate.');
      });
    } else {
      Logger.debug('Empty candidate.');
    }
  }

  _onRemoteTrackAdded(event) {
    Logger.debug('Remote track added.');
    for (const stream of event.streams) {
      if (!this._remoteStreamInfo.has(stream.id)) {
        Logger.warning('Missing stream info.');
        return;
      }
      if (!this._remoteStreamInfo.get(stream.id).stream) {
        this._setStreamToRemoteStreamInfo(stream);
      }
    }
    if (this._pc.iceConnectionState === 'connected' ||
       this._pc.iceConnectionState === 'completed') {
      this._checkIceConnectionStateAndFireEvent();
    } else {
      this._addedTrackIds.concat(event.track.id);
    }
  }

  _onRemoteStreamAdded(event) {
    Logger.debug('Remote stream added.');
    if (!this._remoteStreamInfo.has(event.stream.id)) {
      Logger.warning('Cannot find source info for stream ' + event.stream.id);
      return;
    }
    if (this._pc.iceConnectionState === 'connected' ||
      this._pc.iceConnectionState === 'completed') {
      this._sendSignalingMessage(SignalingType.TRACKS_ADDED,
          this._remoteStreamInfo.get(event.stream.id).trackIds);
    } else {
      this._addedTrackIds = this._addedTrackIds.concat(
          this._remoteStreamInfo.get(event.stream.id).trackIds);
    }
    const audioTrackSource = this._remoteStreamInfo.get(event.stream.id)
        .source.audio;
    const videoTrackSource = this._remoteStreamInfo.get(event.stream.id)
        .source.video;
    const sourceInfo = new StreamModule.StreamSourceInfo(audioTrackSource,
        videoTrackSource);
    if (Utils.isSafari()) {
      if (!sourceInfo.audio) {
        event.stream.getAudioTracks().forEach((track) => {
          event.stream.removeTrack(track);
        });
      }
      if (!sourceInfo.video) {
        event.stream.getVideoTracks().forEach((track) => {
          event.stream.removeTrack(track);
        });
      }
    }
    const attributes = this._remoteStreamInfo.get(event.stream.id).attributes;
    const stream = new StreamModule.RemoteStream(undefined, this._remoteId,
        event.stream, sourceInfo, attributes);
    if (stream) {
      this._remoteStreams.push(stream);
      const streamEvent = new StreamModule.StreamEvent('streamadded', {
        stream: stream,
      });
      this.dispatchEvent(streamEvent);
    }
  }

  _onRemoteStreamRemoved(event) {
    Logger.debug('Remote stream removed.');
    const i = this._remoteStreams.findIndex((s) => {
      return s.mediaStream.id === event.stream.id;
    });
    if (i !== -1) {
      const stream = this._remoteStreams[i];
      this._streamRemoved(stream);
      this._remoteStreams.splice(i, 1);
    }
  }

  _onNegotiationneeded() {
    // This is intented to be executed when onnegotiationneeded event is fired.
    // However, onnegotiationneeded may fire mutiple times when more than one
    // track is added/removed. So we manually execute this function after
    // adding/removing track and creating data channel.
    Logger.debug('On negotiation needed.');

    if (this._pc.signalingState === 'stable') {
      this._doNegotiate();
    } else {
      this._isNegotiationNeeded = true;
    }
  }

  _onRemoteIceCandidate(candidateInfo) {
    const candidate = new RTCIceCandidate({
      candidate: candidateInfo.candidate,
      sdpMid: candidateInfo.sdpMid,
      sdpMLineIndex: candidateInfo.sdpMLineIndex,
    });
    if (this._pc.remoteDescription && this._pc.remoteDescription.sdp !== '') {
      Logger.debug('Add remote ice candidates.');
      this._pc.addIceCandidate(candidate).catch((error) => {
        Logger.warning('Error processing ICE candidate: ' + error);
      });
    } else {
      Logger.debug('Cache remote ice candidates.');
      this._remoteIceCandidates.push(candidate);
    }
  }

  _onSignalingStateChange(event) {
    Logger.debug('Signaling state changed: ' + this._pc.signalingState);
    if (this._pc.signalingState === 'closed') {
      // stopChatLocally(peer, peer.id);
    } else if (this._pc.signalingState === 'stable') {
      this._negotiating = false;
      if (this._isNegotiationNeeded) {
        this._onNegotiationneeded();
      } else {
        this._drainPendingStreams();
        this._drainPendingMessages();
      }
    } else if (this._pc.signalingState === 'have-remote-offer') {
      this._drainPendingRemoteIceCandidates();
    }
  }

  _onIceConnectionStateChange(event) {
    if (event.currentTarget.iceConnectionState === 'closed' ||
        event.currentTarget.iceConnectionState === 'failed') {
      const error = new ErrorModule.P2PError(
          ErrorModule.errors.P2P_WEBRTC_UNKNOWN,
          'ICE connection failed or closed.');
      this._stop(error, true);
    } else if (event.currentTarget.iceConnectionState === 'connected' ||
      event.currentTarget.iceConnectionState === 'completed') {
      this._sendSignalingMessage(SignalingType.TRACKS_ADDED,
          this._addedTrackIds);
      this._addedTrackIds = [];
      this._checkIceConnectionStateAndFireEvent();
    }
  }

  _onDataChannelMessage(event) {
    const message=JSON.parse(event.data);
    Logger.debug('Data channel message received: '+message.data);
    this._sendSignalingMessage(SignalingType.DATA_RECEIVED, message.id);
    const messageEvent = new MessageEvent('messagereceived', {
      message: message.data,
      origin: this._remoteId,
    });
    this.dispatchEvent(messageEvent);
  }

  _onDataChannelOpen(event) {
    Logger.debug('Data Channel is opened.');
    if (event.target.label === DataChannelLabel.MESSAGE) {
      Logger.debug('Data channel for messages is opened.');
      this._drainPendingMessages();
    }
  }

  _onDataChannelClose(event) {
    Logger.debug('Data Channel is closed.');
  }

  _streamRemoved(stream) {
    if (!this._remoteStreamInfo.has(stream.mediaStream.id)) {
      Logger.warning('Cannot find stream info.');
    }
    this._sendSignalingMessage(SignalingType.TRACKS_REMOVED,
        this._remoteStreamInfo.get(stream.mediaStream.id).trackIds);
    const event = new OwtEvent('ended');
    stream.dispatchEvent(event);
  }

  _isUnifiedPlan() {
    if (Utils.isFirefox()) {
      return true;
    }
    const pc = new RTCPeerConnection({
      sdpSemantics: 'unified-plan',
    });
    return (pc.getConfiguration() && pc.getConfiguration().sdpSemantics ===
      'plan-b');
  }

  _createPeerConnection() {
    const pcConfiguration = this._config.rtcConfiguration || {};
    if (Utils.isChrome()) {
      pcConfiguration.sdpSemantics = 'unified-plan';
    }
    this._pc = new RTCPeerConnection(pcConfiguration);
    // Firefox 59 implemented addTransceiver. However, mid in SDP will differ from track's ID in this case. And transceiver's mid is null.
    if (typeof this._pc.addTransceiver === 'function' && Utils.isSafari()) {
      this._pc.addTransceiver('audio');
      this._pc.addTransceiver('video');
    }
    if (!this._isUnifiedPlan()) {
      this._pc.onaddstream = (event) => {
        // TODO: Legacy API, should be removed when all UAs implemented WebRTC 1.0.
        this._onRemoteStreamAdded.apply(this, [event]);
      };
      this._pc.onremovestream = (event) => {
        this._onRemoteStreamRemoved.apply(this, [event]);
      };
    } else {
      this._pc.ontrack = (event) => {
        this._onRemoteTrackAdded.apply(this, [event]);
      };
    }
    this._pc.onicecandidate = (event) => {
      this._onLocalIceCandidate.apply(this, [event]);
    };
    this._pc.onsignalingstatechange = (event) => {
      this._onSignalingStateChange.apply(this, [event]);
    };
    this._pc.ondatachannel = (event) => {
      Logger.debug('On data channel.');
      // Save remote created data channel.
      if (!this._dataChannels.has(event.channel.label)) {
        this._dataChannels.set(event.channel.label, event.channel);
        Logger.debug('Save remote created data channel.');
      }
      this._bindEventsToDataChannel(event.channel);
    };
    this._pc.oniceconnectionstatechange = (event) => {
      this._onIceConnectionStateChange.apply(this, [event]);
    };
    /*
    this._pc.oniceChannelStatechange = function(event) {
      _onIceChannelStateChange(peer, event);
    };
     = function() {
      onNegotiationneeded(peers[peer.id]);
    };

    //DataChannel
    this._pc.ondatachannel = function(event) {
      Logger.debug(myId + ': On data channel');
      // Save remote created data channel.
      if (!peer.dataChannels[event.channel.label]) {
        peer.dataChannels[event.channel.label] = event.channel;
        Logger.debug('Save remote created data channel.');
      }
      bindEventsToDataChannel(event.channel, peer);
    };*/
  }

  _drainPendingStreams() {
    let negotiationNeeded = false;
    Logger.debug('Draining pending streams.');
    if (this._pc && this._pc.signalingState === 'stable') {
      Logger.debug('Peer connection is ready for draining pending streams.');
      for (let i = 0; i < this._pendingStreams.length; i++) {
        const stream = this._pendingStreams[i];
        // OnNegotiationNeeded event will be triggered immediately after adding stream to PeerConnection in Firefox.
        // And OnNegotiationNeeded handler will execute drainPendingStreams. To avoid add the same stream multiple times,
        // shift it from pending stream list before adding it to PeerConnection.
        this._pendingStreams.shift();
        if (!stream.mediaStream) {
          continue;
        }
        for (const track of stream.mediaStream.getTracks()) {
          this._pc.addTrack(track, stream.mediaStream);
          negotiationNeeded = true;
        }
        Logger.debug('Added stream to peer connection.');
        this._publishingStreams.push(stream);
      }
      this._pendingStreams.length = 0;
      for (let j = 0; j < this._pendingUnpublishStreams.length; j++) {
        if (!this._pendingUnpublishStreams[j].mediaStream) {
          continue;
        }
        this._pc.removeStream(this._pendingUnpublishStreams[j].mediaStream);
        negotiationNeeded = true;
        this._unpublishPromises.get(
            this._pendingUnpublishStreams[j].mediaStream.id).resolve();
        this._publishedStreams.delete(this._pendingUnpublishStreams[j]);
        Logger.debug('Remove stream.');
      }
      this._pendingUnpublishStreams.length = 0;
    }
    if (negotiationNeeded) {
      this._onNegotiationneeded();
    }
  }

  _drainPendingRemoteIceCandidates() {
    for (let i = 0; i < this._remoteIceCandidates.length; i++) {
      Logger.debug('Add candidate');
      this._pc.addIceCandidate(this._remoteIceCandidates[i]).catch((error)=>{
        Logger.warning('Error processing ICE candidate: '+error);
      });
    }
    this._remoteIceCandidates.length = 0;
  }

  _drainPendingMessages() {
    Logger.debug('Draining pending messages.');
    if (this._pendingMessages.length == 0) {
      return;
    }
    const dc = this._dataChannels.get(DataChannelLabel.MESSAGE);
    if (dc && dc.readyState === 'open') {
      for (let i = 0; i < this._pendingMessages.length; i++) {
        Logger.debug('Sending message via data channel: '+this._pendingMessages[i]);
        dc.send(JSON.stringify(this._pendingMessages[i]));
      }
      this._pendingMessages.length = 0;
    } else if (this._pc && !dc) {
      this._createDataChannel(DataChannelLabel.MESSAGE);
    }
  }

  _sendStreamInfo(stream) {
    if (!stream || !stream.mediaStream) {
      return new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_ILLEGAL_ARGUMENT);
    }
    const info = [];
    stream.mediaStream.getTracks().map((track) => {
      info.push({
        id: track.id,
        source: stream.source[track.kind],
      });
    });
    return Promise.all([this._sendSignalingMessage(SignalingType.TRACK_SOURCES,
        info),
    this._sendSignalingMessage(SignalingType.STREAM_INFO, {
      id: stream.mediaStream.id,
      attributes: stream.attributes,
      // Track IDs may not match at sender and receiver sides.
      tracks: Array.from(info, (item) => item.id),
      // This is a workaround for Safari. Please use track-sources if possible.
      source: stream.source,
    }),
    ]);
  }


  _sendSysInfoIfNecessary() {
    if (this._infoSent) {
      return Promise.resolve();
    }
    this._infoSent = true;
    return this._sendSignalingMessage(SignalingType.UA, sysInfo);
  }

  _sendClosedMsgIfNecessary() {
    if (this._pc.remoteDescription === null ||
        this._pc.remoteDescription.sdp === '') {
      return this._sendSignalingMessage(SignalingType.CLOSED);
    }
    return Promise.resolve();
  }

  _handleRemoteCapability(ua) {
    if (ua.sdk && ua.sdk && ua.sdk.type === 'JavaScript' && ua.runtime &&
        ua.runtime.name === 'Firefox') {
      this._remoteSideSupportsRemoveStream = false;
      this._remoteSideSupportsPlanB = false;
      this._remoteSideSupportsUnifiedPlan = true;
    } else { // Remote side is iOS/Android/C++ which uses Google's WebRTC stack.
      this._remoteSideSupportsRemoveStream = true;
      this._remoteSideSupportsPlanB = true;
      this._remoteSideSupportsUnifiedPlan = false;
    }
  }

  _doNegotiate() {
    this._createAndSendOffer();
  }

  _setCodecOrder(sdp) {
    if (this._config.audioEncodings) {
      const audioCodecNames = Array.from(this._config.audioEncodings,
          (encodingParameters) => encodingParameters.codec.name);
      sdp = SdpUtils.reorderCodecs(sdp, 'audio', audioCodecNames);
    }
    if (this._config.videoEncodings) {
      const videoCodecNames = Array.from(this._config.videoEncodings,
          (encodingParameters) => encodingParameters.codec.name);
      sdp = SdpUtils.reorderCodecs(sdp, 'video', videoCodecNames);
    }
    return sdp;
  }

  _setMaxBitrate(sdp, options) {
    if (typeof options.audioEncodings === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.audioEncodings);
    }
    if (typeof options.videoEncodings === 'object') {
      sdp = SdpUtils.setMaxBitrate(sdp, options.videoEncodings);
    }
    return sdp;
  }

  _setRtpSenderOptions(sdp, options) {
    sdp = this._setMaxBitrate(sdp, options);
    return sdp;
  }

  _setRtpReceiverOptions(sdp) {
    sdp = this._setCodecOrder(sdp);
    return sdp;
  }

  _createAndSendOffer() {
    if (!this._pc) {
      Logger.error('Peer connection have not been created.');
      return;
    }
    this._isNegotiationNeeded = false;
    this._isCaller = true;
    let localDesc;
    this._pc.createOffer().then((desc) => {
      desc.sdp = this._setRtpReceiverOptions(desc.sdp);
      localDesc = desc;
      if(this._pc.signalingState==='stable'){
        return this._pc.setLocalDescription(desc).then(()=>{
          return this._sendSdp(localDesc);
        });
      }
    }).catch((e) => {
      Logger.error(e.message + ' Please check your codec settings.');
      const error = new ErrorModule.P2PError(ErrorModule.errors.P2P_WEBRTC_SDP,
          e.message);
      this._stop(error, true);
    });
  }

  _createAndSendAnswer() {
    this._drainPendingStreams();
    this._isNegotiationNeeded = false;
    this._isCaller = false;
    let localDesc;
    this._pc.createAnswer().then((desc) => {
      desc.sdp = this._setRtpReceiverOptions(desc.sdp);
      localDesc=desc;
      this._logCurrentAndPendingLocalDescription();
      return this._pc.setLocalDescription(desc);
    }).then(()=>{
      return this._sendSdp(localDesc);
    }).catch((e) => {
      Logger.error(e.message + ' Please check your codec settings.');
      const error = new ErrorModule.P2PError(ErrorModule.errors.P2P_WEBRTC_SDP,
          e.message);
      this._stop(error, true);
    });
  }

  _logCurrentAndPendingLocalDescription(){
    Logger.info('Current description: '+this._pc.currentLocalDescription);
    Logger.info('Pending description: '+this._pc.pendingLocalDescription);
  }

  _getAndDeleteTrackSourceInfo(tracks) {
    if (tracks.length > 0) {
      const trackId = tracks[0].id;
      if (this._remoteTrackSourceInfo.has(trackId)) {
        const sourceInfo = this._remoteTrackSourceInfo.get(trackId);
        this._remoteTrackSourceInfo.delete(trackId);
        return sourceInfo;
      } else {
        Logger.warning('Cannot find source info for ' + trackId);
      }
    }
  }

  _unpublish(stream) {
    if (navigator.mozGetUserMedia || !this._remoteSideSupportsRemoveStream) {
      // Actually unpublish is supported. It is a little bit complex since Firefox implemented WebRTC spec while Chrome implemented an old API.
      Logger.error(
          'Stopping a publication is not supported on Firefox. Please use P2PClient.stop() to stop the connection with remote endpoint.'
      );
      return Promise.reject(new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_UNSUPPORTED_METHOD));
    }
    if (!this._publishedStreams.has(stream)) {
      return Promise.reject(new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_ILLEGAL_ARGUMENT));
    }
    this._pendingUnpublishStreams.push(stream);
    return new Promise((resolve, reject) => {
      this._unpublishPromises.set(stream.mediaStream.id, {
        resolve: resolve,
        reject: reject,
      });
      this._drainPendingStreams();
    });
  }

  // Make sure |_pc| is available before calling this method.
  _createDataChannel(label) {
    if (this._dataChannels.has(label)) {
      Logger.warning('Data channel labeled '+ label+' already exists.');
      return;
    }
    if (!this._pc) {
      Logger.debug('PeerConnection is not available before creating DataChannel.');
      return;
    }
    Logger.debug('Create data channel.');
    const dc = this._pc.createDataChannel(label);
    this._bindEventsToDataChannel(dc);
    this._dataChannels.set(DataChannelLabel.MESSAGE, dc);
    this._onNegotiationneeded();
  }

  _bindEventsToDataChannel(dc) {
    dc.onmessage = (event) => {
      this._onDataChannelMessage.apply(this, [event]);
    };
    dc.onopen = (event) => {
      this._onDataChannelOpen.apply(this, [event]);
    };
    dc.onclose = (event) => {
      this._onDataChannelClose.apply(this, [event]);
    };
    dc.onerror = (event) => {
      Logger.debug('Data Channel Error:', error);
    };
  }

  // Returns all MediaStreams it belongs to.
  _getStreamByTrack(mediaStreamTrack) {
    const streams = [];
    for (const [id, info] of this._remoteStreamInfo) {
      if (!info.stream || !info.stream.mediaStream) {
        continue;
      }
      for (const track of info.stream.mediaStream.getTracks()) {
        if (mediaStreamTrack === track) {
          streams.push(info.stream.mediaStream);
        }
      }
    }
    return streams;
  }

  _areAllTracksEnded(mediaStream) {
    for (const track of mediaStream.getTracks()) {
      if (track.readyState === 'live') {
        return false;
      }
    }
    return true;
  }

  _stop(error, notifyRemote) {
    let promiseError = error;
    if (!promiseError) {
      promiseError = new ErrorModule.P2PError(
          ErrorModule.errors.P2P_CLIENT_UNKNOWN);
    }
    for (const [label, dc] of this._dataChannels) {
      dc.close();
    }
    this._dataChannels.clear();
    if (this._pc && this._pc.iceConnectionState !== 'closed') {
      this._pc.close();
    }
    for (const [id, promise] of this._publishPromises) {
      promise.reject(promiseError);
    }
    this._publishPromises.clear();
    for (const [id, promise] of this._unpublishPromises) {
      promise.reject(promiseError);
    }
    this._unpublishPromises.clear();
    for (const [id, promise] of this._sendDataPromises) {
      promise.reject(promiseError);
    }
    this._sendDataPromises.clear();
    // Fire ended event if publication or remote stream exists.
    this._publishedStreams.forEach((publication) => {
      publication.dispatchEvent(new OwtEvent('ended'));
    });
    this._publishedStreams.clear();
    this._remoteStreams.forEach((stream) => {
      stream.dispatchEvent(new OwtEvent('ended'));
    });
    this._remoteStreams = [];
    if (!this._disposed) {
      if (notifyRemote) {
        let sendError;
        if (error) {
          sendError = JSON.parse(JSON.stringify(error));
          // Avoid to leak detailed error to remote side.
          sendError.message = 'Error happened at remote side.';
        }
        this._sendSignalingMessage(SignalingType.CLOSED, sendError).catch(
            (err) => {
              Logger.debug('Failed to send close.' + err.message);
            });
      }
      this.dispatchEvent(new Event('ended'));
    }
  }

  _setStreamToRemoteStreamInfo(mediaStream) {
    const info = this._remoteStreamInfo.get(mediaStream.id);
    const attributes = info.attributes;
    const sourceInfo = new StreamModule.StreamSourceInfo(this._remoteStreamInfo
        .get(mediaStream.id).source.audio, this._remoteStreamInfo.get(
        mediaStream.id)
        .source.video);
    info.stream = new StreamModule.RemoteStream(
        undefined, this._remoteId, mediaStream,
        sourceInfo, attributes);
    info.mediaStream = mediaStream;
    const stream = info.stream;
    if (stream) {
      this._remoteStreams.push(stream);
    } else {
      Logger.warning('Failed to create RemoteStream.');
    }
  }

  _checkIceConnectionStateAndFireEvent() {
    if (this._pc.iceConnectionState === 'connected' ||
        this._pc.iceConnectionState === 'completed') {
      for (const [id, info] of this._remoteStreamInfo) {
        if (info.mediaStream) {
          const streamEvent = new StreamModule.StreamEvent('streamadded', {
            stream: info.stream,
          });
          if (this._isUnifiedPlan()) {
            for (const track of info.mediaStream.getTracks()) {
              track.addEventListener('ended', (event) => {
                const mediaStreams = this._getStreamByTrack(event.target);
                for (const mediaStream of mediaStreams) {
                  if (this._areAllTracksEnded(mediaStream)) {
                    this._onRemoteStreamRemoved(mediaStream);
                  }
                }
              });
            }
          }
          this._sendSignalingMessage(SignalingType.TRACKS_ADDED, info.trackIds);
          this._remoteStreamInfo.get(info.mediaStream.id).mediaStream = null;
          this.dispatchEvent(streamEvent);
        }
      }
    }
  }
}

export default P2PPeerConnectionChannel;
