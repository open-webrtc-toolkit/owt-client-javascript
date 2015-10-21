/* global console*/
/* exported ieRTCPeerConnection*/
var ieMediaStream = function(label) {/*jshint ignore:line*/ //Read only.
  'use strict';

  var that = this;
  this.id = label;
  this.label = label;
  this.ended = false;
  this.stopped = false;
  this.closed = false;
  this.onaddtrack = null;
  this.onended = null;
  this.onremovetrack = null;

  var ieTrack = function() {
  };
  this.audioTracks = [new ieTrack()];
  this.videoTracks = [new ieTrack()];

  this.getTracks = function() {
  };
  this.getAudioTracks = function() {
    return that.audioTracks;
  };
  this.getVideoTracks = function() {
    return that.videoTracks;
  };
  this.addTrack = function(track) { /*jshint ignore:line*/ //track is unused.
  };
  this.removeTrack = function(track) { /*jshint ignore:line*/ //track is unused.
  };
  this.stop = function() {
    if(that.stopped === false){
      var plugin = document.getElementById("WebRTC.ActiveX");
      if(plugin !== undefined) {
        try{
          plugin.stopStream(that);
        }catch(ex){console.log("An exception is thrown in server");}
      }
      that.stopped = true;
      that.closed = true;
    }
  };
  this.close = function() {
    if(that.closed === false){
      var plugin = document.getElementById("WebRTC.ActiveX");
      if(plugin !== undefined) {
        try{
          plugin.removeStream(that);
        }catch(ex){console.log("An exception is thrown in server");}
      }
      that.closed = true;
    }
  };
};

var ieRTCDataChannel = function(label, constraints) {
  'use strict';
  var that = this;
  var pendingMessages = {};
  this.activeX = document.getElementById("WebRTC.ActiveX");
  this.label = label;
  this.constraints = constraints;

  this.onmessage = null;
  this.onopen = null;
  this.onerror = null;
  this.onclose = null;
  this.readyState = 'connecting';

  this.activeX.onmessage = function(msg) {
    var evt = {};
    evt.data = msg;
    pendingMessages.push(evt);
    if (that.onmessage) {
      for (var i=0; i<pendingMessages.length; i++) {
        that.onmessage(pendingMessages[i]);
      }
      pendingMessages = [];
    }
  };
  this.activeX.onopen = function(msg) { /*jshint ignore:line*/ //msg is unused.
    var evt = {};
    evt.target = that;
    that.readyState = 'open';
    if (that.open) {
      that.onopen(evt);
    }
  };
  this.activeX.onerror = function() {
    that.onerror();
  };
  this.activeX.onclose = function() {
    var evt = {};
    evt.target = that;
    that.readyState = 'closed';
    if (that.onclose) {
      that.onclose(evt);
    }
  };

  this.close = function() {
    that.activeX.closeDataChannel(that.label);
  };
  this.send = function(data) {
    that.activeX.send(data);
  };
};

var ieRTCPeerConnection=function(config, constraints) {/*jshint ignore:line*/ //ieRTCPeerConnection never used.
  'use strict';

  var that = this;
  this.activeX = document.getElementById("WebRTC.ActiveX");
  //If failed to get the plugin, we need to re-create this:
  if(this.activeX === null){
    var plugin = document.createElement("OBJECT");
    plugin.setAttribute("ID", "WebRTC.ActiveX");
    plugin.setAttribute("height", "0");
    plugin.setAttribute("width", "0");
    plugin.setAttribute("CLASSID", "CLSID:1D117433-FD6F-48D2-BF76-26E2DC5390FC");
    document.body.appendChild(plugin);
    this.activeX = document.getElementById("WebRTC.ActiveX");
  }
  // new ieRTCPeerConnection
  if (config != null) {
    config = config["iceServers"];
    this.config = JSON.stringify(config);
  }
  if (constraints != null) {
    this.constraints = JSON.stringify(constraints);
  }
  this.activeX.initializePeerConnection(this.config, this.constraints);

  // Peer connection methods
  this.createOffer = function(success, failure, constraints) {
    that.activeX.createOffer(function (sdp) {
      success(JSON.parse(sdp));
    }, failure, JSON.stringify(constraints));
  };
  this.createAnswer = function(success, failure, constraints) {
    that.activeX.createAnswer(function (sdp) {
      success(JSON.parse(sdp));
    }, failure, JSON.stringify(constraints));
  };
  this.setLocalDescription = function(sdp, success, failure) {
    that.activeX.setLocalDescription(sdp, success, failure);
  };
  this.setRemoteDescription = function(sdp, success, failure) {
    that.activeX.setRemoteDescription(sdp, success, failure);
  };
  this.addStream = function(stream) {
    that.activeX.addStream(stream);
  };
  this.removeStream = function(stream) {
    that.activeX.removeStream(stream);
  };
  this.addIceCandidate = function(candidate, success, failure) {
    that.activeX.addIceCandidate(candidate, success, failure);
  };
  this.getStats = function(callback){
    that.activeX.getStats(function(stats){callback(stats);});
  };
  this.getAudioLevels = function(callback){
    that.activeX.getAudioLevels(callback);
  };
  this.close = function() {
    that.activeX.close();
    var plugin = document.getElementById("WebRTC.ActiveX");
    if(plugin){
      that.activeX.closeDataChannel(that.label);
      document.body.removeChild(plugin);
      that.activeX = undefined;
    }
  };

  this.createDataChannel = function(label, constraints) {
    that.activeX.createDataChannel(label, constraints);
    var dc = new ieRTCDataChannel(label, constraints);
    return dc;
  };

  // Peer connection events
  this.onicecandidate = null;
  this.onaddstream = null;
  this.onremovestream = null;
  this.oniceconnectionstatechange = null;
  this.onsignalingstatechange = null;
  this.onnegotiationneeded = null;
  this.ondatachannel = null;

  // Bind events to ActiveX
  this.activeX.onicecandidate = function(evt) {
    var obj = JSON.parse(evt);
    if (that.onicecandidate) {
      that.onicecandidate(obj);
    }
  };
  this.activeX.onaddstream = function(label) {
    var evt = {};
    var stream = new ieMediaStream(label);
    evt.stream = stream;
    if (that.onaddstream) {
      that.onaddstream(evt);
    }
  };
  this.activeX.onremovestream = function(label) {
    var evt = {};
    var stream = new ieMediaStream(label);
    evt.stream = stream;
    if (that.onremovestream) {
      that.onremovestream(evt);
    }
  };
  this.activeX.oniceconnectionstatechange = function(state) {
    that.iceConnectionState = state;
    if (that.oniceconnectionstatechange) {
      that.oniceconnectionstatechange(state);
    }
  };
  this.activeX.onsignalingstatechange = function() {
    if(that.activeX != null){
      that.signalingState = that.activeX.signalingState;
    }
    if (that.onsignalingstatechange) {
      that.onsignalingstatechange();
    }
  };
  this.activeX.onnegotiationneeded = function() {
    if (that.onnegotiationneeded) {
      that.onnegotiationneeded();
    }
  };
  this.activeX.ondatachannel = function(label) {
    var evt = {};
    var dc = new ieRTCDataChannel(label, null);
    evt.channel = dc;
    if (that.ondatachannel) {
      that.ondatachannel(evt);
    }
  };

  // Peer connection properties
  this.iceConnectionState = "new";
  this.signalingState = "stable";
};
