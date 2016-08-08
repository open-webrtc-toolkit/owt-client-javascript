/* global io */
(function () {

  function safeCall () {
    var callback = arguments[0];
    if (typeof callback === 'function') {
      var args = Array.prototype.slice.call(arguments, 1);
      callback.apply(null, args);
    }
  }

  Woogeen.sessionId = 103;

  var getBrowser = function () {
    var browser = "none";

    if (window.navigator.userAgent.match("Firefox") !== null) {
      // Firefox
      browser = "mozilla";
    } else if (window.navigator.appVersion.indexOf('Trident') > -1) {
      browser = 'internet-explorer';
    } else if (window.navigator.userAgent.match("Bowser") !==null){
      browser = "bowser";
    } else if (window.navigator.userAgent.match("Chrome") !==null) {
      if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >= 26) {
        browser = "chrome-stable";
      }
    } else if (window.navigator.userAgent.match("Safari") !== null) {
      browser = "bowser";
    } else if (window.navigator.userAgent.match("WebKit") !== null) {
      browser = "bowser";
    }

    return browser;
  };

  function createChannel (spec) {
    spec.session_id = (Woogeen.sessionId += 1);
    var that = {};

    that.browser = getBrowser();

    if (that.browser === 'mozilla') {
      L.Logger.debug("Firefox Stack");
      that = Erizo.FirefoxStack(spec);
    } else if (that.browser === 'internet-explorer'){
      L.Logger.debug("IE Stack");
      that = Erizo.IEStableStack(spec);
    } else if (that.browser === 'bowser'){
      L.Logger.debug("Bowser Stack");
      that = Erizo.BowserStack(spec);
    } else if (that.browser === 'chrome-stable') {
      L.Logger.debug("Stable!");
      that = Erizo.ChromeStableStack(spec);
    } else {
      L.Logger.debug("None!");
      throw "WebRTC stack not available";
    }
    if (!that.updateSpec){
      that.updateSpec = function(newSpec, callback){
        L.Logger.error("Update Configuration not implemented in this browser");
        if (callback) {
            callback ("unimplemented");
        }
      };
    }

    return that;
  }

  function createRemoteStream (spec) {
    if (!spec.video) {
      return new Woogeen.RemoteStream(spec);
    }
    switch (spec.video.device) {
    case 'mcu':
      return new Woogeen.RemoteMixedStream(spec);
    default:
      return new Woogeen.RemoteStream(spec);
    }
  }

  function sendMsg(socket, type, message, callback) {
    if (!socket || !socket.connected) {
      return callback('socket not ready');
    }
    try {
      socket.emit(type, message, function (resp, mesg) {
        if (resp === 'success') {
          return callback(null, mesg);
        }
        return callback(mesg||'response error');
      });
    } catch (err) {
      callback('socket emit error');
    }
  }

  function sendSdp(socket, type, option, sdp, callback) {
    if (!socket || !socket.connected) {
      return callback('error', 'socket not ready');
    }
    try {
      socket.emit(type, option, sdp, function (status, resp) {
        callback(status, resp);
      });
    } catch (err) {
      callback('error', 'socket emit error');
    }
  }

  function sendCtrlPayload(socket, action, streamId, onSuccess, onFailure) {
    var payload = {
      type: 'control',
      payload: {
        action: action,
        streamId: streamId
      }
    };
    sendMsg(socket, 'customMessage', payload, function(err, resp) {
      if (err) {
        return safeCall(onFailure, err);
      }
      safeCall(onSuccess, resp);
    });
  }

var DISCONNECTED = 0, CONNECTING = 1, CONNECTED = 2;

var WoogeenConferenceBase = function WoogeenConferenceBase (spec) {
  this.internalDispatcher = Woogeen.EventDispatcher({});
  this.spec = spec || {};
  this.remoteStreams = {};
  this.localStreams = {};
  this.state = DISCONNECTED;
};

WoogeenConferenceBase.prototype = Woogeen.EventDispatcher({}); // make WoogeenConferenceBase a eventDispatcher

/**
   * @function setIceServers
   * @desc This function establishes a connection to server and joins a certain conference.
<br><b>Remarks:</b><br>
This method accepts array (multiple ones) type of ice server item as argument. Typical description of each valid value should be as below:<br>
<ul>
<li>For turn: {urls: array or single "url", username: "username", credential: "password"}.</li>
<li>For stun: {urls: array or single "url"}.</li>
</ul>
Each time this method is called, previous saved value would be discarded. Specifically, if parameter servers is not provided, the result would be an empty array, meaning any predefined servers are discarded.
   * @instance
   * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
   * @param {string/object/array} servers turn or stun server configuration.
   * @return {array} Result of the user-set of ice servers.
   * @example
<script type="text/JavaScript">
...
client.setIceServers([{
    urls: "stun:x.x.x.x:3478"
  }, {
    urls: ["turn:x.x.x.x:443?transport=udp", "turn:x.x.x.x:443?transport=tcp"],
    username: "abc",
    credential: "xyz"
  }]);
</script>
   */

  WoogeenConferenceBase.prototype.setIceServers = function () {
    var that = this.spec;
    that.userSetIceServers = [];
    Array.prototype.slice.call(arguments, 0).map(function (arg) {
      if (arg instanceof Array) {
        arg.map(function (server) {
          if (typeof server === 'object' && server !== null) {
            if (typeof server.urls === 'string' && server.urls !== '' || server.urls instanceof Array) {
              that.userSetIceServers.push(server);
            } else if (typeof server.url === 'string' && server.url !== '') {
              server.urls = server.url;
              delete server.url;
              that.userSetIceServers.push(server);
            }
          } else if (typeof server === 'string' && server !== '') {
            that.userSetIceServers.push({urls: server});
          }
        });
      } else if (typeof arg === 'object' && arg !== null) {
        if (typeof arg.urls === 'string' && arg.urls !== '' || arg.urls instanceof Array) {
          that.userSetIceServers.push(arg);
        } else if (typeof arg.url === 'string' && arg.url !== '') {
          arg.urls = arg.url;
          delete arg.url;
          that.userSetIceServers.push(arg);
        }
      } else if (typeof arg === 'string' && arg !== '') {
        that.userSetIceServers.push({urls: arg});
      }
    });
    return that.userSetIceServers;
  };

  WoogeenConferenceBase.prototype.getIceServers = function () {
    return this.spec.userSetIceServers;
  };


  WoogeenConferenceBase.prototype.join = function (token, onSuccess, onFailure) {
    var self = this;
    var isSecured = (token.secure === true);
    var host = token.host;
    if (typeof host !== 'string') {
      return safeCall(onFailure, 'invalid host');
    }
    if (host.indexOf('http') === -1) {
      host = isSecured ? ('https://' + host) : ('http://' + host);
    }
    // check connection>host< state
    if (self.state !== DISCONNECTED) {
      return safeCall(onFailure, 'connection state invalid');
    }

    self.on('server-disconnected', function () { // onConnectionClose handler
      self.state = DISCONNECTED;
      self.myId = null;
      var i, stream;
      // remove all remote streams
      for (i in self.remoteStreams) {
        if (self.remoteStreams.hasOwnProperty(i)) {
          stream = self.remoteStreams[i];
          stream.close();
          delete self.remoteStreams[i];
          var evt = new Woogeen.StreamEvent({type: 'stream-removed', stream: stream});
          self.dispatchEvent(evt);
        }
      }

      // close all channel
      for (i in self.localStreams) {
        if (self.localStreams.hasOwnProperty(i)) {
          stream = self.localStreams[i];
          if (stream.channel && typeof stream.channel.close === 'function') {
            stream.channel.close();
          }
          delete self.localStreams[i];
        }
      }

      // close socket.io
      try {
        self.socket.disconnect();
      } catch (err) {}
    });

    self.state = CONNECTING;

    if (self.socket !== undefined) { // whether reconnect
      self.socket.connect();
    } else {
      self.socket = io.connect(host, {
        reconnect: false,
        secure: isSecured,
        'force new connection': true
      });

      self.socket.on('add_stream', function (spec) {
        if (self.remoteStreams[spec.id] !== undefined) {
          L.Logger.warning('stream already added:', spec.id);
          return;
        }
        var stream = createRemoteStream({
          video: spec.video,
          audio: spec.audio,
          id: spec.id,
          from: spec.from,
          attributes: spec.attributes
        });
        var evt = new Woogeen.StreamEvent({type: 'stream-added', stream: stream});
        self.remoteStreams[spec.id] = stream;
        self.dispatchEvent(evt);
      });

      self.socket.on('update_stream', function (spec) {
        // Handle: 'VideoEnabled', 'VideoDisabled', 'AudioEnabled', 'AudioDisabled', 'VideoLayoutChanged', [etc]
        var stream = self.remoteStreams[spec.id];
        if (stream) {
          stream.emit(spec.event, spec.data);
        }
      });

      self.socket.on('remove_stream', function (spec) {
        var stream = self.remoteStreams[spec.id];
        if (stream) {
          stream.close(); // >removeStream<
          delete self.remoteStreams[spec.id];
          var evt = new Woogeen.StreamEvent({type: 'stream-removed', stream: stream});
          self.dispatchEvent(evt);
        }
      });

      self.socket.on('signaling_message_erizo', function (arg) {
          var stream;
          if (arg.peerId) {
              stream = self.remoteStreams[arg.peerId];
          } else {
              stream = self.localStreams[arg.streamId];
          }

          if (stream) {
              stream.channel.processSignalingMessage(arg.mess);
          }
      });

      self.socket.on('add_recorder', function (spec) {
        var evt = new Woogeen.RecorderEvent({type: 'recorder-added', id: spec.id});
        self.dispatchEvent(evt);
      });

      self.socket.on('reuse_recorder', function (spec) {
        var evt = new Woogeen.RecorderEvent({type: 'recorder-continued', id: spec.id});
        self.dispatchEvent(evt);
      });

      self.socket.on('remove_recorder', function (spec) {
        var evt = new Woogeen.RecorderEvent({type: 'recorder-removed', id: spec.id});
        self.dispatchEvent(evt);
      });

      self.socket.on('disconnect', function () {
        if (self.state !== DISCONNECTED) {
          var evt = new Woogeen.ClientEvent({type: 'server-disconnected'});
          self.dispatchEvent(evt);
        }
      });

      self.socket.on('user_join', function (spec) {
        var evt = new Woogeen.ClientEvent({type: 'user-joined', user: spec.user});
        self.dispatchEvent(evt);
      });

      self.socket.on('user_leave', function (spec) {
        var evt = new Woogeen.ClientEvent({type: 'user-left', user: spec.user});
        self.dispatchEvent(evt);
      });

      self.socket.on('custom_message', function (spec) {
        var evt = new Woogeen.MessageEvent({type: 'message-received', msg: spec});
        self.dispatchEvent(evt);
      });

      self.socket.on('connect_failed', function (err) {
        safeCall(onFailure, err || 'connection_failed');
      });

      self.socket.on('error', function (err) {
        safeCall(onFailure, err || 'connection_error');
      });

      self.socket.on('connection_failed', function() {
        L.Logger.info("ICE Connection Failed");
        if (self.state !== DISCONNECTED) {
          var disconnectEvt = new Woogeen.StreamEvent({type: 'stream-failed'});
          self.dispatchEvent(disconnectEvt);
        }
      });

      self.socket.on('stream-publish', function (spec) {
          var myStream = self.localStreams[spec.id];
          if (myStream){
            console.log('Stream published');
            self.dispatchEvent(new Woogeen.StreamEvent({type: 'stream-published', stream: myStream}));
          }
      });

    }

    try {
      self.socket.emit('token', token, function (status, resp) {
        if (status === 'success') {
          self.myId = resp.clientId;
          self.conferenceId = resp.id;
          self.state = CONNECTED;
          var streams = [];
          self.conferenceId = resp.id;
          if (resp.streams !== undefined) {
            streams = resp.streams.map(function (st) {
              self.remoteStreams[st.id] = createRemoteStream(st);
              return self.remoteStreams[st.id];
            });
          }
          return safeCall(onSuccess, {streams: streams, users: resp.users});
        }
        return safeCall(onFailure, resp||'response error');
      });
    } catch (e) {
      safeCall(onFailure, 'socket emit error');
    }
  };

  /**
     * @function publish
     * @instance
     * @desc This function publishes the local stream to the server. The stream should be a valid LocalStream instance. 'stream-added' event would be triggered when the stream is published successfully.
     <br><b>options:</b><br>
     {<br>
  maxVideoBW: xxx,<br>
  unmix: false/true, // if true, this stream would not be included in mix stream<br>
  videoCodec: 'h264'/'vp8' <br>
  transport: 'udp'/'tcp' // rtsp connection transport type, default 'udp'; only for rtsp input<br>
  bufferSize: integer number in bytes // udp receiving buffer size, default 2 MB; only for rtsp input (udp transport)<br>
  }
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {stream} stream Stream to publish.
     * @param {json} options Publish options.
     * @param {function} onSuccess(stream) (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  ...
  // ……
  client.publish(localStream, {maxVideoBW: 300}, function (st) {
      L.Logger.info('stream published:', st.id());
    }, function (err) {
      L.Logger.error('publish failed:', err);
    }
  );
  </script>
     */

  WoogeenConferenceBase.prototype.publish = function (stream, options, onSuccess, onFailure) {
    var self = this;
    stream = stream || {};
    if (typeof options === 'function') {
      onFailure = onSuccess;
      onSuccess = options;
      options = stream.bitRate;
    } else if (typeof options !== 'object' || options === null) {
      options = stream.bitRate;
    }
    if (!(stream instanceof Woogeen.LocalStream || stream instanceof Woogeen.ExternalStream) ||
          ((typeof stream.mediaStream !== 'object' || stream.mediaStream === null) &&
             stream.url() === undefined)) {
      return safeCall(onFailure, 'invalid stream');
    }

    if (self.localStreams[stream.id()] === undefined) { // not pulished
      var opt = stream.toJson();
      if (options.unmix === true) {
        opt.unmix = true;
      }
      if (stream.url() !== undefined) {
        opt.state = 'url';
        opt.transport = options.transport;
        opt.bufferSize = options.bufferSize;
        sendSdp(self.socket, 'publish', opt, stream.url(), function (answer, id) {
          if (answer !== 'success') {
            return safeCall(onFailure, answer);
          }
          stream.id = function () {
            return id;
          };
          stream.unpublish = function (onSuccess, onFailure) {
            self.unpublish(stream, onSuccess, onFailure);
          };
          self.localStreams[id] = stream;
          safeCall(onSuccess, stream);
        });
        return;
      }

      opt.state = 'erizo';
      sendSdp(self.socket, 'publish', opt, undefined, function (answer, id) {
        if (answer === 'error') {
          return safeCall(onFailure, id);
        }
        if (answer === 'timeout') {
          return safeCall(onFailure, answer);
        }
        stream.id = function () {
          return id;
        };
        self.localStreams[id] = stream;

        stream.channel = createChannel({
          callback: function (message) {
            console.log("Sending message", message);
            sendSdp(self.socket, 'signaling_message', {streamId: id, msg: message}, undefined, function () {});
          },
          video: stream.hasVideo(),
          audio: stream.hasAudio(),
          iceServers: self.getIceServers(),
          maxAudioBW: options.maxAudioBW,
          maxVideoBW: options.maxVideoBW,
          audioCodec: options.audioCodec,
          videoCodec: options.videoCodec
        });

        var onChannelReady = function () {
          stream.signalOnPlayAudio = function (onSuccess, onFailure) {
            sendCtrlPayload(self.socket, 'audio-out-on', id, onSuccess, onFailure);
          };
          stream.signalOnPauseAudio = function (onSuccess, onFailure) {
            sendCtrlPayload(self.socket, 'audio-out-off', id, onSuccess, onFailure);
          };
          stream.signalOnPlayVideo = function (onSuccess, onFailure) {
            sendCtrlPayload(self.socket, 'video-out-on', id, onSuccess, onFailure);
          };
          stream.signalOnPauseVideo = function (onSuccess, onFailure) {
            sendCtrlPayload(self.socket, 'video-out-off', id, onSuccess, onFailure);
          };
          stream.unpublish = function (onSuccess, onFailure) {
            self.unpublish(stream, onSuccess, onFailure);
          };
          safeCall(onSuccess, stream);
          onChannelReady = function () {};
          onChannelFailed = function () {};
        };
        var onChannelFailed = function () {
          sendMsg(self.socket, 'unpublish', id, function () {}, function () {}); // FIXME: still need this?
          stream.channel.close();
          stream.channel = undefined;
          safeCall(onFailure, 'peer connection failed');
          onChannelReady = function () {};
          onChannelFailed = function () {};
        };
        stream.channel.oniceconnectionstatechange = function (state) {
          switch (state) {
          case 'completed': // chrome
          case 'connected': // firefox
            onChannelReady();
            break;
          case 'checking':
          case 'closed':
            break;
          case 'failed':
            onChannelFailed();
            break;
          default:
            L.Logger.warning('unknown ice connection state:', state);
          }
        };

        stream.channel.addStream(stream.mediaStream);
        stream.channel.createOffer();
      });
    } else {
      return safeCall(onFailure, 'already published');
    }
  };

  /**
     * @function unpublish
     * @instance
     * @desc This function unpublishes the local stream. 'stream-removed' event would be triggered when the stream is removed from server.
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {stream} stream Stream to un-publish.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  ...
  // ……
  client.unpublish(localStream, function (st) {
      L.Logger.info('stream unpublished:', st.id());
    }, function (err) {
      L.Logger.error('unpublish failed:', err);
    }
  );
  </script>
     */

  WoogeenConferenceBase.prototype.unpublish = function (stream, onSuccess, onFailure) {
    var self = this;
    if (!(stream instanceof Woogeen.LocalStream || stream instanceof Woogeen.ExternalStream)) {
      return safeCall(onFailure, 'invalid stream');
    }
    sendMsg(self.socket, 'unpublish', stream.id(), function (err) {
      if (err) {return safeCall(onFailure, err);}
      if (stream.channel && typeof stream.channel.close === 'function') {
        stream.channel.close();
        stream.channel = null;
      }
      delete self.localStreams[stream.id()];
      stream.id = function () {return null;};
      stream.signalOnPlayAudio = undefined;
      stream.signalOnPauseAudio = undefined;
      stream.signalOnPlayVideo = undefined;
      stream.signalOnPauseVideo = undefined;
      delete stream.unpublish;
      safeCall(onSuccess, null);
    });
  };

  /**
     * @function subscribe
     * @instance
     * @desc This function subscribes to a remote stream. The stream should be a RemoteStream instance.
     <br><b>options:</b><br>
  {<br>
  video: true/false, {resolution: {width:xxx, height:xxx}},<br>
  audio: true/false,<br>
  videoCodec: 'h264'/'vp8'<br>
  }
  <br><b>Remarks:</b><br>
  Video resolution choice is only valid for subscribing {@link Woogeen.RemoteMixedStream Woogeen.RemoteMixedStream} when multistreaming output is enabled.　See {@link N.API.createRoom N.API.createRoom()} for detailed description of multistreaming.<br>
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {stream} stream Stream to subscribe.
     * @param {json} options (optional) Subscribe options.
     * @param {function} onSuccess(stream) (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  ...
  // ……
  client.subscribe(remoteStream, function (st) {
      L.Logger.info('stream subscribed:', st.id());
    }, function (err) {
      L.Logger.error('subscribe failed:', err);
    }
  );
  </script>
     */

  WoogeenConferenceBase.prototype.subscribe = function (stream, options, onSuccess, onFailure) {
    var self = this;
    var mediaStreamIsReady = false;
    var channelIsReady = false;
    if (typeof options === 'function') {
      onFailure = onSuccess;
      onSuccess = options;
      options = {};
    } else if (typeof options !== 'object' || options === null) {
      options = {};
    }
    if (!(stream instanceof Woogeen.RemoteStream)) {
      return safeCall(onFailure, 'invalid stream');
    }

    if (options.audio === false && options.video === false) {
      return safeCall(onFailure, 'no audio or video to subscribe.');
    }

    if (!stream.isMixed() && typeof options.video === 'object' && options.video.resolution){
      return safeCall(onFailure, 'Resolution setting is not available for non-mixed stream.');
    }

    sendSdp(self.socket, 'subscribe', {
      streamId: stream.id(),
      audio: stream.hasAudio() && (options.audio !== false),
      video: stream.hasVideo() && options.video,
      browser: getBrowser()
    }, undefined, function (answer, errText) {
      if (answer === 'error' || answer === 'timeout') {
        return safeCall(onFailure, errText || answer);
      }

      stream.channel = createChannel({
        callback: function (message) {
          sendSdp(self.socket, 'signaling_message', {
            streamId: stream.id(),
            msg: message,
            browser: stream.channel.browser
          }, undefined, function () {});
        },
        audio: stream.hasAudio() && (options.audio !== false),
        video: stream.hasVideo() && (options.video !== false),
        iceServers: self.getIceServers(),
        videoCodec: options.videoCodec
      });

      stream.channel.onaddstream = function (evt) {
        stream.mediaStream = evt.stream;
        if (navigator.appVersion.indexOf('Trident') > -1) {
          stream.pcid = evt.pcid;
        }
        if (channelIsReady && (mediaStreamIsReady === false)) {
          mediaStreamIsReady = true;
          safeCall(onSuccess, stream);
        } else {
          mediaStreamIsReady = true;
        }
      };
      var onChannelReady = function () {
        stream.signalOnPlayAudio = function (onSuccess, onFailure) {
          sendCtrlPayload(self.socket, 'audio-in-on', stream.id(), onSuccess, onFailure);
        };
        stream.signalOnPauseAudio = function (onSuccess, onFailure) {
          sendCtrlPayload(self.socket, 'audio-in-off', stream.id(), onSuccess, onFailure);
        };
        stream.signalOnPlayVideo = function (onSuccess, onFailure) {
          sendCtrlPayload(self.socket, 'video-in-on', stream.id(), onSuccess, onFailure);
        };
        stream.signalOnPauseVideo = function (onSuccess, onFailure) {
          sendCtrlPayload(self.socket, 'video-in-off', stream.id(), onSuccess, onFailure);
        };
        if (mediaStreamIsReady && (channelIsReady ===false)) {
          channelIsReady = true;
          safeCall(onSuccess, stream);
        } else {
          channelIsReady = true;
        }
        onChannelReady = function () {};
        onChannelFailed = function () {};
      };
      var onChannelFailed = function () {
        sendMsg(self.socket, 'unsubscribe', stream.id(), function () {}, function () {});
        stream.close();
        stream.signalOnPlayAudio = undefined;
        stream.signalOnPauseAudio = undefined;
        stream.signalOnPlayVideo = undefined;
        stream.signalOnPauseVideo = undefined;
        safeCall(onFailure, 'peer connection failed');
        onChannelReady = function () {};
        onChannelFailed = function () {};
      };
      stream.channel.oniceconnectionstatechange = function (state) {
        switch (state) {
        case 'completed': // chrome
        case 'connected': // firefox
          onChannelReady();
          break;
        case 'checking':
        case 'closed':
          break;
        case 'failed':
          onChannelFailed();
          break;
        default:
          L.Logger.warning('unknown ice connection state:', state);
        }
      };
      stream.channel.createOffer(true);
    });
  };

    /**
     * @function unsubscribe
     * @instance
     * @desc This function unsubscribes the remote stream.
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {stream} stream Stream to unsubscribe.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  ...
  // ……
  client.unsubscribe(remoteStream, function (st) {
      L.Logger.info('stream unsubscribed:', st.id());
    }, function (err) {
      L.Logger.error('unsubscribe failed:', err);
    }
  );
  </script>
     */

  WoogeenConferenceBase.prototype.unsubscribe = function (stream, onSuccess, onFailure) {
    var self = this;
    if (!(stream instanceof Woogeen.RemoteStream)) {
      return safeCall(onFailure, 'invalid stream');
    }
    sendMsg(self.socket, 'unsubscribe', stream.id(), function (err, resp) {
      if (err) {return safeCall(onFailure, err);}
      stream.close();
      stream.signalOnPlayAudio = undefined;
      stream.signalOnPauseAudio = undefined;
      stream.signalOnPlayVideo = undefined;
      stream.signalOnPauseVideo = undefined;
      safeCall(onSuccess, resp);
    });
  };

  /**
     * @function onMessage
     * @instance
     * @desc This function is the shortcut of on('message-received', callback).
  <br><b>Remarks:</b><br>Once the message is received, the callback is invoked.
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {function} callback callback function to the message.
     * @example
  <script type="text/JavaScript">
    ...
    // ……
    client.onMessage(function (event) {
      L.Logger.info('Message Received:', event.msg);
    });
  </script>
     */

  WoogeenConferenceBase.prototype.onMessage = function (callback) {
    if (typeof callback === 'function') {
      this.on('message-received', callback);
    }
  };

/**
 * @class Woogeen.ConferenceClient
 * @classDesc Provides connection, local stream publication, and remote stream subscription for a video conference. The conference client is created by the server side API. The conference client is retrieved by the client API with the access token for the connection.
 */

Woogeen.ConferenceClient = (function () {
  'use strict';
  var WoogeenConference = function WoogeenConference (spec) {
    WoogeenConferenceBase.call(this, spec);

/**
   * @function join
   * @instance
   * @desc This function establishes a connection to server and joins a certain　conference.
<br><b>Remarks:</b><br>
On success, successCallback is called (if provided); otherwise, failureCallback is called (if provided).
<br><b>resp:</b><br>
{<br>
 streams:, an array of remote streams that have been published in the conference.<br>
 users:, an array of users that have joined in the conference.<br>
}
   * @memberOf Woogeen.ConferenceClient
   * @param {string} token Token used to join conference room.
   * @param {function} onSuccess(resp) (optional) Success callback function.
   * @param {function} onFailure(err) (optional) Failure callback function.
   * @example
<script type="text/JavaScript">
conference.join(token, function(response) {...}, function(error) {...});
</script>
   */

    this.join = function (token, onSuccess, onFailure) {
      try {
        token = JSON.parse(L.Base64.decodeBase64(token));
      } catch (err) {
        return safeCall(onFailure, 'invalid token');
      }
      WoogeenConferenceBase.prototype.join.call(this, token, onSuccess, onFailure);
    };

/**
   * @function leave
   * @instance
   * @desc This function leaves conference and disconnects from server. Once it is done, 'server-disconnected' event would be triggered.
   * @memberOf Woogeen.ConferenceClient
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ......
conference.leave();
</script>
   */
    this.leave = function () {
      var evt = new Woogeen.ClientEvent({type: 'server-disconnected'});
      this.dispatchEvent(evt);
    };

      /**
     * @function send
     * @instance
     * @desc This function send message to conference room. The receiver should be a valid clientId, which is carried by 'user-joined' event; or default 0, which means send to all participants in the conference (broadcast) except himself.
     * @memberOf Woogeen.ConferenceClient
     * @param {string/function} data text message to send.
     * @param {string/function} receiver Receiver, optional, with default value 0.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.send(message, receiver, function () {
      L.Logger.info('mesage send success.');
    }, function (err) {
      L.Logger.error('send failed:', err);
    }
  );
  </script>
     */
    this.send = function (data, receiver, onSuccess, onFailure) {
      if (data === undefined || data === null || typeof data === 'function') {
        return safeCall(onFailure, 'nothing to send');
      }
      if (typeof receiver === 'undefined') {
        receiver = 'all';
      } else if (typeof receiver === 'string') {
        // supposed to be a valid receiverId.
        // pass.
      } else if (typeof receiver === 'function') {
        onFailure = onSuccess;
        onSuccess = receiver;
        receiver = 'all';
      } else {
        return safeCall(onFailure, 'invalid receiver');
      }
      sendMsg(this.socket, 'customMessage', {
        type: 'data',
        data: data,
        receiver: receiver
      }, function (err, resp) {
        if (err) {
          return safeCall(onFailure, err);
        }
        safeCall(onSuccess, resp);
      });
    };


  /**
     * @function mix
     * @instance
     * @desc This function tells server to add published LocalStream to mix stream.
     * @memberOf Woogeen.ConferenceClient
     * @param {LocalStream} stream LocalStream instance; it should be published before this call.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.mix(localStream, function () {
      L.Logger.info('success');
    }, function (err) {
      L.Logger.error('failed:', err);
    }
  );
  </script>
     */
    this.mix = function(stream, onSuccess, onFailure) {
      if (!(stream instanceof Woogeen.LocalStream)) {
        return safeCall(onFailure, 'invalid stream');
      }
      sendMsg(this.socket, 'addToMixer', stream.id(), function (err) {
        if (err) { return safeCall(onFailure, err); }
        safeCall(onSuccess, null);
      });
    };

  /**
     * @function unmix
     * @instance
     * @desc This function tells server to remove published LocalStream from mix stream.
     * @memberOf Woogeen.ConferenceClient
     * @param {stream} stream LocalStream instance; it should be published before this call.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.unmix(localStream, function () {
      L.Logger.info('success');
    }, function (err) {
      L.Logger.error('failed:', err);
    }
  );
  </script>
     */
    this.unmix = function(stream, onSuccess, onFailure) {
      if (!(stream instanceof Woogeen.LocalStream)) {
        return safeCall(onFailure, 'invalid stream');
      }
      sendMsg(this.socket, 'removeFromMixer', stream.id(), function (err) {
        if (err) { return safeCall(onFailure, err); }
        safeCall(onSuccess, null);
      });
    };


    /**
     * @function shareScreen
     * @instance
     * @desc This function creates a LocalStream from screen and publishes it to the　server.
     * @memberOf Woogeen.ConferenceClient
     * @param {string} options (optional) : extensionId, resolution, frameRate, maxVideoBW, videoCodec<br/>
        <ul>
          <li>extensionId is id of Chrome Extension for screen sharing.</li>
          <li>Valid resolution list:</li>
              <ul>
                  <li>'sif'</li>
                  <li>'vga'</li>
                  <li>'hd720p'</li>
                  <li>'hd1080p'</li>
                  <li>If not provided, the resolution is decided by the screen size.</li>
              </ul>
          <li>frameRate should be an array as [min_frame_rate, max_frame_rate], in which each element should be a proper number, e.g., [20, 30].</li>
          <li>maxVideoBW: xxx</li>
          <li>videoCodec: 'h264'/'vp8'</li>
        </ul>
        <br/>
     * @param {function} onSuccess(stream) (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback. See details about error definition in {@link Woogeen.LocalStream#create LocalStream.create}.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.shareScreen({ extensionId:'pndohhifhheefbpeljcmnhnkphepimhe', resolution: 'hd1080p', frameRate:[10,10], maxVideoBW:2000, videoCodec:'vp8'}, function (st) {
      L.Logger.info('screen shared:', st.id());
    }, function (err) {
      L.Logger.error('sharing failed:', err);
    }
  );
  </script>
     */
    this.shareScreen = function (option, onSuccess, onFailure) {
      var self = this;
      if (typeof option === 'function') {
        onFailure = onSuccess;
        onSuccess = option;
        option = {};
      }
      option = option || {};
      Woogeen.LocalStream.create({
        video: {
          device: 'screen',
          extensionId: option.extensionId,
          resolution: option.resolution ? option.resolution : {width:screen.width,height:screen.height},
          frameRate: option.frameRate
        },
        audio: false
      }, function (err, stream) {
        if (err) {
          return safeCall(onFailure, err);
        }
        self.publish(stream,{maxVideoBW:option.maxVideoBW, videoCodec:option.videoCodec},
          function (st) {
          safeCall(onSuccess, st);
        }, function (err) {
          safeCall(onFailure, err);
        });
      });
    };


  /**
     * @function playAudio
     * @desc This function tells server to continue sending/receiving audio data of the RemoteStream/LocalStream.
  <br><b>Remarks:</b><br>
  The audio track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published. playAudio with video only stream will succeed without any action.
     * @memberOf Woogeen.ConferenceClient
     * @param {WoogeenStream} stream instance.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @instance
     */
    this.playAudio = function(stream, onSuccess, onFailure) {
      if ((stream instanceof Woogeen.Stream) && stream.hasAudio() && typeof stream.signalOnPlayAudio === 'function') {
        return stream.signalOnPlayAudio(onSuccess, onFailure);
      }
      if (typeof onFailure === 'function') {
        onFailure('unable to call playAudio');
      }
    };

  /**
     * @function pauseAudio
     * @desc This function tells server to stop sending/receiving audio data of the subscribed RemoteStream/LocalStream.
  <br><b>Remarks:</b><br>
  Upon success, the audio of the stream would be hold, and you can call disableAudio() method to disable the audio track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published. puaseAudio with video only stream will succeed without any action.
     * @memberOf Woogeen.ConferenceClient
     * @param {WoogeenStream} stream instance.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @instance
     */
    this.pauseAudio = function(stream, onSuccess, onFailure) {
      if ((stream instanceof Woogeen.Stream) && stream.hasAudio() && typeof stream.signalOnPauseAudio === 'function') {
        return stream.signalOnPauseAudio(onSuccess, onFailure);
      }
      if (typeof onFailure === 'function') {
        onFailure('unable to call pauseAudio');
      }
    };

  /**
     * @function playVideo
     * @desc This function tells server to continue sending/receiving video data of the subscribed RemoteStream/LocalStream.
  <br><b>Remarks:</b><br>
  The video track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published. playVideo with audio only stream will succeed without any action.
     * @memberOf Woogeen.ConferenceClient
     * @param {WoogeenStream} stream instance.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @instance
     */
    this.playVideo = function(stream, onSuccess, onFailure) {
      if ((stream instanceof Woogeen.Stream) && stream.hasVideo() && typeof stream.signalOnPlayVideo === 'function') {
        return stream.signalOnPlayVideo(onSuccess, onFailure);
      }
      if (typeof onFailure === 'function') {
        onFailure('unable to call playVideo');
      }
    };

  /**
     * @function pauseVideo
     * @desc This function tells server to stop sending/receiving video data of the subscribed RemoteStream/LocalStream.
  <br><b>Remarks:</b><br>
  Upon success, the video of the stream would be hold, and you can call disableVideo() method to disable the video track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published. pauseVideo with audio only stream will succeed without any action.
     * @memberOf Woogeen.ConferenceClient
     * @param {WoogeenStream} stream instance.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @instance
     */
    this.pauseVideo = function(stream, onSuccess, onFailure) {
      if ((stream instanceof Woogeen.Stream) && stream.hasVideo() && typeof stream.signalOnPauseVideo === 'function') {
        return stream.signalOnPauseVideo(onSuccess, onFailure);
      }
      if (typeof onFailure === 'function') {
        onFailure('unable to call pauseVideo');
      }
    };

  /**
     * @function addExternalOutput
     * @instance
     * @desc This function starts streaming corresponding media stream in the conference room to a specified target.
     <b>options:</b><br>
     {<br>
    streamId: xxxxxx,<br>
    }
     * @memberOf Woogeen.ConferenceClient
     * @param {string} url Target URL.
     * @param {string} options External output options.<br>
      <ul>
     <li>streamId: stream id to be streamed. (optional, if unspecified, the mixed stream will be streamed by default)</li>
     <li>resolution: an json object with format {width:xxx,height:xxx} or a string like 'vga'.
        Retrieve resolution information of a mixed stream: <code>stream.resolutions()</code>.
       (optional)</li>
     </ul>
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.addExternalOutput(url: 'rtsp://localhost:1935/live', {streamId: xxx
  }, function () {
    L.Logger.info('Start external streaming success.');
  }, function (err) {
    L.Logger.error('Start external streaming failed:', err);
  });
  </script>
     */
    this.addExternalOutput = function (url, options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }
      options.url = url;

      sendMsg(self.socket, 'addExternalOutput', options, function (err) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess);
      });
    };

  /**
     * @function updateExternalOutput
     * @instance
     * @desc This function updates target URL's content with specified stream.
     <b>options:</b><br>
     {<br>
    streamId: xxxxxx,<br>
    }
     * @memberOf Woogeen.ConferenceClient
     * @param {string} url Target URL.
     * @param {string} options External output options.<br>
      <ul>
     <li>streamId: stream id to be streamed. (optional, if unspecified, the mixed stream will be streamed by default)</li>
     <li>resolution: an json object with format {width:xxx,height:xxx} or a string like 'vga'.
        Retrieve resolution information of a mixed stream: <code>stream.resolutions()</code>.
       (optional)</li>
     </ul>
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.updateExternalOutput(url: 'rtsp://localhost:1935/live', {streamId: xxx
  }, function () {
    L.Logger.info('Update external streaming success.');
  }, function (err) {
    L.Logger.error('Update external streaming failed:', err);
  });
  </script>
     */
    this.updateExternalOutput = function (url, options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }
      options.url = url;

      sendMsg(self.socket, 'updateExternalOutput', options, function (err) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess);
      });
    };

  /**
     * @function removeExternalOutput
     * @instance
     * @desc This function stops streaming media stream in the conference room to specified URL.
     <br><b>options:</b><br>
  {<br>
    id: xxxxxx<br>
  }
     * @memberOf Woogeen.ConferenceClient
     * @param {string} url (required) Target URL.
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.removeExternalOutput({id: rtspIdToStop}, function () {
    L.Logger.info('Stop external streaming success.');
  }, function (err) {
    L.Logger.error('Stop external streaming failed:', err);
  });
  </script>
   */
    this.removeExternalOutput = function (url, onSuccess, onFailure) {
      var self = this;
      if (typeof url !== 'string') {
        safeCall(onFailure, 'URL should be string.');
        return;
      }
      sendMsg(self.socket, 'removeExternalOutput', {url: url}, function (err) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess);
      });
    };

  /**
     * @function startRecorder
     * @instance
     * @desc This function starts the recording of a video stream and an audio stream in the conference room and saves it to a .mkv file, according to the configurable "recording.path" in agent.toml file.<br>
  Three events are defined for media recording: 'recorder-added' for the creation of media recorder; 'recorder-removed' for the removal of media recorder; 'recorder-continued' for the continuous recording.
     <br><b>options:</b><br>
     {<br>
    videoStreamId: xxxxxx,<br>
    audioStreamId: yyyyyy,<br>
    videoCodec: 'vp8'/'h264',<br>
    audioCodec: 'pcmu'/'opus',<br>
    recorderId: zzzzzz<br>
    }
     * @memberOf Woogeen.ConferenceClient
     * @param {string} options (optional)Media recorder options. If unspecified, the mixed stream will be recorded as default.<br>
      <ul>
     <li>videoStreamId: video stream id to be recorded. If unspecified and audioStreamId is valid, audio stream will be recorded without video.</li>
     <li>audioStreamId: audio stream id to be recorded. If unspecified and videoStreamId is valid, video stream will be recorded without audio.</li>
     <li>videoCodec: preferred video codec to be recorded. If unspecified, 'vp8' will be used by default. Currently, there is no video transcoding for forward stream with the consideration of system load.</li>
     <li>audioCodec: preferred audio codec to be recorded. If unspecified, 'pcmu' will be used by default.</li>
     <li>recorderId: recorder id to be reused.</li>
     </ul>
     Important Note: In the case of continuous media recording among different streams, the recorderId is the key to make sure each switched stream go to the same recording url. Do not stop the recorder when you want the continuous media recording functionality, unless all the required media content has been recorded successfully.<br>
  The recommendation is to invoke another startRecorder with new videoStreamId and audioStreamId (default to mixed stream) right after the previous call of startRecorder, but the same recorderId should be kept.
  Another important thing is that the storage availability of the recording path needs to be guaranteed when using media recording.
     * @param {function} onSuccess(resp) (optional) Success callback. The following information will be
   returned as well:<br>
      <ul>
     <li>recorderId: recorder id.</li>
     <li>host: Host server address.</li>
     <li>path: Recorded file path </li>
     </ul>
     * @param {function} onFailure(err) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.startRecorder({videoStreamId: videoStreamIdToRec, audioStreamId: audioStreamIdToRec, videoCodec: 'h264', audioCodec: 'pcmu'}, function (file) {
      L.Logger.info('Stream recording with recorder ID: ', file.recorderId);
    }, function (err) {
      L.Logger.error('Media recorder failed:', err);
    }
  );
  </script>
     */
    this.startRecorder = function (options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }

      sendMsg(self.socket, 'startRecorder', options, function (err, resp) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess, resp);
      });
    };

  /**
     * @function stopRecorder
     * @instance
     * @desc This function stops the recording of a video stream and an audio stream in the conference room and saves it to a .mkv file, according to the configurable "recording.path" in agent.toml file.
     <br><b>options:</b><br>
  {<br>
    recorderId: xxxxxx<br>
  }
     * @memberOf Woogeen.ConferenceClient
     * @param {string} options (required) Media recording options. recorderId: recorder id to be stopped.
     * @param {function} onSuccess(resp) (optional) Success callback. The following information will be returned as well:
     <ul>
     <li>host: Host server address.</li>
     <li>recorderId: recorder id.</li>
     </ul>
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ……
  conference.stopRecorder({recorderId: recorderIdToStop}, function (file) {
      L.Logger.info('Stream recorded with recorder ID: ', file.recorderId);
    }, function (err) {
      L.Logger.error('Media recorder cannot stop with failure: ', err);
    }
  );
  </script>
   */
    this.stopRecorder = function (options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }

      sendMsg(self.socket, 'stopRecorder', options, function (err, resp) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess, resp);
      });
    };

  /**
     * @function getRegion
     * @instance
     * @desc This function gets the region ID of the given stream in the mixed stream.
     <br><b>options:</b><br>
  {<br>
    id: 'the stream id'<br>
  }
     * @memberOf Woogeen.ConferenceClient
     * @param {json} options getRegion options.
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ......
  conference.getRegion({id: 'streamId'}, function (resp) {
      L.Logger.info('Region for streamId: ', resp.region);
    }, function (err) {
      L.Logger.error('getRegion failed:', err);
    }
  );
  </script>
   */
    this.getRegion = function (options, onSuccess, onFailure) {
      var self = this;
      if (typeof options !== 'object' || options === null ||
          typeof options.id !== 'string' || options.id === '') {
        return safeCall(onFailure, 'invalid options');
      }

      sendMsg(self.socket, 'getRegion', {id: options.id}, function (err, resp) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess, resp);
      });
    };

  /**
     * @function setRegion
     * @instance
     * @desc This function sets the region for the given stream in the mixed stream with the given region id.
     <br><b>options:</b><br>
  {<br>
    id: 'the stream id'<br>
    region: 'the region id'<br>
  }
     * @memberOf Woogeen.ConferenceClient
     * @param {json} options setRegion options.
     * @param {function} onSuccess() (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ......
  conference.setRegion({id: 'streamId', region: 'regionId'}, function () {
      L.Logger.info('setRegion succeeded');
    }, function (err) {
      L.Logger.error('setRegion failed:', err);
    }
  );
  </script>
   */
    this.setRegion = function (options, onSuccess, onFailure) {
      var self = this;
      if (typeof options !== 'object' || options === null ||
          typeof options.id !== 'string' || options.id === '' ||
          typeof options.region !== 'string' || options.region === '') {
        return safeCall(onFailure, 'invalid options');
      }

      sendMsg(self.socket, 'setRegion', {id: options.id, region: options.region}, function (err, resp) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess, resp);
      });
    };

  /**
     * @function setVideoBitrate
     * @instance
     * @desc This function sets the video bitrate (kbps) for the given participant. Currently it works only if the participant's video stream is being mixed in the conference.
  <br><b>Remarks:</b><br>
  This method also depends on whether client side support dynamically video stream bitrate change, now only Chrome browser is verified to be workable.
     <br><b>options:</b><br>
  {<br>
    id: 'the participant id'<br>
    bitrate: an integer value with the unit in kbps, e.g., 300<br>
  }
     * @memberOf Woogeen.ConferenceClient
     * @param {json} options setVideoBitrate options.
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ......
  conference.setVideoBitrate({id: 'participantId', bitrate: 300}, function (resp) {
      L.Logger.info('setVideoBitrate succeeds for participantId: ', resp);
    }, function (err) {
      L.Logger.error('setVideoBitrate failed:', err);
    }
  );
  </script>
   */
    this.setVideoBitrate = function (options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }

      sendMsg(self.socket, 'setVideoBitrate', options, function (err, resp) {
        if (err) {return safeCall(onFailure, err);}
        safeCall(onSuccess, resp);
      });
    };

  /**
     * @function getConnectionStats
     * @instance
     * @desc This function gets statistic information about the given stream and its associated connection.
     * @memberOf Woogeen.ConferenceClient
     * @param {WoogeenStream} stream Stream instance.
     * @param {function} onSuccess(stats) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
  // ......
  conference.getConnectionStats(stream, function (stats) {
      L.Logger.info('Statistic information: ', stats);
    }, function (err) {
      L.Logger.error('Get statistic information failed:', err);
    }
  );
  </script>
   */
    this.getConnectionStats = function (stream, onSuccess, onFailure) {
      if (stream.channel && typeof stream.channel.getConnectionStats === 'function') {
        stream.channel.getConnectionStats(function(stats){
          safeCall(onSuccess, stats);
        }, function(err){
          safeCall(onFailure, err);
        });
      } else {
        safeCall(onFailure, 'invalid stream.');
      }
    };
  };

  WoogeenConference.prototype = Object.create(WoogeenConferenceBase.prototype); // make WoogeenConference a WoogeenConferenceBase
  WoogeenConference.prototype.constructor = WoogeenConference;

