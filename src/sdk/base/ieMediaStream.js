/*global console*/
//var Woogeen=Woogeen || {};
Woogeen.ieplugin={};
var pc_id = 0;
Woogeen.globalLocalView = null;
Woogeen.globalLocalStream = {};
var ieTrack = function(ieStream) {
  var that = this;
  this.stream = ieStream;
  this.stop = function(){
    that.stream.stop();
  };
};

Woogeen.ieplugin.ieMediaStream =function (label) {
  'use strict';

  var that = this;
  this.id = label;
  this.attachedPCID = 0;
  this.label = label;
  this.ended = false;
  this.stopped = false;
  this.closed = false;
  this.onaddtrack = null;
  this.onended = null;
  this.onremovetrack = null;
  this.audioTracks = [new ieTrack(that)];
  this.videoTracks = [new ieTrack(that)];

  this.getTracks = function() {
    return that.audioTracks.concat(that.videoTracks);
  };
  this.getAudioTracks = function() {
    return that.audioTracks;
  };
  this.getVideoTracks = function() {
    return that.videoTracks;
  };
  this.addTrack = function(track) {/*jshint ignore:line*/ //track is unused.
  };
  this.removeTrack = function(track) {/*jshint ignore:line*/ //track is unused.
  };
  this.stop = function() {
    if(that.stopped === false){
      var plugin = document.getElementById("WebRTC.ActiveX"+that.attachedPCID);
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
      var plugin = document.getElementById("WebRTC.ActiveX"+that.attachedPCID);
      if(plugin !== undefined) {
        try{
          plugin.removeStream(that);
        }catch(ex){console.log("An exception is thrown in server");}
      }
      that.closed = true;
    }
  };
};

Woogeen.ieplugin.ieRTCDataChannel=function(label, pcid) {
  'use strict';
  var that = this;
  var pendingMessages = [];
  this.attachedPCID = pcid;
  this.activeX = document.getElementById("WebRTC.ActiveX"+that.attachedPCID);
  this.label = label;

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
    if(that.activeX){
      that.activeX.closeDataChannel(that.label);
    }
  };
  this.send = function(data) {
    if(that.activeX){
      that.activeX.send(data);
    }
  };
};

Woogeen.ieplugin.ieRTCPeerConnection= function (config, constraints) {
  var that = this;
  this.myId = pc_id+1;
  pc_id = pc_id +1;
  var plugin = document.createElement("OBJECT");
  plugin.setAttribute("ID", "WebRTC.ActiveX"+that.myId);
  plugin.setAttribute("height", "0");
  plugin.setAttribute("width", "0");
  plugin.setAttribute("CLASSID", "CLSID:1D117433-FD6F-48D2-BF76-26E2DC5390FC");
  document.body.appendChild(plugin);
  that.activeX=document.getElementById("WebRTC.ActiveX"+that.myId);

    // new ieRTCPeerConnection
  if (config != null) {
    config = config["iceServers"];
    this.config = JSON.stringify(config);
  }
  if (constraints != null) {
    this.constraints = JSON.stringify(constraints);
  }
  this.activeX.initializePeerConnection(this.config, this.constraints);

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
      that.activeX.getUserMedia(stream.constraints,  function(label) {
        var ieStream = new Woogeen.ieplugin.ieMediaStream(label);
        var ctx = Woogeen.globalLocalView.getContext("2d");
        var img = new Image();
        that.activeX.attachMediaStream(ieStream.label, function (data) {
         try{ img.src = data;
          ctx.drawImage(img, 0, 0, Woogeen.globalLocalView.width, Woogeen.globalLocalView.height);
        }catch(ex){console.log("err:"+ex);}
        });

        that.activeX.addStream(ieStream);
        stream.id = ieStream.label;
        Woogeen.globalLocalStream.ieStream = ieStream;
      }, stream.onfailure);
  };
  // Peer connection methods
  this.createOffer = function(success, failure, constraints) {
    if(!that.activeX){return;}
    that.activeX.createOffer(function (sdp) {
      success(JSON.parse(sdp));
    }, failure, JSON.stringify(constraints));
  };
  this.removeStream = function(stream) {
    if(!that.activeX){return;}
    that.activeX.removeStream(stream);
  };
  this.addIceCandidate = function(candidate, success, failure) {
    if(!that.activeX){return;}
    that.activeX.addIceCandidate(candidate, success, failure);
  };
  this.getStats = function(callback){
    that.activeX.getStats(function(stats){callback(stats);});
  };
  this.getAudioLevels = function(callback){
    that.activeX.getAudioLevels(callback);
  };
  this.close = function() {
    if(that.activeX){
      try{
        that.activeX.close();
      }catch(ex){console.log("exception when closing the control");}
    }
    var plugin = document.getElementById("WebRTC.ActiveX" + that.myId);
    if(plugin){
      that.activeX.closeDataChannel(that.label);
      document.body.removeChild(plugin);
      that.activeX = undefined;
    }
  };

  this.createDataChannel = function(label, constraints) {
    if(that.activeX){
      that.activeX.createDataChannel(label, constraints);
    }
    var dc = new Woogeen.ieplugin.ieRTCDataChannel(label, that.myId);
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
    var stream = new Woogeen.ieplugin.ieMediaStream(label);
    stream.attachedPCID = that.myId;
    evt.stream = stream;
    evt.pcid = that.myId;
    if (that.onaddstream) {
      that.onaddstream(evt);
    }
  };
  this.activeX.onremovestream = function(label) {
    var evt = {};
    var stream = new Woogeen.ieplugin.ieMediaStream(label);
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
  this.activeX.onsignalingstatechange = function(state) {
    that.signalingState = state;
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
    var dc = new Woogeen.ieplugin.ieRTCDataChannel(label, that.myId);
    evt.channel = dc;
    if (that.ondatachannel) {
      that.ondatachannel(evt);
    }
  };

  // Peer connection properties
  this.iceConnectionState = "new";
  this.signalingState = "stable";
};
