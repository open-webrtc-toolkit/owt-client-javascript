/* global console,mozRTCPeerConnection,createIceServer*/
/**
 * Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 * Use of this source code is governed by a BSD-style license
 * that can be found in the LICENSE file in the root of the source
 * tree. An additional intellectual property rights grant can be found
 * in the file PATENTS.  All contributing project authors may
 * be found in the AUTHORS file in the root of the source tree.
 */

// This file is cloned from samples/js/base/adapter.js
// Modify the original and do new copy instead of doing changes here.

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}
function maybeFixConfiguration(pcConfig) {
  if (pcConfig == null) {
    return;
  }
  for (var i = 0; i < pcConfig.iceServers.length; i++) {
    if (pcConfig.iceServers[i].hasOwnProperty('urls')){
      pcConfig.iceServers[i]['url'] = pcConfig.iceServers[i]['urls'];
      delete pcConfig.iceServers[i]['urls'];
    }
  }
}

if (navigator.mozGetUserMedia) {
  console.log("This appears to be Firefox");

  webrtcDetectedBrowser = "firefox";

  webrtcDetectedVersion =
           parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

  // The RTCPeerConnection object.
  var RTCPeerConnection = function(pcConfig, pcConstraints) {
    // .urls is not supported in FF yet.
    maybeFixConfiguration(pcConfig);
    return new mozRTCPeerConnection(pcConfig, pcConstraints);
  };

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Creates iceServer from the url for FF.
  createIceServer = function(url, username, password) {
    var iceServer = null;
    var url_parts = url.split(':');
    if (url_parts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = { 'url': url };
    } else if (url_parts[0].indexOf('turn') === 0) {
      if (webrtcDetectedVersion < 27) {
        // Create iceServer with turn url.
        // Ignore the transport parameter from TURN url for FF version <=27.
        var turn_url_parts = url.split("?");
        // Return null for createIceServer if transport=tcp.
        if (turn_url_parts.length === 1 ||
            turn_url_parts[1].indexOf('transport=udp') === 0) {
          iceServer = {'url': turn_url_parts[0],
                       'credential': password,
                       'username': username};
        }
      } else {
        // FF 27 and above supports transport parameters in TURN url,
        // So passing in the full url to create iceServer.
        iceServer = {'url': url,
                     'credential': password,
                     'username': username};
      }
    }
    return iceServer;
  };

  createIceServers = function(urls, username, password) {
    var iceServers = [];
    // Use .url for FireFox.
    for (var i = 0; i < urls.length; i++) {
      var iceServer = createIceServer(urls[i],
                                      username,
                                      password);
      if (iceServer !== null) {
        iceServers.push(iceServer);
      }
    }
    return iceServers;
  };

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    console.log("Attaching media stream");
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function(to, from) {
    console.log("Reattaching media stream");
    to.mozSrcObject = from.mozSrcObject;
    to.play();
  };

  // Fake get{Video,Audio}Tracks
  if (!MediaStream.prototype.getVideoTracks) {
    MediaStream.prototype.getVideoTracks = function() {
      return [];
    };
  }

  if (!MediaStream.prototype.getAudioTracks) {
    MediaStream.prototype.getAudioTracks = function() {
      return [];
    };
  }
} else if (navigator.webkitGetUserMedia) {
  console.log("This appears to be Chrome");

  webrtcDetectedBrowser = "chrome";
  webrtcDetectedVersion =
         parseInt(navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./)[2], 10);

  // Creates iceServer from the url for Chrome M33 and earlier.
  createIceServer = function(url, username, password) {
    var iceServer = null;
    var url_parts = url.split(':');
    if (url_parts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = { 'url': url };
    } else if (url_parts[0].indexOf('turn') === 0) {
      // Chrome M28 & above uses below TURN format.
      iceServer = {'url': url,
                   'credential': password,
                   'username': username};
    }
    return iceServer;
  };

  // Creates iceServers from the urls for Chrome M34 and above.
  createIceServers = function(urls, username, password) {
    var iceServers = [];
    if (webrtcDetectedVersion >= 34) {
      // .urls is supported since Chrome M34.
      iceServers = {'urls': urls,
                    'credential': password,
                    'username': username };
    } else {
      for (var i = 0; i < urls.length; i++) {
        var iceServer = createIceServer(urls[i],
                                        username,
                                        password);
        if (iceServer !== null) {
          iceServers.push(iceServer);
        }
      }
    }
    return iceServers;
  };

  // The RTCPeerConnection object.
  var RTCPeerConnection = function(pcConfig, pcConstraints) {
    // .urls is supported since Chrome M34.
    if (webrtcDetectedVersion < 34) {
      maybeFixConfiguration(pcConfig);
    }
    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
  };

  getPeerConnectionStats = function(pc, callback){
    var index = 0;
    var Stats_Report = [];
    pc.getStats(function(stats){
     var results = stats.result();
     for(var i=0; i< results.length; i++){
       var res = results[i];
       var curStat;
       var match = false;
       if(res.type === "ssrc"){
       //This is a ssrc report. Check if it is send/recv
         match = true;
         if(res.stat("bytesSent")){
         //check if it"s audio or video
           if(res.stat("googFrameHeightSent")){
         //video send
           var adapt_reason;
             if(res.stat("googCpuLimitedResolution") === true){
               adapt_reason = 1;
             }else if(res.stat("googBandwidthLimitedResolution") === true){
               adapt_reason = 2;
             }else if(res.stat("googViewLimitedResolution") === true){
               adapt_reason = 3;
             }else{
               adapt_reason = 99;
             }
             curStat = {"type":"ssrc_video_send",
                        "id":res.id,
                        "stats":{"bytes_sent":res.stat("bytesSent"), "codec_name":res.stat("googCodecName"),
                                 "packets_sent":res.stat("packetsSent"),
                                 "packets_lost":res.stat("packetsLost"),
                                 "firs_rcvd":res.stat("googFirsReceived"),
                                 "plis_rcvd":res.stat("googPlisReceived"),
                                 "nacks_rcvd":res.stat("googNacksReceived"),
                                 "send_frame_width":res.stat("googFrameWidthSent"),
                                 "send_rame_height":res.stat("googFrameHeightSent"),
                                 "adapt_reason":adapt_reason,
                                 "adapt_changes":res.stat("googAdaptationChanges"),
                                 "framerate_sent":res.stat("googFrameRateSent"),
                                 "rtt_ms":res.stat("googRtt")}};
           }else{
           //audio send
             curStat = {"type":"ssrc_audio_send",
                        "id":res.id,
                        "stats":{"bytes_sent":res.stat("bytesSent"),
                               "codec_name":res.stat("googCodecName"),
                               "packets_sent":res.stat("packetsSent"),
                               "packets_lost":res.stat("packetsLost"),
                               "rtt_ms":res.stat("googRtt")}};
           }
         }else{
         //this is ssrc receive report.
           if(res.stat("googFrameHeightReceived")){
           //video receive
             curStat = {"type":"ssrc_video_recv",
                        "id":res.id,
                        "stats":{"bytes_rcvd":res.stat("bytesReceived"),
                               "packets_rcvd":res.stat("packetsReceived"),
                               "packets_lost":res.stat("packetsLost"),
                               "firs_sent":res.stat("googFirsSent"),
                               "nacks_sent":res.stat("googNacksSent"),
                               "plis_sent":res.stat("googPlisSent"),
                               "frame_width":res.stat("googFrameWidthReceived"),
                               "frame_height":res.stat("googFrameHeightReceived"),
                               "framerate_rcvd":res.stat("googFrameRateReceived"),
                               "framerate_output":res.stat("googFrameRateDecoded"),
                               "current_delay_ms":res.stat("googCurrentDelayMs"),
                               "codec_name":res.stat("googCodecName")}};
           }else{
           //audio receive
             curStat = {"type":"ssrc_audio_recv",
                        "id":res.id,
                        "stats":{"bytes_rcvd":res.stat("bytesReceived"),
                               "delay_estimated_ms":res.stat("googCurrentDelayMs"),
                               "packets_rcvd":res.stat("packetsReceived"),
                               "packets_lost":res.stat("packetsLost"),
                               "codec_name":res.stat("googCodecName")}};
           }
         }
       }else if(res.type === "VideoBwe"){
         match = true;
         curStat = {"type":"VideoBWE",
                    "id":"",
                    "stats":{"available_send_bandwidth":res.stat("googAvailableSendBandwidth"),
                           "available_receive_bandwidth":res.stat("googAvailableReceiveBandwidth"),
                           "transmit_bitrate":res.stat("googTransmitBitrate"),
                           "retransmit_bitrate":res.stat("googRetransmitBitrate")}};
       }
       if(match){
         Stats_Report[index] = curStat;
         index++;
       }
     }
     callback(Stats_Report);
   });
  };

  getPeerConnectionAudioLevels = function(pc, successcallback, failurecallback){
    var in_level_idx = 0;
    var out_level_idx = 0;
    var Stats_Report = {};
    var curInputLevels = [];
    var curOutputLevels = [];
    var match = false;
    pc.getStats(function(stats){
     var results = stats.result();
     for(var i=0; i< results.length; i++){
       var res = results[i];
       if(res.type === "ssrc"){
       //This is a ssrc report. Check if it is send/recv
         if(res.stat("bytesSent")){
         //check if it"s audio or video
           if(res.stat("googFrameHeightSent")){
           //video send, not setting audio levels
           }else{
           //audio send
             match = true;
             var curObj = {};
             curObj.ssrc=res.id;
             curObj.level=res.stat("audioInputLevel");
             curInputLevels[in_level_idx]=curObj;
             in_level_idx++;
           }
         }else{
         //this is ssrc receive report.
           if(res.stat("googFrameHeightReceived")){
           //video receive
           }else{
           //audio receive
             match = true;
             var curObj = {};
             curObj.ssrc=res.id;
             curObj.level=res.stat("audioOutputLevel");
             curOutputLevels[out_level_idx]=curObj;
             out_level_idx++;
           }
         }
       }
     }
     if(match){
       if(in_level_idx > 0){
         Stats_Report.audioInputLevels = curInputLevels;
       }
       if(out_level_idx > 0){
         Stats_Report.audioOutputLevels = curOutputLevels;
       }
       successcallback(Stats_Report);
     }else{
       failurecallback("Failed to get audio levels from current peer connection");
     }
   });
  };

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
  };

  reattachMediaStream = function(to, from) {
    to.src = from.src;
  };
} else {
  console.log("This seems to be IE");

  var plugin = document.createElement("OBJECT");
  plugin.setAttribute("ID", "WebRTC.ActiveX");
  plugin.setAttribute("height", "0");
  plugin.setAttribute("width", "0");
  //plugin.setAttribute("CLASSID", "CLSID:0E8D29CE-D2D0-459A-8009-3B34EFBC43F0");
  plugin.setAttribute("CLASSID", "CLSID:1D117433-FD6F-48D2-BF76-26E2DC5390FC");
  document.getElementsByTagName("body")[0].appendChild(plugin);

  RTCPeerConnection = ieRTCPeerConnection;

  navigator.getUserMedia = function(config, success, failure) {
    document.getElementById("WebRTC.ActiveX").getUserMedia(JSON.stringify(config), function(label) {
      var stream = new ieMediaStream(label);
      success(stream);
    }, failure);
  };

  getPeerConnectionStats = function(pc, callback){
    pc.getStats(callback);
  };

  getPeerConnectionAudioLevels = function(pc, successcallback, failurecallback){
    pc.getAudioLevels(successcallback);
  };

  // Attach a media stream to an element
  attachMediaStream = function (element, stream) {
    var ctx = element.getContext("2d");
    var img = new Image();

    (function (ctx, element, img) {
      document.getElementById("WebRTC.ActiveX").attachMediaStream(stream.label, function (data) {
        img.src = data;
        ctx.drawImage(img, 0, 0, element.width, element.height);
      });
    })(ctx, element, img);
  };

  RTCIceCandidate = function(cand) {
    return cand;
  };

  RTCSessionDescription = function (desc) {
   return desc;
  };
}