/**
   * @function create
   * @desc This factory returns a Woogeen.ConferenceClient instance.
   * @memberOf Woogeen.ConferenceClient
   * @static
   * @return {Woogeen.ConferenceClient} An instance of Woogeen.ConferenceClient.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
</script>
   */
  WoogeenConference.create = function factory (spec) { // factory, not in prototype
    return new WoogeenConference(spec);
  };
  return WoogeenConference;
}());


/**
 * @class Woogeen.SipClient
 * @classDesc Provides to initiate, accept, reject and hangup a sip audio or video call.
 */

Woogeen.SipClient = (function () {

  var WoogeenSipGateway = function WoogeenSipGateway (spec) {
    WoogeenConferenceBase.call(this, spec);
    this.sip = true;

/**
   * @function join
   * @instance
   * @desc This function establishes a connection to sip server and joins a certain conference.
<br><b>Remarks:</b><br>
On success, onSuccess is called (if provided); otherwise, onFailure is called (if provided).
<br><b>resp:</b><br>
   * @memberOf Woogeen.SipClient
   * @param {array} userInfo The sip user information with the structure {display_name:, sip_name:, sip_password:, sip_server:}.
   * @param {function} onSuccess(resp) (optional) Success callback function.
   * @param {function} onFailure(err) (optional) Failure callback function.
   * @example
<script type="text/JavaScript">
 var userInfo = {
          display_name: $('input#display_name').val(),
          sip_name:      $('input#sip_name').val(),
          sip_password: $('input#sip_password').val(),
          sip_server:   $('input#sip_server').val()
 };
 sipClient.join(userInfo, function(msg){}, function(error){});
</script>
   */

    this.join = function (token, onSuccess, onFailure) {
      token.host = this.spec.host;
      token.secure = this.spec.secure;
      WoogeenConferenceBase.prototype.join.call(this, token, onSuccess, onFailure);
    };

    this.subscribe = function (stream, options, onSuccess, onFailure) {
      var self = this;
      if (typeof options === 'function') {
        onFailure = onSuccess;
        onSuccess = options;
        options = {};
      } else if (typeof options !== 'object' || options === null) {
        options = {};
      }
      var subscribeSuccess = function(stream) {
        self.dispatchEvent(new Woogeen.StreamEvent({type: 'stream-subscribed', stream: stream}));
        onSuccess(stream);
      };
      WoogeenConferenceBase.prototype.subscribe.call(this, stream, options, subscribeSuccess, onFailure);
    };
    /**
     * @function acceptCall
     * @instance
     * @desc Accept the sip call to respond to a incoming call.
     * @memberOf Woogeen.SipClient
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
<script type="text/JavaScript">
sipClient.acceptCall(function(msg){});
</script>
   */
    this.acceptCall = function (onSuccess, onFailure) {
      var self = this;
      var payload = {
        type: 'acceptCall',
      };
      sendMsg(self.socket, 'customMessage', payload, function(err, resp) {
      if (err) {
        return safeCall(onFailure, err);
      }
      safeCall(onSuccess, resp);
      });
    };

    /**
     * @function rejectCall
     * @instance
     * @desc Reject the sip call to respond to a incoming call.
     * @memberOf Woogeen.SipClient
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
<script type="text/JavaScript">
sipClient.rejectCall(function(msg){});
</script>
*/
    this.rejectCall = function (onSuccess, onFailure) {
      var self = this;
      var payload = {
        type: 'rejectCall',
      };
      sendMsg(self.socket, 'customMessage', payload, function(err, resp) {
      if (err) {
        return safeCall(onFailure, err);
      }
      safeCall(onSuccess, resp);
      });
    };
    /**
     * @function hangupCall
     * @instance
     * @desc Hangup the sip call after the sip call established.
     * @memberOf Woogeen.SipClient
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
     <script type="text/JavaScript">
     sipClient.hangupCall(function(msg){});
     </script>
     */
    this.hangupCall = function (onSuccess, onFailure) {
      var self = this;
      var payload = {
        type: 'hangupCall',
      };
      sendMsg(self.socket, 'customMessage', payload, function(err, resp) {
      if (err) {
        return safeCall(onFailure, err);
      }
      safeCall(onSuccess, resp);
      });
    };
    /**
     * @function makeCall
     * @instance
     * @desc Initiate a sip call.
     * @memberOf Woogeen.SipClient
     * @param {array} callee The option of the callee with the structure {calleeURI:, audio:, video:}.
     * @param {function} onSuccess(resp) (optional) Success callback.
     * @param {function} onFailure(error) (optional) Failure callback.
     * @example
  <script type="text/JavaScript">
        var option = {
            calleeURI: $('input#calleeURI').val(),
            audio: true,
            video: true
        };
        sipclient.makeCall(option, function(msg));
  </script>
   */
    this.makeCall = function (callee, onSuccess, onFailure) {
      var self = this;
      var payload = {
        type: 'makeCall',
        payload: callee
      };
      sendMsg(self.socket, 'customMessage', payload, function(err, resp) {
        if (err) {
          return safeCall(onFailure, err);
        }
        safeCall(onSuccess, resp);
      });
    };
  };
  WoogeenSipGateway.prototype = Object.create(WoogeenConferenceBase.prototype); // make WoogeenConference a eventDispatcher
  WoogeenSipGateway.prototype.constructor = WoogeenSipGateway;
   /**
   * @function create
   * @desc This factory returns a Woogeen.SipClient instance.
   * @memberOf Woogeen.SipClient
   * @static
   * @return {Woogeen.SipClient} An instance of Woogeen.SipClient.
   * @example
<script type="text/JavaScript">
var gateway_host = location.hostname;
var isSecured = window.location.protocol === 'https:';
if (isSecured) {
  gateway_host += ':8443';
} else {
  gateway_host += ':8080';
}
sipClient = Woogeen.SipClient.create({
    host: gateway_host,
    secure: isSecured,
  });
</script>
   */
  WoogeenSipGateway.create = function factory (spec) { // factory, not in prototype
    return new WoogeenSipGateway(spec);
  };
  return WoogeenSipGateway;
}());

}());
