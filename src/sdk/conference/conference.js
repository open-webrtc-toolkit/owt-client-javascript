/* global io */
(function() {

  const protocolVersion = '1.0';

  function safeCall() {
    var callback = arguments[0];
    if (typeof callback === 'function') {
      var args = Array.prototype.slice.call(arguments, 1);
      callback.apply(null, args);
    }
  }

  var getBrowser = function() {
    var browser = "none";

    if (window.navigator.userAgent.match("Firefox") !== null) {
      // Firefox
      browser = "mozilla";
    } else if (window.navigator.userAgent.match("Bowser") !== null) {
      browser = "bowser";
    } else if (window.navigator.userAgent.match(/Edge\/(\d+).(\d+)$/) !==
      null) {
      browser = "edge";
    } else if (window.navigator.userAgent.match("Chrome") !== null) {
      if (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >=
        26) {
        browser = "chrome-stable";
      }
    } else if (window.navigator.userAgent.match("Safari") !== null) {
      browser = "chrome-stable";
    } else if (window.navigator.userAgent.match("WebKit") !== null) {
      browser = "chrome-stable";
    }

    return browser;
  };

  function createChannel(spec) {
    spec.session_id = (Woogeen.sessionId += 1);
    var that = {};

    that.browser = getBrowser();
    if (that.browser === 'mozilla') {
      L.Logger.debug("Firefox Stack");
      that = Erizo.FirefoxStack(spec);
    } else if (that.browser === 'bowser') {
      L.Logger.debug("Bowser Stack");
      that = Erizo.BowserStack(spec);
    } else if (that.browser === 'chrome-stable') {
      L.Logger.debug("Stable!");
      that = Erizo.ChromeStableStack(spec);
    } else if (that.browser === 'edge') {
      L.Logger.debug("Edge Stack");
      that = Erizo.EdgeORTCStack(spec);
    } else {
      L.Logger.debug("None!");
      throw "WebRTC stack not available";
    }
    if (!that.updateSpec) {
      that.updateSpec = function(newSpec, callback) {
        L.Logger.error(
          "Update Configuration not implemented in this browser");
        if (callback) {
          callback("unimplemented");
        }
      };
    }

    return that;
  }

  function createRemoteStream(streamInfo) {
    if (streamInfo.type === 'mixed') {
      return new Woogeen.RemoteMixedStream(streamInfo);
    } else {
      return new Woogeen.RemoteStream(streamInfo);
    }
  }

  function sendMsg(socket, type, message, callback) {
    if (!socket || !socket.connected) {
      return callback('socket not ready');
    }
    try {
      socket.emit(type, message, function(resp, mesg) {
        if (resp === 'success') {
          return callback(null, mesg);
        }
        return callback(mesg || 'response error');
      });
    } catch (err) {
      callback('socket emit error');
    }
  }

  function mixOrUnmix(verb, signaling, stream, targetStreams, onSuccess,
    onFailure) {
    if (!(stream instanceof Woogeen.Stream) && !(stream instanceof Woogeen.ExternalStream)) {
      return safeCall(onFailure, 'Invalid stream');
    }
    if (!Array.isArray(targetStreams)) {
      return safeCall(onFailure, 'Target streams is not a list');
    }
    var operationPromises = [];
    var i, targetStream;
    for (i = 0; i < targetStreams.length; i++) {
      targetStream = targetStreams[i];
      if (!(targetStream instanceof Woogeen.RemoteMixedStream)) {
        return safeCall(onFailure, 'Invalid stream found in targetStreams.');
      }
      operationPromises.push(signaling.sendMessage('stream-control', {
        id: stream.id(),
        operation: verb,
        data: targetStream.viewport()
      }));
    }
    Promise.all(operationPromises).then(() => {
      return safeCall(onSuccess, null);
    }, (err) => {
      return safeCall(onFailure, err);
    });
  }

  function playOrPause(verb, signaling, stream, trackKind, onSuccess, onFailure) {
    if (!(stream instanceof Woogeen.Stream)) {
      safeCall(onFailure, 'Invalid stream');
    }
    if (trackKind !== undefined && trackKind !== 'audio' && trackKind !==
      'video') {
      safeCall(onFailure, 'Invalid track kind.');
    }
    var track = trackKind || 'av';
    signaling.sendMessage('stream-control', {
      id: stream.id(),
      operation: verb,
      data: track
    }).then(() => {
      safeCall(onSuccess);
    }, (err) => {
      safeCall(onFailure, err);
    });
  }

  const resolutionName2Value = {
    'cif': {width: 352, height: 288},
    'vga': {width: 640, height: 480},
    'svga': {width: 800, height: 600},
    'xga': {width: 1024, height: 768},
    'r640x360': {width: 640, height: 360},
    'hd720p': {width: 1280, height: 720},
    'sif': {width: 320, height: 240},
    'hvga': {width: 480, height: 320},
    'r480x360': {width: 480, height: 360},
    'qcif': {width: 176, height: 144},
    'r192x144': {width: 192, height: 144},
    'hd1080p': {width: 1920, height: 1080},
    'uhd_4k': {width: 3840, height: 2160},
    'r360x360': {width: 360, height: 360},
    'r480x480': {width: 480, height: 480},
    'r720x720': {width: 720, height: 720}
  };

  var DISCONNECTED = 0,
    CONNECTING = 1,
    CONNECTED = 2;

  var WoogeenConferenceBase = function WoogeenConferenceBase(spec) {
    spec = spec || {};
    this.internalDispatcher = Woogeen.EventDispatcher({});
    this.spec = {};
    this.remoteStreams = {};
    this.localStreams = {};
    this.subscriptionToStream = {};  // Maps from subscription ID to stream.
    this.streamIdToSubscriptionId = {};
    this.state = DISCONNECTED;
    // For backward compatible. Mix published stream to this viewport.
    this.commonMixedStream = null;
    this.participants = [];
    this.externalUrlToSubscriptionId = {};
    this.recorderCallbacks = {};  // Key is subscription ID, value is an object with onSuccess and onFailure function.
    this.publicationCallbacks = {}; // Key is publication ID, value is an object {connection: boolean, ack: boolean}.
    this.subscriptionCallbacks = {}; // Key is subscription ID, value is an object {stream: boolean, connection: ack, ack: boolean}.

    if (spec.iceServers) {
      this.spec.userSetIceServers = spec.iceServers;
    }
  };

  WoogeenConferenceBase.prototype = Woogeen.EventDispatcher({}); // make WoogeenConferenceBase a eventDispatcher

  WoogeenConferenceBase.prototype.getIceServers = function() {
    return this.spec.userSetIceServers;
  };

  WoogeenConferenceBase.prototype.join = function(tokenString, onSuccess,
    onFailure) {
    var token;
    try {
      token = JSON.parse(L.Base64.decodeBase64(tokenString));
    } catch (err) {
      return safeCall(onFailure, 'invalid token');
    }
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

    self.state = CONNECTING;

    const loginInfo = {
      token: tokenString,
      userAgent: Woogeen.Common.sysInfo(),
      protocol: protocolVersion
    };
    self.signaling = Woogeen.ConferenceSioSignaling.create();
    self.signaling.connect(host, isSecured, loginInfo).then((resp) => {
      self.state = CONNECTED;
      self.myId = resp.user;
      self.participantId = resp.id;
      let room = resp.room;
      let streams = [];
      if (room.streams !== undefined) {
        streams = room.streams.map(function(st) {
          if (st.type === 'mixed') {
            st.viewport = st.info.label;
          }
          self.remoteStreams[st.id] = createRemoteStream(st);
          if (st.viewport === 'common') {
            self.commonMixedStream = self.remoteStreams[st.id];
          }
          return self.remoteStreams[st.id];
        });
      }
      var me;
      if (resp.users !== undefined) {
        for (var i = 0; i < resp.users.length; i++) {
          if (resp.users[i].id === resp.clientId) {
            me = resp.users[i];
            break;
          }
        }
      }
      self.signaling.on('stream', function(data) {
        data = data.msg;
        let stream;
        let evt;
        switch (data.status) {
          case 'add':
            const streamInfo = data.data;
            if (self.remoteStreams[streamInfo.id] !== undefined) {
              L.Logger.warning('Stream was already added:', streamInfo.id);
              return;
            }
            stream = createRemoteStream(streamInfo);
            evt = new Woogeen.StreamEvent({
              type: 'stream-added',
              stream: stream
            });
            self.remoteStreams[streamInfo.id] = stream;
            self.dispatchEvent(evt);
            break;
          case 'remove':
            stream = self.remoteStreams[data.id];
            if (stream) {
              stream.close(); // >removeStream<
              delete self.remoteStreams[data.id];
              evt = new Woogeen.StreamEvent({
                type: 'stream-removed',
                stream: stream
              });
              self.dispatchEvent(evt);
            }
            break;
          case 'update':
            stream = self.remoteStreams[data.id];
            if (!stream) {
              L.Logger.warning('Invalid stream ID.');
              return;
            }
            switch (data.data.field) {
              case 'video.layout':
                stream.emit('VideoLayoutChanged', data.data.value);
                break;
              case 'audio.status':
                if (data.data.value === 'active') {
                  stream.emit('AudioEnabled');
                } else if (data.data.value === 'inactive') {
                  stream.emit('AudioDisabled');
                } else {
                  L.Logger.warning('Invalid stream event.');
                }
                break;
              case 'video.status':
                if (data.data.value === 'active') {
                  stream.emit('VideoEnabled');
                } else if (data.data.value === 'inactive') {
                  stream.emit('VideoDisabled');
                } else {
                  L.Logger.warning('Invalid stream event.');
                }
                break;
              default:
                L.Logger.warning('Unknown message from MCU.');
                break;
            }
            break;
          default:
            L.Logger.warning('Received unknown stream notification.');
            break;
        }
      });
      self.signaling.on('progress', function(arg) {
        arg = arg.msg;
        let stream = self.subscriptionToStream[arg.id];
        if (!stream) {
          stream = self.localStreams[arg.id];
        }
        if (!stream && !self.recorderCallbacks[arg.id]) {
          L.Logger.warning('Cannot find associated stream.');
          return;
        }
        if (arg.status === 'soac' && stream && stream.channel) {
          stream.channel.processSignalingMessage(arg.data);
        } else if (arg.status === 'ready') {
          if (self.recorderCallbacks[arg.id]) { // Recording.
            if (self.commonMixedStream) {
              self.mix(self.localStreams[arg.id], [self.commonMixedStream]);
            }
            safeCall(self.recorderCallbacks[arg.id].onSuccess, {
              recorderId: arg.id,
              host: arg.data.host,
              path: arg.data.file
            });
            delete self.recorderCallbacks[arg.id];
          } else if (self.publicationCallbacks[arg.id]) {
            if (self.commonMixedStream) {
              self.mix(stream, [self.commonMixedStream]);
            }
            safeCall(self.publicationCallbacks[arg.id].onSuccess, stream);
            delete self.publicationCallbacks[arg.id];
          } else if (self.subscriptionCallbacks[arg.id]) {
            safeCall(self.subscriptionCallbacks[arg.id].onSuccess, stream);
            delete self.subscriptionCallbacks[arg.id];
          }
        } else if (arg.status === 'error') {
          if (self.recorderCallbacks[arg.id]) {
            safeCall(self.recorderCallbacks[arg.id].onFailure, arg.data);
            delete self.recorderCallbacks[arg.id];
          } else if (self.publicationCallbacks[arg.id]) {
            safeCall(self.publicationCallbacks[arg.id].onFailure, arg.data);
            delete self.publicationCallbacks[arg.id];
          } else if (self.subscriptionCallbacks[arg.id]) {
            safeCall(self.subscriptionCallbacks[arg.id].onFailure, arg.data);
            delete self.subscriptionCallbacks[arg.id];
          }
        }
      });
      self.signaling.on('text', function(data) {
        var evt = new Woogeen.MessageEvent({
          type: 'message-received',
          msg: data.message
        });
        self.dispatchEvent(evt);
      });
      self.signaling.on('participant', (data)=>{
        data = data.msg;
        let participant;
        let evt;
        switch (data.action) {
          case 'join':
            participant = {
              id: data.data.id,
              role: data.data.role,
              name: data.data.user
            };
            self.participants[participant.id] = participant;
            evt = new Woogeen.ClientEvent({
              type: 'user-joined',
              user: participant
            });
            self.dispatchEvent(evt);
            break;
          case 'leave':
            participant = self.participants[data.data.id];
            if (!participant) {
              return;
            }
            evt = new Woogeen.ClientEvent({
              type: 'user-left',
              user: participant
            });
            delete self.participants[data.data.id];
            self.dispatchEvent(evt);
            break;
          default:
            L.Logger.warning('Received unknown message.');
        }
      });
      return safeCall(onSuccess, {
        streams: streams,
        users: resp.users,
        self: me
      });
    }, (e) => {
      return safeCall(onFailure, e || 'response error');
    });
  };

  /**
     * @function publish
     * @instance
     * @desc This function publishes the local stream to the server. The stream should be a valid LocalStream instance. 'stream-added' event would be triggered when the stream is published successfully. 'stream-failed' event may be triggered if there is internal error happend in MCU after publishing or connection is broken.
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {LocalStream or ExternalStream} stream Stream to publish.
     * @param {json} options Publish options. Following properties are supported:<br>
      <ul>
        <li>maxAudioBW: xxx. It does not work on Edge.</li>
        <li>maxVideoBW: xxx. It does not work on Edge.</li>
        <li>audioCodec: 'opus'/'pcmu'/'pcma'. Preferred audio codec.</li>
        <li>videoCodec: 'h264'/'vp8'/'vp9'. Preferred video codec. H.264 is the default preferred codec. Note for Firefox VP9 is not stable, so please do not specify VP9 for Firefox.</li>
        <li>transport: 'udp'/'tcp'. RTSP connection transport type, default 'udp'; only for RTSP input.</li>
        <li>bufferSize: integer number in bytes. UDP receiving buffer size, default 2 MB. Only for RTSP input (UDP transport).</li>
      </ul>
      Each codec has its own supported bitrate range. Setting incorrect maxAudioBW/maxVideoBW value may lead to connection failure. Bandwidth settings don't work on FireFox.
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

  WoogeenConferenceBase.prototype.publish = function(stream, options,
    onSuccess, onFailure) {
    var self = this;
    stream = stream || {};
    if (typeof options === 'function') {
      onFailure = onSuccess;
      onSuccess = options;
    } else if (typeof options !== 'object' || options === null) {
      options = {};
    }
    if (!(stream instanceof Woogeen.LocalStream || stream instanceof Woogeen
        .ExternalStream) ||
      ((typeof stream.mediaStream !== 'object' || stream.mediaStream ===
          null) &&
        stream.url() === undefined)) {
      return safeCall(onFailure, 'invalid stream');
    }
    options.videoCodec = options.videoCodec || 'h264';

    if (self.localStreams[stream.id()] === undefined) { // not published
      var streamOpt = stream.toJson();
      if (options.unmix === true) {
        streamOpt.unmix = true;
      }
      if (stream.url() !== undefined) {
        let connectionOpt = {};
        connectionOpt.url = stream.url();
        connectionOpt.transport = options.transport;
        connectionOpt.bufferSize = options.bufferSize;

        let streamingInMediaOptions = {audio: 'auto', video: 'auto'};

        self.signaling.sendMessage('publish', {
          type: 'streaming',
          connection: connectionOpt,
          media: streamingInMediaOptions,
          attributes: stream.attributes()
        }).then((data) => {
          const id = data.id;
          stream.id = function() {
            return id;
          };
          self.localStreams[id] = stream;
          safeCall(onSuccess, stream);
        }, (err)=>{
          safeCall(onFailure, err);
        });
        return;
      }

      let mediaOptions = {};
      if (stream.hasAudio()) {
        mediaOptions.audio = {};
        if (typeof streamOpt.audio === 'object') {
          mediaOptions.audio.source = streamOpt.audio.source;
        } else {
          mediaOptions.audio.source = 'mic';
        }
      } else {
        mediaOptions.audio = false;
      }
      if (stream.hasVideo()) {
        mediaOptions.video = {};
        if (stream.isScreen()) {
          mediaOptions.video.source = 'screen-cast';
        } else {
          mediaOptions.video.source = 'camera';
        }
      } else {
        mediaOptions.video = false;
      }
      self.signaling.sendMessage('publish', {
        type: 'webrtc',
        connection: undefined,
        media: mediaOptions,
        attributes: stream.attributes()
      }).then((data) => {
        const id = data.id;
        stream.id = function() {
          return id;
        };
        self.publicationCallbacks[id] = {
          onSuccess: onSuccess,
          onFailure: onFailure
        };
        self.localStreams[id] = stream;
        stream.channel = createChannel({
          callback: function(message) {
            console.log("Sending message", message);
            self.signaling.sendMessage('soac', {
              id: id,
              signaling: message
            });
          },
          video: stream.hasVideo(),
          audio: stream.hasAudio(),
          iceServers: self.getIceServers(),
          maxAudioBW: options.maxAudioBW,
          maxVideoBW: options.maxVideoBW,
          audioCodec: options.audioCodec,
          videoCodec: options.videoCodec
        });
        var onChannelReady = function() {
          stream.signalOnPlayAudio = function(onSuccess, onFailure) {
            playOrPause('play', self.signaling, stream, 'audio',
              onSuccess, onFailure);
          };
          stream.signalOnPauseAudio = function(onSuccess, onFailure) {
            playOrPause('pause', self.signaling, stream, 'audio',
              onSuccess, onFailure);
          };
          stream.signalOnPlayVideo = function(onSuccess, onFailure) {
            playOrPause('play', self.signaling, stream, 'video',
              onSuccess, onFailure);
          };
          stream.signalOnPauseVideo = function(onSuccess, onFailure) {
            playOrPause('pause', self.signaling, stream, 'video',
              onSuccess, onFailure);
          };
        };
        var onChannelFailed = function() {
          stream.channel.close();
          stream.channel = undefined;
        };
        stream.channel.oniceconnectionstatechange = function(state) {
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
        stream.channel.createOffer(false);
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
     * @param {LocalStream or ExternalStream} stream Stream to un-publish.
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

  WoogeenConferenceBase.prototype.unpublish = function(stream, onSuccess,
    onFailure) {
    var self = this;
    if (!(stream instanceof Woogeen.LocalStream || stream instanceof Woogeen.ExternalStream)) {
      return safeCall(onFailure, 'invalid stream');
    }
    self.signaling.sendMessage('unpublish', {
      id: stream.id()
    }).then(() => {
      safeCall(onSuccess);
    }, (err) => {
      safeCall(onFailure, err);
    }).then(() => {
      /* TODO(jianlin): for now we close corresponding channel as long as we request unpublishing.
         futher we need to parse the err from mcu to decide if channel needs to
         be closed*/
      if (stream.channel && typeof stream.channel.close === 'function') {
        stream.channel.close();
        stream.channel = null;
      }
      delete self.localStreams[stream.id()];
      stream.id = function() {
        return null;
      };
      stream.signalOnPlayAudio = undefined;
      stream.signalOnPauseAudio = undefined;
      stream.signalOnPlayVideo = undefined;
      stream.signalOnPauseVideo = undefined;
    });
  };

  /**
     * @function subscribe
     * @instance
     * @desc This function subscribes to a remote stream. The stream should be a RemoteStream instance. 'stream-failed' event may be triggered if there is internal error happend in MCU after publishing or connection is broken.
     <br><b>options:</b><br>
  {<br>
  video: true/false, {resolution: {width:xxx, height:xxx}, qualityLevel:'xxx'},<br>
  audio: true/false,<br>
  videoCodec: 'h264'/'vp8'/'vp9'. H.264 is the default preferred codec. This property specifies preferred video codec. Note for Firefox vp9 is not stable, so please do not sepcify vp9 for Firefox.<br>
  }
  <br><b>Remarks:</b><br>
  Video resolution choice is only valid for subscribing {@link Woogeen.RemoteMixedStream Woogeen.RemoteMixedStream} when multistreaming output is enabled.　See {@link N.API.createRoom N.API.createRoom()} for detailed description of multistreaming.<br>
     * @memberOf Woogeen.ConferenceClient&Woogeen.SipClient
     * @param {stream} stream Stream to subscribe.
     * @param {json} options (optional) Subscribe options. Options could be a boolean value or an object. If it is an boolean value, it indicates whether video is enabled or not. If it is an object, video will be enabled and this object is video options. The object may have following properties:</br>
       resolution: An object has width and height. Both width and height are number.</br>
       qualityLevel: A string which is one of these values "BestQuality", "BetterQuality", "Standard", "BetterSpeed", "BestSpeed". It does not change resolution, but better quality leads to higher bitrate.</br>
       bitrate: A number for expected bitrate in kbps. If <code>bitrate</code> is defined, <code>qualityLevel</code> will be ignored.</br>
       frameRate: A number for expected frame rate.</br>
       keyFrameInterval: A number for expected interval of key frames. Unit: second.
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

  WoogeenConferenceBase.prototype.subscribe = function(stream, options,
    onSuccess, onFailure) {
    var self = this;
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
    options.videoCodec = options.videoCodec || 'h264';

    // TODO: Making default audio/video to false in 4.0.
    let audioOptions = (stream.hasAudio() && options.audio !== false) ? {
      from: stream.id()
    } : false;
    let videoOptions = (stream.hasVideo() && options.video !== false) ? {
      from: stream.id()
    } : false;
    if (options.video && options.video.resolution) {
      videoOptions.parameters = {};
      videoOptions.parameters.resolution = options.video.resolution;
    }

    if (typeof options.video === 'object') {
      if (options.video.qualityLevel) {
        videoOptions.parameters = videoOptions.parameters || {};
        // Socket.IO message is "quality_level" while SDK style is "qualityLevel".
        switch (options.video.qualityLevel) {
          case 'BestQuality':
            {
              videoOptions.parameters.bitrate = '1.4x';
              break;
            }
          case 'BetterQuality':
            {
              videoOptions.parameters.bitrate = '1.2x';
              break;
            }
          case 'Standard':
            {
              videoOptions.parameters.bitrate = '1.0x';
              break;
            }
          case 'BetterSpeed':
            {
              videoOptions.parameters.bitrate = '0.8x';
              break;
            }
          case 'BestSpeed':
            {
              videoOptions.parameters.bitrate = '0.6x';
              break;
            }
          default:
            L.Logger.warning('Invalid quality level.');
        }
        delete options.video.qualityLevel;
      }
      if (options.video.frameRate) {
        videoOptions.parameters = videoOptions.parameters || {};
        videoOptions.parameters.framerate = options.video.frameRate;
      }
      if (options.video.keyFrameInterval) {
        videoOptions.parameters = videoOptions.parameters || {};
        videoOptions.parameters.keyFrameInterval = options.video.keyFrameInterval;
      }
    }
    self.signaling.sendMessage('subscribe', {
      type: 'webrtc',
      connection: undefined,
      media: {
        audio: audioOptions,
        video: videoOptions
      }
    }).then((data) => {
      self.subscriptionToStream[data.id] = stream;
      self.streamIdToSubscriptionId[stream.id()] = data.id;
      self.subscriptionCallbacks[data.id] = {
        onSuccess: onSuccess,
        onFailure: onFailure
      };
      stream.channel = createChannel({
        callback: function(message) {
          self.signaling.sendMessage('soac', {
            id: data.id,  // Subscription ID.
            signaling: message
          });
        },
        audio: stream.hasAudio() && (options.audio !== false),
        video: stream.hasVideo() && (options.video !== false),
        iceServers: self.getIceServers(),
        videoCodec: options.videoCodec
      });
      stream.channel.onaddstream = function(evt) {
        stream.mediaStream = evt.stream;
        L.Logger.info('Subscription ' + data.id + '\'s MediaStream is ready.');
      };
      var onChannelReady = function() {
        stream.signalOnPlayAudio = function(onSuccess, onFailure) {
          playOrPause('play', self.signaling, stream, 'audio', onSuccess,
            onFailure);
        };
        stream.signalOnPauseAudio = function(onSuccess, onFailure) {
          playOrPause('pause', self.signaling, stream, 'audio', onSuccess,
            onFailure);
        };
        stream.signalOnPlayVideo = function(onSuccess, onFailure) {
          playOrPause('play', self.signaling, stream, 'video', onSuccess,
            onFailure);
        };
        stream.signalOnPauseVideo = function(onSuccess, onFailure) {
          playOrPause('pause', self.signaling, stream, 'video', onSuccess,
            onFailure);
        };
      };
      var onChannelFailed = function() {
        if (stream.channel) {
          stream.channel.close();
        }
        stream.close();
        stream.signalOnPlayAudio = undefined;
        stream.signalOnPauseAudio = undefined;
        stream.signalOnPlayVideo = undefined;
        stream.signalOnPauseVideo = undefined;
      };
      stream.channel.oniceconnectionstatechange = function(state) {
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
    }, (err) => {
      return safeCall(onFailure, err);
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

  WoogeenConferenceBase.prototype.unsubscribe = function(stream, onSuccess,
    onFailure) {
    var self = this;
    if (!(stream instanceof Woogeen.RemoteStream)) {
      return safeCall(onFailure, 'invalid stream');
    }
    self.signaling.sendMessage('unsubscribe', {
      id: self.streamIdToSubscriptionId[stream.id()]
    }).then(() => {
      stream.close();
      stream.signalOnPlayAudio = undefined;
      stream.signalOnPauseAudio = undefined;
      stream.signalOnPlayVideo = undefined;
      stream.signalOnPauseVideo = undefined;
      if (stream.channel && typeof stream.channel.close === 'function') {
        stream.channel.close();
      }
    }).then(() => {
      safeCall(onSuccess);
    }, (err) => {
      safeCall(onFailure, err);
    });
    self.subscriptionToStream[self.streamIdToSubscriptionId[stream.id()]] =
      undefined;
    self.streamIdToSubscriptionId[stream.id()] = undefined;
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

  WoogeenConferenceBase.prototype.onMessage = function(callback) {
    if (typeof callback === 'function') {
      this.on('message-received', callback);
    }
  };

  /**
   * @class Woogeen.ConferenceClient
   * @classDesc Provides connection, local stream publication, and remote stream subscription for a video conference. The conference client is created by the server side API. The conference client is retrieved by the client API with the access token for the connection.
   */

  Woogeen.ConferenceClient = (function() {
    'use strict';
    var WoogeenConference = function WoogeenConference(spec) {
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
       self:, an object for current user's infomation.<br>
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

      this.join = function(token, onSuccess, onFailure) {
        WoogeenConferenceBase.prototype.join.call(this, token,
          onSuccess, onFailure);
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
      this.leave = function() {
        this.signaling.disconnect();
      };

      /**
     * @function send
     * @instance
     * @desc This function send message to conference room. The receiver should be a valid clientId, which is carried by 'user-joined' event; or default 0, which means send to all participants in the conference (broadcast) except himself.
     * @memberOf Woogeen.ConferenceClient
     * @param {string} data text message to send.
     * @param {string} receiver Receiver, optional. Sending message to all participants if receiver is undefined.
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
      this.send = function(data, receiver, onSuccess, onFailure) {
        const self = this;
        if (data === undefined || data === null || typeof data ===
          'function') {
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
        self.signaling.sendMessage('text', {
          to: receiver,
          message: data
        }).then(() => {
          safeCall(onSuccess);
        }, (err) => {
          safeCall(onFailure, err);
        });
      };


      /**
         * @function mix
         * @instance
         * @desc This function tells server to add published LocalStream to mix stream.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream or ExternalStream} stream WoogeenStream or ExternalStream instance; it should be published before this call.
         * @param {an array of RemoteMixedStreams} targetStream The mixed streams that |stream| will be mixed to.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @example
      <script type="text/JavaScript">
      var conference = Woogeen.ConferenceClient.create();
      // ...
      // If [mixedStream] is empty, success callback will be triggered.
      conference.mix(localStream, [mixedStream], function () {
          L.Logger.info('success');
        }, function (err) {
          L.Logger.error('failed:', err);
        }
      );
      </script>
         */
      this.mix = function(stream, targetStreams, onSuccess, onFailure) {
        return mixOrUnmix('mix', this.signaling, stream, targetStreams,
          onSuccess, onFailure);
      };

      /**
         * @function unmix
         * @instance
         * @desc This function tells server to remove published LocalStream from mix stream.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream or ExternalStream} stream WoogeenStream or ExternalStream instance; it should be published before this call.
         * @param {an array of RemoteMixedStreams} targetStream The mixed streams that |stream| will be unmixed from.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @example
      <script type="text/JavaScript">
      var conference = Woogeen.ConferenceClient.create();
      // ...
      // If [mixedStream] is empty, success callback will be triggered.
      conference.unmix(localStream, [mixedStream], function () {
          L.Logger.info('success');
        }, function (err) {
          L.Logger.error('failed:', err);
        }
      );
      </script>
         */
      this.unmix = function(stream, targetStreams, onSuccess, onFailure) {
        return mixOrUnmix('unmix', this.signaling, stream, targetStreams,
          onSuccess, onFailure);
      };

      /**
       * @function shareScreen
       * @instance
       * @desc This function is deprecated.
       * @memberOf Woogeen.ConferenceClient
       */
      this.shareScreen = function(option, onSuccess, onFailure) {
        L.Logger.warning(
          'shareScreen is deprecated, please create a LocalStream and publish it to specific conference.'
        );
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
            resolution: option.resolution ? option.resolution : {
              width: screen.width,
              height: screen.height
            },
            frameRate: option.frameRate
          },
          audio: false
        }, function(err, stream) {
          if (err) {
            return safeCall(onFailure, err);
          }
          self.publish(stream, {
            maxVideoBW: option.maxVideoBW,
            videoCodec: option.videoCodec
          },function(st) {
            safeCall(onSuccess, st);
          },
          function(err) {
            safeCall(onFailure, err);
          });
        });
      };


      /**
         * @function playAudio
         * @desc This function tells server to continue sending/receiving audio data of the RemoteStream/LocalStream.
      <br><b>Remarks:</b><br>
      The audio track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published. playAudio with video only stream will succeed without any action.<br>
      External Stream does not support this function.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream} stream instance.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @instance
         */
      this.playAudio = function(stream, onSuccess, onFailure) {
        if ((stream instanceof Woogeen.Stream) && stream.hasAudio() &&
          typeof stream.signalOnPlayAudio === 'function') {
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
      Upon success, the audio of the stream would be hold, and you can call disableAudio() method to disable the audio track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published. puaseAudio with video only stream will succeed without any action.<br>
      External Stream does not support this function.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream} stream instance.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @instance
         */
      this.pauseAudio = function(stream, onSuccess, onFailure) {
        if ((stream instanceof Woogeen.Stream) && stream.hasAudio() &&
          typeof stream.signalOnPauseAudio === 'function') {
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
      The video track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published. playVideo with audio only stream will succeed without any action.<br>
      External Stream does not support this function.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream} stream instance.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @instance
         */
      this.playVideo = function(stream, onSuccess, onFailure) {
        if ((stream instanceof Woogeen.Stream) && stream.hasVideo() &&
          typeof stream.signalOnPlayVideo === 'function') {
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
      Upon success, the video of the stream would be hold, and you can call disableVideo() method to disable the video track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published. pauseVideo with audio only stream will succeed without any action.<br>
      External Stream does not support this function.
         * @memberOf Woogeen.ConferenceClient
         * @param {WoogeenStream} stream instance.
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(err) (optional) Failure callback.
         * @instance
         */
      this.pauseVideo = function(stream, onSuccess, onFailure) {
        if ((stream instanceof Woogeen.Stream) && stream.hasVideo() &&
          typeof stream.signalOnPauseVideo === 'function') {
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
     Adding external output for audio only or video only stream is not supported yet.
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
      this.addExternalOutput = function(url, options, onSuccess, onFailure) {
        var self = this;
        if (typeof options === 'function') {
          onFailure = onSuccess;
          onSuccess = options;
          options = {};
        } else if (typeof options !== 'object' || options === null) {
          options = {};
        }
        options.url = url;
        // See http://shilv018.sh.intel.com/bugzilla_WebRTC/show_bug.cgi?id=976#c8 .
        if (options.video && options.video.resolution) {
          options.resolution = options.video.resolution;
        }
        let streamId = options.streamId || self.commonMixedStream.id();
        if (!streamId) {
          return safeCall(onFailure, 'Stream ID is not specified.');
        }
        let mediaOptions = {
          audio: {
            from: streamId
          },
          video: {
            from: streamId,
            format: {
              codec: 'h264'
            }
          }
        };
        if (options.resolution) {
          if (typeof options.resolution === 'string') {
            mediaOptions.video.format.resolution = resolutionName2Value[options.resolution];
          } else {
            mediaOptions.video.format.resolution = options.resolution;
          }
        }
        self.signaling.sendMessage('subscribe', {
          type: 'streaming',
          connection: {
            url: url
          },
          media: mediaOptions
        }).then((data) => {
          self.externalUrlToSubscriptionId[url] = data.id;
          safeCall(onSuccess);
        }, (err) => {
          safeCall(onFailure, err);
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
      this.updateExternalOutput = function(url, options, onSuccess, onFailure) {
        var self = this;
        if (typeof options === 'function') {
          onFailure = onSuccess;
          onSuccess = options;
          options = {};
        } else if (typeof options !== 'object' || options === null) {
          options = {};
        }
        if (typeof url !== 'string' || !self.externalUrlToSubscriptionId[url]) {
          safeCall(onFailure, 'Invalid URL.');
          return;
        }
        let streamId = options.streamId || self.commonMixedStream.id();
        if (!streamId) {
          return safeCall(onFailure, 'Stream ID is not specified.');
        }
        let subscriptionUpdateOptions = {
          audio: {
            from: streamId
          },
          video: {
            from: streamId,
            format: {
              codec: 'h264'
            }
          }
        };
        if (options.resolution) {
          if (typeof options.resolution === 'string') {
            subscriptionUpdateOptions.format.video.resolution =
              resolutionName2Value[options.resolution];
          } else {
            subscriptionUpdateOptions.format.video.resolution = options.resolution;
          }
        }
        self.signaling.sendMessage('subscription-control', {
          id: self.externalUrlToSubscriptionId[url],
          operation: 'update',
          data: subscriptionUpdateOptions
        }).then(() => {
          safeCall(onSuccess);
        }, (err) => {
          safeCall(onFailure, err);
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
      this.removeExternalOutput = function(url, onSuccess, onFailure) {
        var self = this;
        if (typeof url !== 'string' || !self.externalUrlToSubscriptionId[url]) {
          safeCall(onFailure, 'Invalid URL.');
          return;
        }
        self.signaling.sendMessage('unsubscribe', {
          id: self.externalUrlToSubscriptionId[url]
        }).then(() => {
          safeCall(onSuccess);
        }, (err) => {
          safeCall(onFailure, err);
        });
      };

      /**
         * @function startRecorder
         * @instance
         * @desc This function starts the recording of a video stream and an audio stream in the conference room and saves it to a .mkv file, according to the configurable "recording.path" in agent.toml file.<br>
      Three events are defined for media recording: 'recorder-added' for the creation of media recorder; 'recorder-removed' for the removal of media recorder.
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
         <li>audioCodec: preferred audio codec to be recorded. If unspecified, 'opus' will be used by default.</li>
         <li>recorderId: recorder id to be reused. Id can only be alphanumeric. If the id is not set, server will generate one.</li>
         </ul>
         Important Note: In the case of continuous media recording among different streams, the recorderId is the key to make sure each switched stream go to the same recording url. Do not stop the recorder when you want the continuous media recording functionality, unless all the required media content has been recorded successfully.<br>
      The recommendation is to invoke another startRecorder with new videoStreamId and audioStreamId (default to mixed stream) right after the previous call of startRecorder, but the same recorderId should be kept.
      Another important thing is that the storage availability of the recording path needs to be guaranteed when using media recording.
         * @param {function} onSuccess(resp) (optional) Success callback. The following information will be
       returned as well:<br>
          <ul>
         <li>recorderId: Recorder id.</li>
         <li>host: Host server address.</li>
         <li>path: Recorded file path.</li>
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
      this.startRecorder = function(options, onSuccess, onFailure) {
        var self = this;
        if (typeof options === 'function') {
          onFailure = onSuccess;
          onSuccess = options;
          options = {};
        } else if (typeof options !== 'object' || options === null) {
          options = {};
        }
        let mediaSubOptions = {};
        if (!options.audioStreamId && !options.videoStreamId) {
          mediaSubOptions.audio = {
            from: self.commonMixedStream.id()
          };
          mediaSubOptions.video = {
            from: self.commonMixedStream.id()
          };
        } else if (typeof options.audioStreamId === 'string' && !options.videoStreamId) {
          mediaSubOptions.audio = {
            from: options.audioStreamId
          };
          mediaSubOptions.video = false;
        } else if (typeof options.videoStreamId === 'string' && !options.audioStreamId) {
          mediaSubOptions.audio = false;
          mediaSubOptions.video = {
            from: options.videoStreamId
          };
        } else if (typeof options.audioStreamId === 'string' && typeof options
          .videoStreamId === 'string') {
          mediaSubOptions.audio = {
            from: options.audioStreamId
          };
          mediaSubOptions.video = {
            from: options.videoStreamId
          };
        }
        if (options.audioCodec && mediaSubOptions.audio) {
          mediaSubOptions.audio.format = {
            codec: options.audioCodec
          };
          if (!self.remoteStreams[options.audioStreamId]) {
            safeCall(onFailure, 'Invalid audio stream ID.');
            return;
          }
          let stream = self.remoteStreams[options.audioStreamId];
          if (!stream.mediaInfo().audio) {
            safeCall(onFailure, 'Target stream does not have audio.');
            return;
          }
          let audioFormats = [];
          if (stream.mediaInfo().audio.format) {
            audioFormats.push(stream.mediaInfo().audio.format);
          }
          if (stream.mediaInfo().audio.transcoding) {
            audioFormats = audioFormats.concat(stream.mediaInfo().audio.transcoding
              .format);
          }
          audioFormats.some((format) => {
            if (format.codec === options.audioCodec) {
              mediaSubOptions.audio.format.sampleRate = format.sampleRate;
              mediaSubOptions.audio.format.channelNum = format.channelNum;
            }
            return format.codec === options.audioCodec;
          });
        }
        if (options.videoCodec && mediaSubOptions.video) {
          mediaSubOptions.video.format = {
            codec: options.videoCodec
          };
        }
        // TODO: implement parameters.
        if (!options.recorderId) { // Add a new recorder.
          self.signaling.sendMessage('subscribe', {
            type: 'recording',
            connection: {
              container: undefined
            },
            media: mediaSubOptions
          }).then((data) => {
            self.recorderCallbacks[data.id] = {
              onSuccess: onSuccess,
              onFailure: onFailure
            };
          }, (err) => {
            safeCall(onFailure, err);
          });
        } else { // Update recorder.
          // Update |mediaSubOptions| for updating.
          if (mediaSubOptions.audio && mediaSubOptions.audio.format) {
            delete mediaSubOptions.audio.format;
          }
          if (mediaSubOptions.video && mediaSubOptions.video.format) {
            delete mediaSubOptions.video.format;
          }
          self.signaling.sendMessage('subscription-control', {
            id: options.recorderId,
            operation: 'update',
            data: mediaSubOptions
          }).then(() => {
            safeCall(onSuccess, options.recorderId);
          }, (err) => {
            safeCall(onFailure, err);
          });
        }
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
      this.stopRecorder = function(options, onSuccess, onFailure) {
        var self = this;
        if (typeof options === 'function') {
          onFailure = onSuccess;
          onSuccess = options;
          options = {};
        } else if (typeof options !== 'object' || options === null) {
          options = {};
        }
        if (typeof options.recorderId !== 'string') {
          safeCall("Invalid recorder ID.");
        }

        self.signaling.sendMessage('unsubscribe', {
          id: options.recorderId
        }).then(() => {
          safeCall(onSuccess);
        }, (err) => {
          safeCall(onFailure, err);
        });
      };

      /**
         * @function getRegion
         * @instance
         * @desc This function gets the region ID of the given stream in the mixed stream.
         <br><b>options:</b><br>

      <code>{<br>
        id: 'the stream id',<br>
        mixedStreamId: 'the mixed stream id'<br>
      }</code>
         * @memberOf Woogeen.ConferenceClient
         * @param {json} options An object has following properties:<br>
            <ul>
              <li>id: a stream ID specifies which stream's region is needed.</li>
              <li>mixedStreamId: a mixed stream ID.</li>
            </ul>
         * @param {function} onSuccess(resp) (optional) Success callback.
         * @param {function} onFailure(error) (optional) Failure callback.
         * @example
      <script type="text/JavaScript">
      var conference = Woogeen.ConferenceClient.create();
      // ......
      conference.getRegion({id: 'streamId', mixedStreamId: 'mixed stream ID'}, function (resp) {
          L.Logger.info('Region for streamId: ', resp.region);
        }, function (err) {
          L.Logger.error('getRegion failed:', err);
        }
      );
      </script>
       */
      this.getRegion = function(options, onSuccess, onFailure) {
        var self = this;
        if (typeof options !== 'object' || options === null || typeof options.id !==
          'string' || options.id === '') {
          return safeCall(onFailure, 'Invalid options.');
        }

        if (!options.mixedStreamId && self.commonMixedStream) {
          options.mixedStreamId = self.commonMixedStream.id();
        }
        if (typeof options.mixedStreamId !== 'string' || !(self.remoteStreams[
            options.mixedStreamId] instanceof Woogeen.RemoteMixedStream)) {
          return safeCall(onFailure, 'Invalid mixed stream ID.');
        }

        var optionsMessage = {
          id: options.id,
          operation: 'get-region',
          data: self.remoteStreams[options.mixedStreamId].viewport()
        };

        self.signaling.sendMessage('stream-control', optionsMessage).then((regionId)=>{
          safeCall(onSuccess, {region: regionId});
        }, (err)=>{
          safeCall(onFailure, err);
        });
      };

      /**
         * @function setRegion
         * @instance
         * @desc This function sets the region for the given stream in the mixed stream with the given region id.
         * @memberOf Woogeen.ConferenceClient
         * @param {json} options An object has following properties:<br>
            <ul>
              <li>id: a stream ID specifies which stream's region is going to be set.</li>
              <li>region: a region ID specifies the target region.</li>
              <li>mixedStreamId: a mixed stream ID sepcifies the target mixed stream.</li>
            </ul>
         * @param {function} onSuccess() (optional) Success callback.
         * @param {function} onFailure(error) (optional) Failure callback.
         * @example
      <script type="text/JavaScript">
      var conference = Woogeen.ConferenceClient.create();
      // ......
      conference.setRegion({id: 'streamId', region: 'regionId', mixedStreamId: 'mixedStreamID'}, function () {
          L.Logger.info('setRegion succeeded');
        }, function (err) {
          L.Logger.error('setRegion failed:', err);
        }
      );
      </script>
       */
      this.setRegion = function(options, onSuccess, onFailure) {
        var self = this;
        if (typeof options !== 'object' || options === null || typeof options.id !==
          'string' || options.id === '' || typeof options.region !== 'string' ||
          options.region === '') {
          return safeCall(onFailure, 'Invalid options.');
        }

        if (!options.mixedStreamId && self.commonMixedStream) {
          options.mixedStreamId = self.commonMixedStream.id();
        }
        if (typeof options.mixedStreamId !== 'string' || !(self.remoteStreams[
            options.mixedStreamId] instanceof Woogeen.RemoteMixedStream)) {
          return safeCall(onFailure, 'Invalid mixed stream ID.');
        }

        var optionsMessage = {
          id: options.id,
          operation: 'set-region',
          data: {
            region: options.region,
            view: self.remoteStreams[options.mixedStreamId].viewport()
          }
        };

        self.signaling.sendMessage('stream-control', optionsMessage).then(()=>{
          safeCall(onSuccess);
        }, (err)=>{
          safeCall(onFailure, err);
        });
      };

      /**
         * @function getConnectionStats
         * @instance
         * @desc This function gets statistic information about the given stream and its associated connection.
      <br><b>Remarks:</b><br>
      Unsupported statistics in firefox return -1 or "". This API is not supported on Edge browser.
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
      this.getConnectionStats = function(stream, onSuccess, onFailure) {
        if (stream && stream.channel && typeof stream.channel.getConnectionStats ===
          'function') {
          stream.channel.getConnectionStats(function(stats) {
            safeCall(onSuccess, stats);
          }, function(err) {
            safeCall(onFailure, err);
          });
        } else {
          safeCall(onFailure, 'invalid stream.');
        }
      };

      /**
       * @function mute
       * @instance
       * @desc Mute a stream in the conference.
       * @memberOf Woogeen.ConferenceClient
       * @param {WoogeenStream} stream Stream to be muted.
       * @param {string} trackKind Specify which kind of tracks to be muted. Valid values are "audio", "video" and <code>undefined</code>.<code>undefined</code> will mute all tracks.
       * @param {function} onSuccess (optional) Success callback.
       * @param {function} onFailure (optional) Failure callback.
       * @example
      var conference = Woogeen.ConferenceClient.create();
      // ......
      conference.mute(stream, 'video', function () {
          console.log('Muting stream success');
        }, function (err) {
          console.log('Muting stream failed:', err);
        }
      );
      </script>
       */
      this.mute = function(stream, trackKind, onSuccess, onFailure) {
        playOrPause('pause', this.signaling, stream, trackKind, onSuccess,
          onFailure);
      };
      /**
       * @function unmute
       * @instance
       * @desc Unmute a stream in the conference.
       * @memberOf Woogeen.ConferenceClient
       * @param {WoogeenStream} stream Stream to be unmuted.
       * @param {string} trackKind Specify which kind of tracks to be unmuted. Valid values are "audio", "video" and <code>undefined</code>.<code>undefined</code> will unmute all tracks.
       * @param {function} onSuccess (optional) Success callback.
       * @param {function} onFailure (optional) Failure callback.
       * @example
      var conference = Woogeen.ConferenceClient.create();
      // ......
      conference.unmute(stream, 'audio', function () {
          console.log('Unmuting stream success');
        }, function (err) {
          console.log('Unmuting stream failed:', err);
        }
      );
      </script>
       */
      this.unmute = function(stream, trackKind, onSuccess, onFailure) {
        playOrPause('play', this.signaling, stream, trackKind, onSuccess,
          onFailure);
      };
    };

    WoogeenConference.prototype = Object.create(WoogeenConferenceBase.prototype); // make WoogeenConference a WoogeenConferenceBase
    WoogeenConference.prototype.constructor = WoogeenConference;

    /**
       * @function create
       * @desc This factory returns a Woogeen.ConferenceClient instance.
       * @memberOf Woogeen.ConferenceClient
       * @static
       * @param {object} spec (Optional)Specifies the configurations for the ConferenceClient object created. Following properties are supported:<br>
@htmlonly
<table class="doxtable">
    <tr>
        <th>iceServers</th>
        <td>Each ICE server instance has three properties: URIs, username (optional for STUN), credential (optional for STUN). URIs Could be an array of STUN/TURN server URIs which shared the same username and credential. STUN is described at http://tools.ietf.org/html/draft-nandakumar-rtcweb-stun-uri-08, and TURN is described at http://tools.ietf.org/html/rfc5766.</td>
    </tr>
</tbody>
</table>
@endhtmlonly
       * @return {Woogeen.ConferenceClient} An instance of Woogeen.ConferenceClient.
       * @example
    <script type="text/JavaScript">
    var conference = Woogeen.ConferenceClient.create({iceServers : [{
      urls : "stun:example.com"
    }, {
      urls : ["turn:example.com:3478?transport=tcp", "turn:example.com:3478?transport=udp"],
      credential : "password",
      username : "example"
    }]});
    </script>
       */
    WoogeenConference.create = function factory(spec) { // factory, not in prototype
      return new WoogeenConference(spec);
    };
    return WoogeenConference;
  }());


  /**
   * @class Woogeen.SipClient
   * @classDesc Provides to initiate, accept, reject and hangup a sip audio or video call.
   */

  Woogeen.SipClient = (function() {

    var WoogeenSipGateway = function WoogeenSipGateway(spec) {
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

      this.join = function(token, onSuccess, onFailure) {
        token.host = this.spec.host;
        token.secure = this.spec.secure;
        // WoogeenConferenceBase.join requires base 64 encoded token. So encode it first.
        token = L.Base64.encodeBase64(JSON.stringify(token));
        WoogeenConferenceBase.prototype.join.call(this, token,
          onSuccess, onFailure);
      };

      this.subscribe = function(stream, options, onSuccess, onFailure) {
        var self = this;
        if (typeof options === 'function') {
          onFailure = onSuccess;
          onSuccess = options;
          options = {};
        } else if (typeof options !== 'object' || options === null) {
          options = {};
        }
        var subscribeSuccess = function(stream) {
          self.dispatchEvent(new Woogeen.StreamEvent({
            type: 'stream-subscribed',
            stream: stream
          }));
          onSuccess(stream);
        };
        WoogeenConferenceBase.prototype.subscribe.call(this, stream,
          options, subscribeSuccess, onFailure);
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
      this.acceptCall = function(onSuccess, onFailure) {
        var self = this;
        var payload = {
          type: 'acceptCall',
        };
        sendMsg(self.socket, 'customMessage', payload, function(err,
          resp) {
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
      this.rejectCall = function(onSuccess, onFailure) {
        var self = this;
        var payload = {
          type: 'rejectCall',
        };
        sendMsg(self.socket, 'customMessage', payload, function(err,
          resp) {
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
      this.hangupCall = function(onSuccess, onFailure) {
        var self = this;
        var payload = {
          type: 'hangupCall',
        };
        sendMsg(self.socket, 'customMessage', payload, function(err,
          resp) {
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
      this.makeCall = function(callee, onSuccess, onFailure) {
        var self = this;
        var payload = {
          type: 'makeCall',
          payload: callee
        };
        sendMsg(self.socket, 'customMessage', payload, function(err,
          resp) {
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
    WoogeenSipGateway.create = function factory(spec) { // factory, not in prototype
      return new WoogeenSipGateway(spec);
    };
    return WoogeenSipGateway;
  }());

}());

