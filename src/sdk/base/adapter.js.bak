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

/*global  Woogeen.ieplugin.globalLocalStream,Woogeen,console,performance,createIceServer,RTCIceCandidate,RTCSessionDescription,mozRTCPeerConnection,mozRTCSessionDescription,mozRTCIceCandidate,MediaStream,webkitRTCPeerConnection*/
/*exported trace,createIceServers*/

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var attachRemoteMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;
//var Woogeen=Woogeen|| {};

function trace(text) {/*jshint ignore:line*/
  // This function is used for logging.
  'use strict';
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}
function maybeFixConfiguration(pcConfig) {
  'use strict';
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
  RTCPeerConnection = function(pcConfig, pcConstraints) {/*jshint ignore:line*/
    // .urls is not supported in FF yet.
    maybeFixConfiguration(pcConfig);
    return new mozRTCPeerConnection(pcConfig, pcConstraints);
  };

  // The RTCSessionDescription object.
  RTCSessionDescription = mozRTCSessionDescription;/*jshint ignore:line*/

  // The RTCIceCandidate object.
  RTCIceCandidate = mozRTCIceCandidate;/*jshint ignore:line*/

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Creates iceServer from the url for FF.
  createIceServer = function(url, username, password) {/*jshint ignore:line*/
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

  createIceServers = function(urls, username, password) {/*jshint ignore:line*/
    'use strict';
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
    'use strict';
    console.log("Attaching media stream");
    element.mozSrcObject = stream;
    element.play();
  };

  reattachMediaStream = function(to, from) {
    'use strict';
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
  createIceServer = function(url, username, password) {/*jshint ignore:line*/
    'use strict';
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
  createIceServers = function(urls, username, password) {/*jshint ignore:line*/
    'use strict';
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
  RTCPeerConnection = function(pcConfig, pcConstraints) {/*jshint ignore:line*/
    // .urls is supported since Chrome M34.
     'use strict';
    if (webrtcDetectedVersion < 34) {
      maybeFixConfiguration(pcConfig);
    }
    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
  };

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Attach a media stream to an element.
  attachMediaStream = function(element, stream) {
    'use strict';
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

  RTCPeerConnection = Woogeen.ieplugin.ieRTCPeerConnection;

  var ieLocalTrack = function() {
      this.stop = function(){
      };
    };
  navigator.getUserMedia = function(config, success, failure){
    'use strict';
    Woogeen.globalLocalStream.constraints = JSON.stringify(config);
    Woogeen.globalLocalStream.onsuccess = success;
    Woogeen.globalLocalStream.onfailure = failure;
    Woogeen.globalLocalStream.label = "general_video";
    Woogeen.globalLocalStream.ieStream = null;
    Woogeen.globalLocalStream.getTracks =function(){
      var tracks=[new ieLocalTrack()];
      return tracks;
    }
    Woogeen.globalLocalStream.close = function(){
      if(Woogeen.globalLocalStream.ieStream !== null){
        Woogeen.globalLocalStream.ieStream.close();
      }
    }
    Woogeen.globalLocalStream.id = "general_video";
    success(Woogeen.globalLocalStream);
  };

  getPeerConnectionAudioLevels = function(pc, successcallback, failurecallback){/*jshint ignore:line*/ //failurecallback is unuesd.
    pc.getAudioLevels(successcallback);
  };

  // Attach a media stream to an element. Currently implented as a fake function
  attachMediaStream = function (element, stream) {/*jshint ignore:line*/  //stream is unused.
    Woogeen.globalLocalView = element;/*jshint ignore:line*/
  };

  //we should assign a dedicated attachStream function to notify corresonding peer connection instaance.
  attachRemoteMediaStream = function (element, stream, pcid) {
    'use strict';
    var ctx = element.getContext("2d");
    var img = new Image();

    (function (ctx, element, img) {
      document.getElementById("WebRTC.ActiveX"+pcid).attachMediaStream(stream.label, function (data) {
        img.src = data;
        ctx.drawImage(img, 0, 0, element.width, element.height);
      });
    })(ctx, element, img);
  };


  RTCIceCandidate = function(cand) {/*jshint ignore:line*/
    return cand;
  };

  RTCSessionDescription = function (desc) {/*jshint ignore:line*/
   return desc;
  };
}
