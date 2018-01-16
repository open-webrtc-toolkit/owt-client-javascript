// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import Logger from '../base/logger.js';
import {EventDispatcher, MessageEvent, IcsEvent} from '../base/event.js';
import {Publication} from '../base/publication.js';
import * as Utils from '../base/utils.js';
import * as ErrorModule from './error.js';
import * as StreamModule from '../base/stream.js';

/*
  Event for Stream.
*/
export class P2PPeerConnectionChannelEvent extends Event {
  constructor(init) {
    super(init);
    this.stream = init.stream;
  }
}

const ChannelState = {
  READY: 1, // Ready to chat.
  OFFERED: 2, // Sent invitation to remote user.
  PENDING: 3, // Received an invitation.
  MATCHED: 4, // Both sides agreed to establish a WebRTC connection.
  CONNECTING: 5, // Exchange SDP and prepare for video chat.
  CONNECTED: 6, // Chat.
};

const NegotiationState = {
  READY: 1,
  REQUESTED: 2,
  ACCEPTED: 3,
  NEGOTIATING: 4
};
const DataChannelLabel = {
  MESSAGE: 'message',
  FILE: 'file'
};

const SignalingType = {
  INVITATION: 'chat-invitation',
  ACCEPTANCE:'chat-accepted',
  DENIED: 'chat-denied',
  CLOSED: 'chat-closed',
  NEGOTIATION_NEEDED:'chat-negotiation-needed',
  TRACK_SOURCES: 'chat-track-sources',
  SDP: 'chat-signal',
  TRACKS_ADDED: 'chat-tracks-added',
  TRACKS_REMOVED: 'chat-tracks-removed',
  DATA_RECEIVED: 'chat-data-received'
}

const offerOptions = {
  'offerToReceiveAudio': true,
  'offerToReceiveVideo': true
};

const sysInfo = Utils.sysInfo();

class P2PPeerConnectionChannel extends EventDispatcher {
  // |signaling| is an object has a method |sendSignalingMessage|.
  constructor(config, localId, remoteId, signaling) {
    super();
    this._config = config;
    this._localId = localId;
    this._remoteId = remoteId;
    this._signaling = signaling;
    this._pc = null;
    this._publishedStreams = []; // Streams published.
    this._pendingStreams = []; // Streams going to be published.
    this._pendingUnpublishStreams = [];  // Streams going to be removed.
    this._remoteStreams = [];
    this._remoteTrackSourceInfo = new Map(); // Key is MediaStreamTrack's ID, value is source info.
    this._publishPromises = new Map(); // Key is MediaStream's ID, value is an object has |resolve| and |reject|.
    this._unpublishPromises = new Map(); // Key is MediaStream's ID, value is an object has |resolve| and |reject|.
    this._publishingStreamTracks = new Map();  // Key is MediaStream's ID, value is an array of the ID of its MediaStreamTracks that haven't been acked.
    this._publishedStreamTracks = new Map();  // Key is MediaStream's ID, value is an array of the ID of its MediaStreamTracks that haven't been removed.
    this._remoteStreamTracks = new Map();  // Key is MediaStream's ID, value is an array of the ID of its MediaStreamTracks.
    this._isCaller = false;
    this._negotiationState = NegotiationState.READY;
    this._isNegotiationNeeded = false;
    this._channelState=ChannelState.READY;
    this._remoteSideSupportsRemoveStream = true;
    this._remoteSideSupportsPlanB = true;
    this._remoteSideSupportsUnifiedPlan = true;
    this._remoteIceCandidates = [];
    this._dataChannels = new Map();  // Key is data channel's label, value is a RTCDataChannel.
    this._pendingMessages = [];
    this._dataSeq = 1;  // Sequence number for data channel messages.
    this._sendDataPromises = new Map();  // Key is data sequence number, value is an object has |resolve| and |reject|.
  }

  publish(stream) {
    if (this._publishedStreams.find((s) => {
        return s === stream;
      })) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_ILLEGAL_ARGUMENT,
        'Duplicated stream.'));
    }
    if (this._channelState === ChannelState.READY) {
      this._invite();
    }
    // Replace |addStream| with PeerConnection.addTrack when all browsers are ready.
    //this._pc.addStream(stream.mediaStream);
    this._pendingStreams.push(stream);
    const trackIds = Array.from(stream.mediaStream.getTracks(), track => track.id);
    this._publishingStreamTracks.set(stream.mediaStream.id, trackIds);
    return new Promise((resolve, reject) => {
      this._publishPromises.set(stream.mediaStream.id, {
        resolve: resolve,
        reject: reject
      });
      this._drainPendingStreams();
    });
  }

  send(message) {
    const data = {
      id: this._dataSeq,
      data: message
    };
    const promise = new Promise((resolve, reject) => {
      this._sendDataPromises.set(data.id, {
        resolve: resolve,
        reject: reject
      });
    });
    if (this._channelState === ChannelState.READY) {
      this._invite();
      this._pendingMessages.push(data);
      return promise;
    }
    if (!this._dataChannels.has(DataChannelLabel.MESSAGE)) {
      this._createDataChannel(DataChannelLabel.MESSAGE);
    }
    const dc = this._dataChannels.get(DataChannelLabel.MESSAGE);
    if (dc.readyState === 'open') {
      this._dataChannels.get(DataChannelLabel.MESSAGE).send(JSON.stringify(data));
    } else {
      this._pendingMessages.push(data);
    }
    return promise;
  }

  stop() {
    for (const [label, dc] of this._dataChannels) {
      dc.close();
    }
    this._dataChannels.clear();
    if (this._pc && this._pc.iceConnectionState !==
      'closed') {
      this._pc.close();
    }
    this._pc = null;
    for (const [id, promise] of this._publishPromises) {
      promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
        'PeerConnection is closed.'))
    }
    this._publishPromises.clear();
    for (const [id, promise] of this._unpublishPromises) {
      promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
        'PeerConnection is closed.'))
    }
    this._unpublishPromises.clear();
    for (const [id, promise] of this._sendDataPromises) {
      promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE,
        'PeerConnection is closed.'))
    }
    if (this._state !== ChannelState.READY) {
      this._state = ChannelState.READY;
      this.dispatchEvent(new Event('p2pclosed'));
    }
  }

  getStats() {
    if (this._pc) {
      return this._pc.getStats();
    } else {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_INVALID_STATE));
    }
  }

  // This method is called by P2PClient when there is new signaling message arrived.
  onMessage(message){
    this._SignalingMesssageHandler(message);
  }

  _sendSdp(sdp) {
    this._signaling.sendSignalingMessage(this._remoteId, SignalingType.SDP,
      sdp);
  }

  _sendSignalingMessage(type, message) {
    this._signaling.sendSignalingMessage(this._remoteId, type, message);
  }

  _invite() {
    if (this._channelState === ChannelState.READY) {
      this._channelState = ChannelState.OFFERED;
      this._sendSignalingMessage(SignalingType.CLOSED);
      this._sendSignalingMessage(SignalingType.INVITATION, {
        ua: sysInfo
      });
    } else {
      Logger.debug('Cannot send invitation during this state: ' + this._channelState);
    }
    this._isCaller = true;
  }

  _accept() {
    if (this._channelState === ChannelState.PENDING) {
      this._sendSignalingMessage(SignalingType.ACCEPTANCE, {
        ua: sysInfo
      });
      this._channelState = ChannelState.MATCHED;
    } else {
      Logger.debug('Cannot send acceptance during this state: ' + this._channelState);
    }
  }

  _SignalingMesssageHandler(message) {
    Logger.debug('Channel received message: ' + message);
    switch (message.type) {
      case SignalingType.INVITATION:
        this._chatInvitationHandler(message.data.ua);
        break;
      case SignalingType.DENIED:
        this._chatDeniedHandler();
        break;
      case SignalingType.ACCEPTANCE:
        this._chatAcceptedHandler(message.data.ua);
        break;
      case SignalingType.NEGOTIATION_NEEDED:
        this._negotiationNeededHandler();
        break;
      case SignalingType.TRACK_SOURCES:
        this._trackSourcesHandler(message.data);
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
        this._chatClosedHandler();
        break;
      default:
        Logger.error('Invalid signaling message received. Type: ' + message.type);
    }
  }

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
            this._publishPromises.get(mediaStreamId).resolve(new Publication(
              id, () => {
                return this._unpublish(this._publishedStreams.find(
                  element =>
                  element.mediaStream.id == mediaStreamId));
              }));
            this._publishPromises.delete(mediaStreamId);
          }
        }
      });
    }
  }

  _tracksRemovedHandler(ids) {
    // Currently, |ids| contains all track IDs of a MediaStream. Following algorithm also handles |ids| is a part of a MediaStream's tracks.
    for (const id of ids) {
      // It could be a problem if there is a track published with different MediaStreams.
      this._publishedStreamTracks.forEach((mediaTrackIds, mediaStreamId) => {
        for (let i = 0; i < mediaTrackIds.length; i++) {
          if (mediaTrackIds[i] === id) {
            mediaTrackIds.splice(i, 1);
          }
          // Resolving certain publish promise when remote endpoint received all tracks of a MediaStream.
          if (mediaTrackIds.length == 0) {
            if (!this._unpublishPromises.has(mediaStreamId)) {
              Logger.warning('Cannot find the promise for removing ' +
                mediaStreamId);
              continue;
            }
            this._unpublishPromises.get(mediaStreamId).resolve();
            this._unpublishPromises.delete(mediaStreamId);
          }
        }
      });
    }
  }

  _dataReceivedHandler(id) {
    if (!this._sendDataPromises.has(id)) {
      Logger.warning('Received unknown data received message. ID: ' + id);
      return;
    } else {
      this._sendDataPromises.get(id).resolve();
    }
  }

  _chatInvitationHandler(ua) {
    Logger.debug('Received chat invitation.');
    this._channelState = ChannelState.PENDING;
    // Rejection of an invitation will be performed in P2PClient since no PeerConnectionChannel will be constructed.
    this._accept();
  }

  _chatAcceptedHandler(ua) {
    Logger.debug('Received chat accepted.');
    this._handleRemoteCapability(ua);
    this._channelState = ChannelState.CONNECTING;
    this._createPeerConnection();
  }

  _negotiationNeededHandler() {
    Logger.debug('Remote side needs negotiation.');
    if (this._isCaller && this._pc.signalingState === 'stable' &&
      this._negotiationState ===
      NegotiationState.READY) {
      this._doNegotiate();
    } else {
      this._isNegotiationNeeded = true;
      Logger.warning(
        'Should not receive negotiation needed request because user is callee.'
      );
    }
  }

  _sdpHandler(sdp) {
    if (sdp.type === 'offer') {
      this._onOffer(sdp);
    } else if (sdp.type === 'answer') {
      this._onAnswer(sdp);
    } else if (sdp.type === 'candidates') {
      this._onRemoteIceCandidate(sdp);
    }
  }

  _trackSourcesHandler(data) {
    for (const info of data) {
      this._remoteTrackSourceInfo.set(info.id, info.source);
    }
  }

  _chatClosedHandler() {
    this.stop();
  }

  _chatDeniedHandler() {
    this.stop();
  }

  _onOffer(sdp) {
    switch (this._channelState) {
      case ChannelState.OFFERED:
      case ChannelState.MATCHED:
        this._channelState = ChannelState.CONNECTING;
        this._createPeerConnection(); /*jshint ignore:line*/ //Expected a break before case.
      case ChannelState.CONNECTING:
      case ChannelState.CONNECTED:
        Logger.debug('About to set remote description. Signaling state: ' +
          this._pc.signalingState);
        // event.message.sdp = setRtpSenderOptions(event.message.sdp);
        const sessionDescription = new RTCSessionDescription(sdp);
        this._pc.setRemoteDescription(sessionDescription).then(() => {
          this._createAndSendAnswer();
          //this._drainIceCandidates();
        }, function(errorMessage) {
          Logger.debug('Set remote description failed. Message: ' + JSON.stringify(
            errorMessage));
        });
        break;
      default:
        Logger.debug('Unexpected peer state: ' + this._channelState);
    }
  }

  _onAnswer(sdp) {
    if (this._channelState === ChannelState.CONNECTING || this._channelState ===
      ChannelState.CONNECTED) {
      Logger.debug('About to set remote description. Signaling state: ' +
        this._pc.signalingState);
      //event.message.sdp = setRtpSenderOptions(event.message.sdp);
      const sessionDescription = new RTCSessionDescription(sdp);
      this._pc.setRemoteDescription(new RTCSessionDescription(
        sessionDescription)).then(() => {
        Logger.debug('Set remote descripiton successfully.');
        //this._drainIceCandidates(peer);
        this._drainPendingMessages();
      }, function(errorMessage) {
        Logger.debug('Set remote description failed. Message: ' +
          errorMessage);
      });
    } else {
      Logger.warning('Received answer at invalid state. Current state: ' + this
        ._channelState);
    }
  }

  _onLocalIceCandidate(event) {
    if (event.candidate) {
      this._sendSdp({
        type: 'candidates',
        candidate: event.candidate.candidate,
        sdpMid: event.candidate.sdpMid,
        sdpMLineIndex: event.candidate.sdpMLineIndex
      });
    } else {
      Logger.debug('Empty candidate.');
    }
  }

  _onRemoteStreamAdded(event) {
    Logger.debug('Remote stream added.');
    this._remoteStreamTracks.set(event.stream.id, []);
    // Ack track added when onaddstream/onaddtrack is fired for a specific track. It's better to check the state of PeerConnection before acknowledge since media data will not flow if ICE fails.
    const tracksInfo=[];
    event.stream.getTracks().forEach((track)=>{
      tracksInfo.push(track.id);
      this._remoteStreamTracks.get(event.stream.id).push(track.id);
    });
    this._sendSignalingMessage(SignalingType.TRACKS_ADDED, tracksInfo);
    const sourceInfo = new StreamModule.StreamSourceInfo(this._getAndDeleteTrackSourceInfo(
      event.stream.getAudioTracks()), this._getAndDeleteTrackSourceInfo(event.stream.getVideoTracks()));
    const stream = new StreamModule.RemoteStream(undefined, this._remoteId, event.stream,
      sourceInfo);
    if (stream) {
      this._remoteStreams.push(stream);
      const streamEvent = new StreamModule.StreamEvent('streamadded', {
        stream: stream
      });
      this.dispatchEvent(streamEvent);
    }
  }

  _onRemoteStreamRemoved(event) {
    Logger.debug('Remote stream removed.');
    if (!this._remoteStreamTracks.has(event.stream.id)) {
      Logger.warning('Cannot find stream info when it is being removed.');
      return;
    }
    const trackIds = [];
    this._remoteStreamTracks.get(event.stream.id).forEach((trackId) => {
      trackIds.push(trackId);
    });
    this._sendSignalingMessage(SignalingType.TRACKS_REMOVED, trackIds);
    this._remoteStreamTracks.delete(event.stream.id);
    const i=this._remoteStreams.findIndex((s)=>{
      return s.mediaStream.id===event.stream.id;
    });
    if (i !== -1) {
      const stream = this._remoteStreams[i];
      const event = new IcsEvent('ended');
      stream.dispatchEvent(event);
      this._remoteStreams.splice(i, 1);
    }
  }

  _onNegotiationneeded() {
    Logger.debug('On negotiation needed.');
    if (this._isCaller && this._pc.signalingState === 'stable' && this._negotiationState ===
      NegotiationState.READY) {
      this._doNegotiate();
    } else if (!this._isCaller) {
      this._sendSignalingMessage(SignalingType.NEGOTIATION_NEEDED);
    } else {
      this._isNegotiationNeeded = true;
    }
  }

  _onRemoteIceCandidate(candidateInfo) {
    if (this._channelState === ChannelState.OFFERED || this._channelState ===
      ChannelState.CONNECTING || this._channelState === ChannelState.CONNECTED) {
      const candidate = new RTCIceCandidate({
        candidate: candidateInfo.candidate,
        sdpMid: candidateInfo.sdpMid,
        sdpMLineIndex: candidateInfo.sdpMLineIndex
      });
      if (this._pc) {
        Logger.debug('Add remote ice candidates.');
        this._pc.addIceCandidate(candidate).catch(error=>{
          Logger.warning('Error processing ICE candidate: '+error);
        });
      } else {
        Logger.debug('Cache remote ice candidates.');
        this._remoteIceCandidates.push(candidate);
      }
    }
  };

  _onSignalingStateChange(event) {
    Logger.debug('Signaling state changed: ' + this._pc.signalingState);
    if (this._pc.signalingState === 'closed') {
      //stopChatLocally(peer, peer.id);
    } else if (this._pc.signalingState === 'stable') {
      this._negotiationState = NegotiationState.READY;
      if (this._isCaller && this._isNegotiationNeeded) {
        this._doNegotiate();
      } else {
        this._drainPendingStreams();
        this._drainPendingMessages();
      }
    }
  };

  _onDataChannelMessage(event) {
    const message=JSON.parse(event.data);
    Logger.debug('Data channel message received: '+message.data);
    this._sendSignalingMessage(SignalingType.DATA_RECEIVED, message.id);
    const messageEvent = new MessageEvent('messagereceived', {
      message: message.data,
      origin: this._remoteId
    });
    this.dispatchEvent(messageEvent);
  };

  _onDataChannelOpen(event) {
    Logger.debug("Data Channel is opened.");
    if (event.target.label === DataChannelLabel.MESSAGE) {
      Logger.debug('Data channel for messages is opened.');
      this._drainPendingMessages();
    }
  };

  _onDataChannelClose(event) {
    Logger.debug('Data Channel for ' + peerId + ' is closed.');
  };

  _createPeerConnection(){
    this._pc = new RTCPeerConnection(this._config);
    if (typeof this._pc.addTransceiver === 'function') {
      this._pc.addTransceiver('audio');
      this._pc.addTransceiver('video');
    }
    this._pc.onaddstream = (event) => {
      this._onRemoteStreamAdded.apply(this, [event]);
    };
    this._pc.onremovestream = (event) => {
      this._onRemoteStreamRemoved.apply(this, [event]);
    };
    this._pc.onnegotiationneeded = (event)=>{
      this._onNegotiationneeded.apply(this, [event]);
    };
    this._pc.onicecandidate = (event) => {
      this._onLocalIceCandidate.apply(this, [event]);
    };
    this._pc.onsignalingstatechange = (event) => {
      this._onSignalingStateChange.apply(this, [event])
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
    this._drainPendingStreams();
    this._drainPendingMessages();
    /*
    this._pc.onicecandidate = _onIceChannelStateChange;


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
        this._pc.addStream(stream.mediaStream);
        Logger.debug('Added stream to peer connection.');
        this._sendStreamSourceInfo(stream);
        Logger.debug('Sent stream source info.');
        this._publishedStreams.push(stream);
      }
      this._pendingStreams.length = 0;
      for (let j = 0; j < this._pendingUnpublishStreams.length; j++) {
        if (!this._pendingUnpublishStreams[j].mediaStream) {
          continue;
        }
        this._pc.removeStream(this._pendingUnpublishStreams[j].mediaStream);
        Logger.debug('Remove stream.');
      }
      this._pendingUnpublishStreams.length = 0;
    }
  }

  _drainPendingMessages(){
    Logger.debug('Draining pending messages.');
    if (this._pendingMessages.length == 0) {
      return;
    }
    const dc = this._dataChannels.get(DataChannelLabel.MESSAGE);
    if (dc && dc.readyState === 'open') {
      for (var i = 0; i < this._pendingMessages.length; i++) {
        dc.send(JSON.stringify(this._pendingMessages[i]));
      }
      this._pendingMessages.length = 0;
    } else if(this._pc&&!dc){
      this._createDataChannel(DataChannelLabel.MESSAGE);
    }
  }

  _sendStreamSourceInfo(stream) {
    const info = [];
    stream.mediaStream.getTracks().map((track) => {
      info.push({
        id: track.id,
        source: stream.source[track.kind]
      });
    });
    this._sendSignalingMessage(SignalingType.TRACK_SOURCES, info);
  }

  _handleRemoteCapability(ua) {
    if (ua.sdk && ua.sdk && ua.sdk.type === "JavaScript" && ua.runtime && ua.runtime
      .name === "Firefox") {
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
    Logger.debug('Do negotiation.');
    this._negotiationState = NegotiationState.NEGOTIATING;
    this._createAndSendOffer();
  };

  _createAndSendOffer() {
    if (!this._pc) {
      Logger.error('Peer connection have not been created.');
      return;
    }
    if (this._pc.signalingState !== 'stable') {
      this._negotiationState = NegotiationState.NEGOTIATING;
      return;
    }
    this._drainPendingStreams();
    this._isNegotiationNeeded = false;
    this._pc.createOffer(offerOptions).then(desc => {
      // desc.sdp = setRtpReceiverOptions(desc.sdp, peer);
      this._pc.setLocalDescription(desc).then(() => {
        Logger.debug('Set local description successfully.');
        this._negotiationState = NegotiationState.READY;
        this._sendSdp(desc);
      }, function(errorMessage) {
        Logger.error('Set local description failed. Message: ' + JSON
          .stringify(errorMessage));
      });
    }, function(error) {
      Logger.error('Create offer failed. Error info: ' + JSON.stringify(
        error));
    });
  }

  _createAndSendAnswer() {
    this._drainPendingStreams();
    this._isNegotiationNeeded = false;
    this._pc.createAnswer().then(desc => {
      //desc.sdp = setRtpReceiverOptions(desc.sdp, peer);
      this._pc.setLocalDescription(desc).then(() => {
        Logger.debug("Set local description successfully.");
        this._sendSdp(desc);
      }, function(errorMessage) {
        Logger.error(
          "Error occurred while setting local description. Error message:" +
          errorMessage);
      });
    }, function(error) {
      Logger.error('Create answer failed. Message: ' + error);
    });
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
      Logger.error('Unpublish is not supported on Firefox.');
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_UNSUPPORTED_METHOD));
    }
    const i = this._publishedStreams.findIndex(element => element.id == stream.id);
    if (i == -1) {
      return Promise.reject(new ErrorModule.P2PError(ErrorModule.errors.P2P_CLIENT_ILLEGAL_ARGUMENT));
    }
    this._publishedStreams.splice(i, 1);
    this._pendingUnpublishStreams.push(stream);
    return new Promise((resolve, reject) => {
      this._unpublishPromises.set(stream.mediaStream.id, {
        resolve: resolve,
        reject: reject
      });
      this._drainPendingStreams();
    });
  };

  // Make sure |_pc| is available before calling this method.
  _createDataChannel(label) {
    if (this._dataChannels.has(label)) {
      Logger.warning('Data channel labeled '+ label+' already exists.');
      return;
    }
    if(!this._pc){
      Logger.debug('PeerConnection is not available before creating DataChannel.');
      return;
    }
    Logger.debug('Create data channel.');
    const dc = this._pc.createDataChannel(label, null);
    this._bindEventsToDataChannel(dc);
    this._dataChannels.set(DataChannelLabel.MESSAGE,dc);
  }

  _bindEventsToDataChannel(dc){
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
      Logger.debug("Data Channel Error:", error);
    };
  }
}

export default P2PPeerConnectionChannel;
