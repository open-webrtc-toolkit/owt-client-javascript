/* global webkitURL, chrome */
(function() {
  'use strict';
  /**
   *@namespace Woogeen
   *@classDesc Namespace for client API.
   */
  /**
   * @class Woogeen.Stream
   * @classDesc Handles the WebRTC (audio, video) stream, identifies the stream, and identifies the location where the stream should be displayed. There are two stream classes: LocalStream and RemoteStream.
   */
  function WoogeenStream(streamInfo) {
    // if (!(this instanceof WoogeenStream)) {
    //   return new WoogeenStream();
    // }
    this.mediaStream = streamInfo.mediaStream;
    streamInfo.info = streamInfo.info || {};
    streamInfo.info.attributes = streamInfo.info.attributes || {};
    this.url = function() {
      if (typeof streamInfo.url === 'string' && streamInfo.url !== '') {
        return streamInfo.url;
      }
      return undefined;
    };
    /**
       * @function hasVideo
       * @desc This function returns true when stream has video track otherwise false.
       * @memberOf Woogeen.Stream
       * @instance
       * @return {boolean} true The stream has video.<br>false The stream does not have video.
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream hasVideo:', stream.hasVideo());
    </script>
       */
    this.hasVideo = function() {
      return !!streamInfo.video;
    };
    /**
       * @function hasAudio
       * @desc This function returns true when stream has audio track otherwise false.
       * @memberOf Woogeen.Stream
       * @instance
       * @return {boolean} true The stream has audio.<br>false The stream does not have audio.
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream hasAudio:', stream.hasAudio());
    </script>
       */
    this.hasAudio = function() {
      return !!streamInfo.audio;
    };
    /**
       * @function attributes
       * @desc This function returns all user-defined attributes in stream.
       * @memberOf Woogeen.Stream
       * @instance
       * @return {string} All the user-defined attributes.
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream attibutes:', stream.attributes());
    </script>
       */
    this.attributes = function() {
      return streamInfo.info.attributes;
    };
    /**
       * @function attr
       * @desc This function sets user-defined value in attributes when value is provided; otherwise returns corresponding attribute.
       * @memberOf Woogeen.Stream
       * @instance
       * @param {string} key attribute key.
       * @param {string} value attribute value.
       * @return {string} Existing attribute value if it's not specified in parameter
       * @example
    <script type="text/JavaScript">
    stream.attr("custom_key", "custom_value");
    </script>
       */
    this.attr = function(key, value) {
      if (arguments.length > 1) {
        streamInfo.info.attributes[key] = value;
      }
      return streamInfo.info.attributes[key];
    };
    /**
       * @function id
       * @desc This function returns stream Id.
    <br><b>Remarks:</b><br>
    For local stream, it returns MediaStream's ID if the stream has not been published; once published, stream Id should be updated by server.
       * @memberOf Woogeen.Stream
       * @instance
       * @return {string} Stream ID.
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream added:', stream.id());
    </script>
       */
    this.id = function() {
      return streamInfo.id || null;
    };
    /**
       * @function isScreen
       * @desc This function returns true when stream's video track is from screen sharing otherwise false.
       * @memberOf Woogeen.Stream
       * @instance
       * @return {boolean} true The stream is from screen;<br>otherwise false.
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream is from screen?', stream.isScreen());
    </script>
       */
    this.isScreen = function() {
      return (!!streamInfo.media) && (!!streamInfo.media.video) && (
        streamInfo.media.video.source === 'screen-cast');
    };
    this.bitRate = {
      maxVideoBW: undefined,
      maxAudioBW: undefined
    }; // mutable;
    this.toJson = function() {
      return {
        id: this.id(),
        audio: this.hasAudio() ? streamInfo.audio : false,
        video: this.hasVideo() ? streamInfo.video : false,
        attributes: streamInfo.attributes
      };
    };
  }
  /**
     * @function on
     * @desc This function registers a listener for a specified event, which would be called when the event occurred.
      @htmlonly
      <table class="doxtable">
      <thead>
        <tr><th align="center">Event Name</th><th align="center">Description</th></tr>
      </thead>
      <tbody>
        <tr><td align="center"><code>Ended</code></td><td align="center">All tracks of this stream are ended. This event only works for local screen sharing stream.</td></tr>
      </tbody>
      </table>
      @endhtmlonly
     * @memberOf Woogeen.LocalStream
     * @instance
     * @example
      <script type="text/JavaScript">
      stream.on('Ended', function () {
        conference.unpublish(stream);
      });
      </script>
  */
  WoogeenStream.prototype =  Woogeen.EventDispatcher({});
  /**
     * @function close
     * @desc This function closes the stream.
  <br><b>Remarks:</b><br>
  If the stream has audio and/or video, it also stops capturing from camera/microphone. Once a LocalStream is closed, it is no longer usable. This function does not unpublish certain stream and it does not deal with UI logical either. After a stream is closed, "Ended" event will be fired.
     * @memberOf Woogeen.Stream
     * @instance
     * @example
  <script type="text/JavaScript">
  var stream = Woogeen.Stream({audio:true, video:true, attributes: {name:'WoogeenStream'}});
  stream.close();
  </script>
     */
  WoogeenStream.prototype.close = function() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().map(function(track) {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      });
    }

    if (window.navigator.userAgent.match(/Edge\/(\d+).(\d+)$/) !== null &&
        this.channel && typeof this.channel.close === 'function') {
      this.channel.close();
      this.channel = null;
    }
  };

  WoogeenStream.prototype.createObjectURL = function() {
    if (!this.mediaStream) {
      return '';
    }
    return (window.URL || webkitURL).createObjectURL(this.mediaStream);
  };
  /**
     * @function disableAudio
     * @desc This function disables underlying audio track in the stream if it has audio capacity; otherwise it does nothing.
  <br><b>Remarks:</b><br>
  For remote stream, it stops decoding audio; for local stream, it also stops capturing audio. But capturing cannot be stopped currently in Edge by this API.
     * @memberOf Woogeen.Stream
     * @instance
     * @return {boolean} true The stream has audio and the audio track is enabled previously; <br> otherwise false.
     * @example
  <script type="text/JavaScript">
  stream.disableAudio();
  </script>
     */
  WoogeenStream.prototype.disableAudio = function(tracknum) {
    var self = this;
    if (self.hasAudio() && self.mediaStream) {
      if (tracknum === undefined) {
        tracknum = 0;
      }
      if (tracknum === -1) {
        return self.mediaStream.getAudioTracks().map(function(track) {
          if (track.enabled) {
            track.enabled = false;
            return true;
          }
          return false;
        });
      }
      var tracks = self.mediaStream.getAudioTracks();
      if (tracks && tracks[tracknum] && tracks[tracknum].enabled) {
        tracks[tracknum].enabled = false;
        return true;
      }
    }
    return false;
  };
  /**
     * @function enableAudio
     * @desc This function enables underlying audio track in the stream if it has audio capacity.
  <br><b>Remarks:</b><br>
  For remote stream, it continues decoding audio; for local stream, it also continues capturing audio.
     * @memberOf Woogeen.Stream
     * @instance
     * @return {boolean} true The stream has audio and the audio track is disabled previously; <br> otherwise false.
     * @example
  <script type="text/JavaScript">
  stream.enableAudio();
  </script>
     */
  WoogeenStream.prototype.enableAudio = function(tracknum) {
    var self = this;
    if (self.hasAudio() && self.mediaStream) {
      if (tracknum === undefined) {
        tracknum = 0;
      }
      if (tracknum === -1) {
        return self.mediaStream.getAudioTracks().map(function(track) {
          if (track.enabled !== true) {
            track.enabled = true;
            return true;
          }
          return false;
        });
      }
      var tracks = self.mediaStream.getAudioTracks();
      if (tracks && tracks[tracknum] && tracks[tracknum].enabled !== true) {
        tracks[tracknum].enabled = true;
        return true;
      }
    }
    return false;
  };

  /**
     * @function disableVideo
     * @desc This function disables underlying video track in the stream if it has video capacity; otherwise it does nothing.
  <br><b>Remarks:</b><br>
  For remote stream, it stops decoding video; for local stream, it also stops capturing video. But capturing cannot be stopped currently in Edge by this API.
     * @memberOf Woogeen.Stream
     * @instance
     * @return {boolean} true The stream has video and the video track is enabled previously; <br> otherwise false.
     * @example
  <script type="text/JavaScript">
  stream.disableVideo();
  </script>
     */
  WoogeenStream.prototype.disableVideo = function(tracknum) {
    var self = this;
    if (self.hasVideo() && self.mediaStream) {
      if (tracknum === undefined) {
        tracknum = 0;
      }
      if (tracknum === -1) {
        return self.mediaStream.getVideoTracks().map(function(track) {
          if (track.enabled) {
            track.enabled = false;
            return true;
          }
          return false;
        });
      }
      var tracks = self.mediaStream.getVideoTracks();
      if (tracks && tracks[tracknum] && tracks[tracknum].enabled) {
        tracks[tracknum].enabled = false;
        return true;
      }
    }
    return false;
  };

  /**
     * @function enableVideo
     * @desc This function enables underlying video track in the stream if it has video capacity.
  <br><b>Remarks:</b><br>
  For remote stream, it continues decoding video; for local stream, it also continues capturing video.
     * @memberOf Woogeen.Stream
     * @instance
     * @return {boolean} true The stream has video and the video track is disabled previously; <br> otherwise false.
     * @example
  <script type="text/JavaScript">
  stream.enableVideo();
  </script>
     */
  WoogeenStream.prototype.enableVideo = function(tracknum) {
    var self = this;
    if (self.hasVideo() && self.mediaStream) {
      if (tracknum === undefined) {
        tracknum = 0;
      }
      if (tracknum === -1) {
        return self.mediaStream.getVideoTracks().map(function(track) {
          if (track.enabled !== true) {
            track.enabled = true;
            return true;
          }
          return false;
        });
      }
      var tracks = self.mediaStream.getVideoTracks();
      if (tracks && tracks[tracknum] && tracks[tracknum].enabled !== true) {
        tracks[tracknum].enabled = true;
        return true;
      }
    }
    return false;
  };

  WoogeenStream.prototype.updateConfiguration = function(config, callback) {
    if (config === undefined) {
      return;
    }
    if (this.channel) {
      this.channel.updateSpec(config, callback);
    } else {
      return ("This stream has not been published, ignoring");
    }
  };

  function WoogeenLocalStream(spec) {
    WoogeenStream.call(this, spec);
    this.hasAudio = function() {
      if (this.mediaStream) {
        return !!this.mediaStream.getAudioTracks().length;
      } else {
        return !!spec.hasAudio;
      }
    };

    this.hasVideo = function() {
      if (this.mediaStream) {
        return !!this.mediaStream.getVideoTracks().length;
      } else {
        return !!spec.hasVideo;
      }
    };

    // TODO: Make it align with remote streams.
    this.isScreen = function() {
      return (!!spec.video && spec.video.device === 'screen');
    };
  }

  function WoogeenRemoteStream(streamInfo) {
    WoogeenStream.call(this, streamInfo);
    /**
       * @function isMixed
       * @desc This function returns true when stream's video track is mixed by server otherwise false.
    <br><b>Remarks:</b><br>
    Deprecated, use <code>instanceof Woogeen.RemoteMixedStream</code> instead.
       * @memberOf Woogeen.RemoteStream
       * @instance
       * @return {boolean} true The stream is mixed stream.<br>false The stream is not mixed stream
       * @example
    <script type="text/JavaScript">
    L.Logger.info('stream isMixed:', stream.isMixed());
    </script>
       */
    this.isMixed = function() {
      return false;
    };

    this.hasAudio = function() {
      return !!streamInfo.media.audio;
    };

    this.hasVideo = function() {
      return !!streamInfo.media.video;
    };

    function extractBitrateMultiplier(input) {
      if (typeof input !== 'string' || !input.startsWith('x')) {
        L.Logger.warning('Invalid bitrate multiplier input.');
        return 0;
      }
      return Number.parseFloat(input.replace(/^x/, ''));
    }

    /**
       * @function mediaInfo
       * @desc This function returns the media information of specific stream.
       * @memberOf Woogeen.RemoteStream
       * @instance
       * @return {object} An object defined as follow:
       object(MediaInfo)::
        {
         audio: object(AudioInfo) | undefined,
         video: object(VideoInfo) | undefined
        }

        object(AudioInfo)::
          {
           source: "mic" | "screen-cast" | "raw-file" | "encoded-file" | undefined,
           format: object(AudioFormat),
           transcoding:
            {
             format: [object(AudioFormat)] | undefined
            }
            | undefined
          }

          object(AudioFormat)::
            {
             codec: "pcmu" | "pcma" | "opus" | "g722" | "iSAC" | "iLBC" | "aac" | "ac3" | "nellymoser",
             sampleRate: number(SampleRate) | undefined,
             channelNum: number(ChannelNumber) | undefined
            }

        object(VideoInfo)::
          {
           source: "camera" | "screen-cast" | "raw-file" | "encoded-file" | undefined,
           format: object(VideoFormat),
           parameters: object(VideoParameters) | undefined,
           transcoding:
             {
              format: [object(VideoFormat)] | undefined,
              parameters:
                {
                 resolution:[object(Resolution)] | undefined,
                 framerate: [number(FramerateFPS)] | undefined,
                 bitrateMultiplier: [number(bitrateMultiplier)] |undefined,
                 keyFrameInterval: [number(KeyFrameIntervalSecond)] | undefined
                }
                | undefined
             }
             | undefined
          }

          object(VideoFormat)::
            {
             codec: "h264" | "h265" | "vp8" | "vp9",
             profile: "baseline" | "constrained-baseline" | "main" | "high" //If codec equals "h264".
                   | undefined //If codec does NOT equal "h264"
            }

          object(VideoParameters)::
            {
             resolution: object(Resolution) | undefined,
             framerate: number(FramerateFPS) | undefined,
             bitrate: number(BitrateKbps) | undefined,
             keyFrameInterval: number(KeyFrameIntervalSecond) | undefined
            }

            object(Resolution)::
              {
               width: number(WidthPX),
               height: number(HeightPX)
              }
       */
    this.mediaInfo = function() {
      let mediaInfo = JSON.parse(JSON.stringify(streamInfo.media));
      if (mediaInfo.audio && mediaInfo.audio.optional) {
        mediaInfo.audio.transcoding = mediaInfo.audio.optional;
        delete mediaInfo.audio.optional;
      }
      if (mediaInfo.video && mediaInfo.video.optional) {
        mediaInfo.video.transcoding = mediaInfo.video.optional;
        delete mediaInfo.video.optional;
      }
      if (mediaInfo.video && mediaInfo.video.transcoding && mediaInfo.video.transcoding
        .parameters.bitrate) {
        mediaInfo.video.transcoding.parameters.bitrateMultiplier = Array.from(
          mediaInfo.video.transcoding.parameters.bitrate, bitrate =>
          extractBitrateMultiplier(bitrate));
        mediaInfo.video.transcoding.parameters.bitrateMultiplier.push(1.0);
        mediaInfo.video.transcoding.parameters.bitrateMultiplier = mediaInfo.video
          .transcoding.parameters.bitrateMultiplier.sort();
        delete mediaInfo.video.transcoding.parameters.bitrate;
      }
      return mediaInfo;
    };

    if (streamInfo.type === 'forward') {
      this.from = streamInfo.info.owner;
    } else if (streamInfo.type === 'mixed') {
      this.from = 'mcu';
    }
    var listeners = {};
    var self = this;
    Object.defineProperties(this, {
      /**
         * @function on
         * @desc This function registers a listener for a specified event, which would be called when the event occurred.
      <br><b>Remarks:</b><br>
      Reserved events from MCU:<br>
      @htmlonly
      <table class="doxtable">
      <thead>
        <tr><th align="center">Event Name</th><th align="center">Description</th><th align="center">Status</th></tr>
      </thead>
      <tbody>
        <tr><td align="center"><code>VideoLayoutChanged</code></td><td align="center">Video layout of the mix (remote) stream changed</td><td align="center">stable</td></tr>
        <tr><td align="center"><code>VideoEnabled</code></td><td align="center">Video track of the remote stream enabled</td><td align="center">stable</td></tr>
        <tr><td align="center"><code>VideoDisabled</code></td><td align="center">Video track of the remote stream disabled</td><td align="center">stable</td></tr>
        <tr><td align="center"><code>AudioEnabled</code></td><td align="center">Audio track of the remote stream enabled</td><td align="center">stable</td></tr>
        <tr><td align="center"><code>AudioDisabled</code></td><td align="center">Audio track of the remote stream disabled</td><td align="center">stable</td></tr>
      </tbody>
      </table>
      @endhtmlonly
      User-defined events and listeners are also supported, See {@link Woogeen.RemoteStream#emit stream.emit(event, data)} method.
         * @memberOf Woogeen.RemoteStream
         * @param {string} event Event name.
         * @param {function} listener(data) Callback function.
         * @instance
         * @example
      <script type="text/JavaScript">
      if (stream.isMixed()) {
        stream.on('VideoLayoutChanged', function () {
          L.Logger.info('stream', stream.id(), 'video layout changed');
        });
      }
      </script>
         */
      on: {
        get: function() {
          return function(event, listener) {
            listeners[event] = listeners[event] || [];
            listeners[event].push(listener);
            return self;
          };
        }
      },
      /**
       * @function emit
       * @desc This function triggers a specified event, which would invoke corresponding event listener(s).
       * @memberOf Woogeen.RemoteStream
       * @param {string} event Event name.
       * @param {user-defined} data Data fed to listener function.
       * @instance
       */
      emit: {
        get: function() {
          return function(event) {
            if (listeners[event]) {
              var args = [].slice.call(arguments, 1);
              listeners[event].map(function(fn) {
                fn.apply(self, args);
              });
            }
            return self;
          };
        }
      },
      /**
       * @function removeListener
       * @desc This function removes listener(s) for a specified event. If listener is unspecified, all the listener(s) of the event would be removed; or if the listener is in the event listener list, it would be removed; otherwise this function does nothing.
       * @memberOf Woogeen.RemoteStream
       * @param {string} event Event name.
       * @param {function} listener Corresponding callback function (optional).
       * @instance
       */
      removeListener: {
        get: function() {
          return function(event, cb) {
            if (cb === undefined) {
              listeners[event] = [];
            } else {
              if (listeners[event]) {
                listeners[event].map(function(fn, index) {
                  if (fn === cb) {
                    listeners[event].splice(index, 1);
                  }
                });
              }
            }
            return self;
          };
        }
      },
      /**
       * @function clearListeners
       * @desc This function removes all registered listener(s) for all events on the stream.
       * @memberOf Woogeen.RemoteStream
       * @instance
       */
      clearListeners: {
        get: function() {
          return function() {
            listeners = {};
            return self;
          };
        }
      }
    });
  }

  function WoogeenRemoteMixedStream(streamInfo) {
    WoogeenRemoteStream.call(this, streamInfo);
    /**
     * @function resolutions
     * @desc This function returns an array of supported resolutions for mixed stream.
     * @memberOf Woogeen.RemoteMixedStream
     * @instance
     * @return {Array}
     */
    this.resolutions = function() {
      let resolutions = [];
      if (!streamInfo.media.video || !streamInfo.media.video.parameters) {
        return resolutions;
      }
      // Base resolution.
      if (streamInfo.media.video.parameters.resolution) {
        resolutions.push(streamInfo.media.video.parameters.resolution);
      }
      // Optional resolution.
      if (streamInfo.media.video.optional && streamInfo.media.video.optional.parameters &&
        streamInfo.media.video.optional.parameters.resolution) {
        resolutions = resolutions.concat(streamInfo.media.video.optional.parameters
          .resolution);
      }
      return resolutions;
    };

    this.isMixed = function() {
      return true;
    };

    this.viewport = function() {
      return streamInfo.info.label;
    };
  }

  function WoogeenExternalStream(spec) {
    this.url = function() {
      if (typeof spec.url === 'string' && spec.url !== '') {
        return spec.url;
      }
      return undefined;
    };
    /* @function id
   * @desc This function returns stream Id assigned by server.
<br><b>Remarks:</b><br>
For unpublished external stream, it returns null if the stream has not been published; once published, stream Id should be updated by server.
   * @memberOf Woogeen.ExternalStream
   * @instance
   * @return {string} Stream Id assigned by server.
   * @example
<script type="text/JavaScript">
L.Logger.info('stream added:', stream.id());
</script>
   */
    this.id = function() {
      return spec.id || null;
    };
    // Actually, we don't know whether this external stream has audio/video, but publish function will not publish audio/video if hasAudio/hasVideo returns false.
    this.hasVideo = function() {
      return !!spec.video;
    };
    this.hasAudio = function() {
      return !!spec.audio;
    };
    this.attributes = function() {
      return spec.attributes;
    };
    this.toJson = function() {
      var videoOpt;
      if (spec.video === true) {
        videoOpt = {
          device: 'camera',  // Keep it for backward compatible.
          source: 'camera'
        };
      } else if (spec.video === false) {
        videoOpt = spec.video;
      } else if (typeof spec.video === 'object') {
        videoOpt = spec.video;
        videoOpt.device = spec.video.device || 'camera';
      }
      return {
        id: this.id(),
        audio: spec.audio,
        video: videoOpt,
        url: this.url()
      };
    };
  }

  WoogeenLocalStream.prototype = Object.create(WoogeenStream.prototype);
  WoogeenRemoteStream.prototype = Object.create(WoogeenStream.prototype);
  WoogeenRemoteMixedStream.prototype = Object.create(WoogeenRemoteStream.prototype);
  WoogeenExternalStream.prototype = Woogeen.EventDispatcher({});
  WoogeenLocalStream.prototype.constructor = WoogeenLocalStream;
  WoogeenRemoteStream.prototype.constructor = WoogeenRemoteStream;
  WoogeenRemoteMixedStream.prototype.constructor = WoogeenRemoteMixedStream;
  WoogeenExternalStream.prototype.constructor = WoogeenExternalStream;


  function isLegacyChrome() {
    return window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) !== null &&
      window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] <= 35;
  }

  function isFirefox() {
    return window.navigator.userAgent.match("Firefox") !== null;
  }

  function canShareScreen() {
    return isFirefox() ||
      (window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./) !== null &&
        window.navigator.appVersion.match(/Chrome\/([\w\W]*?)\./)[1] >= 34);
  }

  function getReso(w, h) {
    return {
      width: w,
      height: h
    };
  }

  var supportedVideoList = {
    'true': {},
    'unspecified': {},
    'sif': getReso(320, 240),
    'vga': getReso(640, 480),
    'hd720p': getReso(1280, 720),
    'hd1080p': getReso(1920, 1080)
  };

  /*
  createLocalStream({
    video: {
      device: 'camera',
      resolution: {width: 1280, height: 720},
      frameRate: 24
    },
    audio: true,
    attribtues: null
  }, function () {});
  */
  function createLocalStream(option, callback) {
    option = JSON.parse(JSON.stringify(option));
    if (typeof option === 'object' && option !== null && option.url !==
      undefined) {
      var warnMessage =
        'URL for LocalStream is deprecated, please use ExternalStream instead.';
      if (typeof console.warn === 'function') {
        console.warn(warnMessage);
      } else {
        L.Logger.warning(warnMessage);
      }
      var localStream = new Woogeen.LocalStream(option);
      if (typeof callback === 'function') {
        callback(null, localStream);
      }
      return;
    }
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !==
      'function') {
      if (typeof callback === 'function') {
        callback({
          code: 1100,
          msg: 'Media capturing support is not available.'
        });
      }
      return;
    }
    var init_retry = arguments[3];
    if (init_retry === undefined) {
      init_retry = 2;
    }
    var mediaOption = {};

    if (option !== null && typeof option === 'object') {
      if (!option.audio && !option.video) {
        if (typeof callback === 'function') {
          callback({
            code: 1107,
            msg: 'At least one of audio and video must be requested.'
          });
        }
        return;
      }

      if (option.video) {
        if (typeof option.video !== 'object' && !!option.video) {
          option.video = Object.create({});
        }
        if (typeof option.video.device !== 'string') {
          option.video.device = 'camera';
        }

        if (option.video.device === 'screen') {
          if (!canShareScreen()) {
            if (typeof callback === 'function') {
              callback({
                code: 1103,
                msg: 'browser screen sharing not supported'
              });
              return;
            }
          }
        }

        if (typeof option.video.resolution === 'object' && option.video.resolution
          .width !== undefined && option.video.resolution.height !==
          undefined) {
          mediaOption.video = JSON.parse(JSON.stringify(getReso(option.video.resolution
            .width, option.video.resolution.height)));
        } else {
          L.Logger.warning('Expressing an resolution in string is deprecated, please use an object like {width: 1280, height: 720} instead.');
          mediaOption.video = JSON.parse(JSON.stringify(supportedVideoList[
            option.video.resolution] || supportedVideoList.unspecified));
        }

        if (typeof option.video.deviceId === 'string') {
          mediaOption.video.deviceId = option.video.deviceId;
        }

        if (!isLegacyChrome()) {
          if (option.video.frameRate instanceof Array && option.video.frameRate
            .length >= 2) {
            mediaOption.video.frameRate = {
              min: option.video.frameRate[0],
              max: option.video.frameRate[1]
            };
          } else if (typeof option.video.frameRate === 'number') {
            mediaOption.video.frameRate = option.video.frameRate;
          } else {
            L.Logger.warning('Invalid frame rate value, ignored.');
          }
        }
      }

      if (typeof option.audio === 'object') {
        mediaOption.audio = option.audio;
      } else if (option.audio === true) {
        mediaOption.audio = true;
      }
    } else {
      if (typeof callback === 'function') {
        callback({
          code: 1107,
          msg: 'USER_INPUT_INVALID'
        });
        return;
      }
    }

    var onSuccess = function(mediaStream) {
      if (!(typeof option.video === 'object' && option.video.device ===
          'screen')) {
        // Check whether the media stream has audio/video track as requested.
        if ((option.audio && mediaStream.getAudioTracks().length === 0) ||
          (
            option.video && mediaStream.getVideoTracks().length === 0)) {
          for (var i = 0; i < mediaStream.getTracks().length; i++) {
            mediaStream.getTracks()[i].stop();
          }
          var err = {
            code: 1104,
            msg: 'Not all device requests are satisfied.'
          };
          callback(err);
          return;
        }
      }

      option.mediaStream = mediaStream;
      option.id = mediaStream.id;
      var localStream = new Woogeen.LocalStream(option);
      // Fire 'Ended' when all tracks are ended.
      mediaStream.getTracks().forEach((track) => {
        track.onended = function() {
          if (mediaStream.getTracks().every((track) => {
            return track.readyState === 'ended';
          })) {
            const evt = new Woogeen.StreamEvent({
              type: 'Ended',
              stream: localStream
            });
            localStream.dispatchEvent(evt);
          }
        };
      });
      if (mediaOption.video) {
        // set default bit rate
        switch (mediaOption.video.width) {
          case 320:
            localStream.bitRate.maxVideoBW = 512;
            break;
          case 640:
            localStream.bitRate.maxVideoBW = 1024;
            break;
          case 1280:
            localStream.bitRate.maxVideoBW = 2048;
            break;
          default:
            // localStream.bitRate.maxVideoBW = undefined;
            break;
        }
      }
      if (typeof callback === 'function') {
        callback(null, localStream);
      }
    };

    var onFailure = function(error) {
      var err = {
        code: 1100,
        msg: error.name || error
      };
      switch (err.msg) {
        // below - internally handled
        case 'Starting video failed': // firefox: camera possessed by other process?
        case 'TrackStartError': // chrome: probably resolution not supported
          option.video = {
            device: option.video.device,
            extensionId: option.video.extensionId
          };
          if (init_retry > 0) {
            setTimeout(function() {
              createLocalStream(option, callback, init_retry - 1);
            }, 1);
            return;
          } else {
            err.msg = 'MEDIA_OPTION_INVALID';
            err.code = 1104;
          }
          break;
          // below - exposed
        case 'DevicesNotFoundError': // chrome
          err.msg = 'DEVICES_NOT_FOUND';
          err.code = 1102;
          break;
        case 'NotSupportedError': // chrome
          err.msg = 'NOT_SUPPORTED';
          err.code = 1105;
          break;
        case 'PermissionDeniedError': // chrome
          err.msg = 'PERMISSION_DENIED';
          err.code = 1101;
          break;
        case 'PERMISSION_DENIED': // firefox
          err.code = 1101;
          break;
        case 'ConstraintNotSatisfiedError': // chrome
          err.msg = 'CONSTRAINT_NOT_SATISFIED';
          err.code = 1106;
          break;
        default:
          if (!err.msg) {
            err.msg = 'UNDEFINED';
          }
      }
      if (typeof callback === 'function') {
        callback(err);
      }
    };

    if (option.video && option.video.device === 'screen') {
      if (isFirefox()) {
        if (mediaOption.video !== undefined) {
          mediaOption.video.mediaSource = 'window' || 'screen';
        } else {
          mediaOption.video = {
            mediaSource: 'window' || 'screen'
          };
        }
        return navigator.mediaDevices.getUserMedia(mediaOption).then(
          mediaStream => {
            onSuccess(mediaStream);
          }).catch(err => {
            onFailure(err);
          });
      }
      if (!option.video.extensionId) {
        L.Logger.warning('Please provide extension ID for desktop sharing.');
      }
      var extensionId = option.video.extensionId ||
        'pndohhifhheefbpeljcmnhnkphepimhe';
      var desktopCaptureSources = ['screen', 'window', 'tab'];
      if (option.audio) {
        desktopCaptureSources.push('audio');
      }
      try {
        chrome.runtime.sendMessage(extensionId, {
          getStream: desktopCaptureSources
        }, function(response) {
          if (response === undefined) {
            if (typeof callback === 'function') {
              callback({
                code: 1103,
                msg: 'screen sharing plugin inaccessible'
              });
            }
            return;
          }
          if (option.audio && typeof response.options !== 'object') {
            L.Logger.warning(
              'Desktop sharing with audio requires the latest Chrome extension. Your audio options will be ignored.'
            );
          }
          if (option.audio && (typeof response.options === 'object' && response
              .options.canRequestAudioTrack)) {
            mediaOption.audio = {
              mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: response.streamId
              }
            };
          } else {
            delete mediaOption.audio;
          }
          mediaOption.video.mandatory = mediaOption.video.mandatory || {};
          mediaOption.video.mandatory.chromeMediaSource = 'desktop';
          mediaOption.video.mandatory.chromeMediaSourceId = response.streamId;
          // Transfrom new constraint format to the old style. Because chromeMediaSource only supported in the old style, and mix new and old style will result type error: "Cannot use both optional/mandatory and specific or advanced constraints.".
          if (mediaOption.video.height) {
            mediaOption.video.mandatory.maxHeight = mediaOption.video.mandatory
              .minHeight = mediaOption.video.height;
            delete mediaOption.video.height;
          }
          if (mediaOption.video.width) {
            mediaOption.video.mandatory.maxWidth = mediaOption.video.mandatory
              .minWidth = mediaOption.video.width;
            delete mediaOption.video.width;
          }
          if (mediaOption.video.frameRate) {
            if (typeof mediaOption.video.frameRate === 'object') {
              mediaOption.video.mandatory.minFrameRate = mediaOption.video
                .frameRate
                .min;
              mediaOption.video.mandatory.maxFrameRate = mediaOption.video
                .frameRate
                .max;
            } else if (typeof mediaOption.video.frameRate === 'number') {
              mediaOption.video.mandatory.minFrameRate = mediaOption.video
                .frameRate;
              mediaOption.video.mandatory.maxFrameRate = mediaOption.video
                .frameRate;
            } else {
              L.Logger.warning(
                'Invalid frame rate value for screen sharing.');
            }
            delete mediaOption.video.frameRate;
          }
          return navigator.mediaDevices.getUserMedia(mediaOption).then(
            mediaStream => {
              onSuccess(mediaStream);
            }).catch(err => {
              onFailure(err);
            });
        });
      } catch (err) {
        if (typeof callback === 'function') {
          callback({
            code: 1103,
            msg: 'screen sharing plugin inaccessible',
            err: err
          });
        }
      }
      return;
    }

    navigator.mediaDevices.getUserMedia(mediaOption).then(
      mediaStream => {
        onSuccess(mediaStream);
      }).catch(err => {
        onFailure(err);
      });
  }
  /**
     * @function create
     * @desc This factory returns a Woogeen.LocalStream instance with user defined options.<br>
  <br><b>Remarks:</b><br>
  Creating LocalStream requires secure connection(HTTPS). When one or more parameters cannot be satisfied, or end user denied to grant mic/camera permission, failure callback will be triggered.
  <br><b>options:</b>
  <ul>
      <li>audio: true/false. Default is false. If video source is desktop sharing, setting audio to true allows end user to share desktop with selected app/tab/system's audio. Desktop sharing with audio only works on Chrome.</li>
      <li>video: boolean or object. Default is false. If the value is a boolean, it indicates whether video is enabled or not. If the value is an object, it may have following properties: device, resolution, frameRate, extensionId, deviceId.</li>
          <ul>
              <li>Valid device list:</li>
                  <ul>
                      <li>'camera' for stream from camera;</li>
                      <li>'screen' for stream from screen;</br>
                      Video quality may not good if screen sharing stream is published with H.264.</li>
                  </ul>
              <li>resolution is an object has two properties: width and height. Both of them are numbers.</li>
              <li>frameRate is a number indicating frames per second. Actual frame rate on browser may not be exactly the same as specified here.</li>
              <li>extensionId is the ID of Chrome Extension for screen sharing. </li>
              <li>deviceId is an identifier for the source of the MediaStreamTrack. It only works when input source is mic or camera. You can use <code>MediaDevices.enumerateDevices()</code> to get the list of available devices.</li>
          </ul>
  </ul>
  <br><b>callback:</b>
  <br>Upon success, err is null, and localStream is an instance of Woogeen.LocalStream; upon failure localStream is undefined and err is one of the following:<br>
  <ul>
    <li><b>code: 1100</b> - general stream creation error, e.g., no WebRTC support in browser, uncategorized error, etc.</li>
    <li><b>code: 1101</b> – access media (camera, microphone, etc) denied.</li>
    <li><b>code: 1102</b> – no camera or microphone available.</li>
    <li><b>code: 1103</b> - error in accessing screen sharing plugin: not supported, not installed or disabled.</li>
    <li><b>code: 1104</b> – video/audio parameters are invalid on browser and fallback fails.</li>
    <li><b>code: 1105</b> - media option not supported by the browser.</li>
    <li><b>code: 1106</b> – one of the mandatory constraints could not be satisfied.</li>
    <li><b>code: 1107</b> – user input media option is invalid.</li>
  </ul>
     * @memberOf Woogeen.LocalStream
     * @static
     * @param {json} options Stream creation options.
     * @param {function} callback callback(err, localStream) will be invoked when LocalStream creation is done.
     * @example
  <script type="text/javascript">
  // LocalStream
  var localStream;
  Woogeen.LocalStream.create({
    video: {
      device: 'camera',
      resolution: {width: 1280, height: 720},
    },
    audio: true
  }, function (err, stream) {
    if (err) {
      return console.log('create LocalStream failed:', err);
    }
    localStream = stream;
  });
  </script>
     */
  WoogeenLocalStream.create = function() {
    createLocalStream.apply(this, arguments);
  };

  /*
  createExternalStream({
    url:'http://www.example.com/'
  }, function () {});
  */
  function createExternalStream(option, callback) {
    if (typeof option !== 'object' || !option.url) {
      if (typeof callback === 'function') {
        callback({
          code: 1107,
          msg: 'External stream must have url property'
        });
      }
      return;
    }
    if (!option.audio && !option.video) {
      if (typeof callback === 'function') {
        callback({
          code: 1107,
          msg: 'External stream must have video or audio'
        });
      }
      return;
    }
    var externalStream = new Woogeen.ExternalStream(option);
    if (typeof callback === 'function') {
      callback(null, externalStream);
    }
    return;
  }

  /**
     * @function create
     * @desc This factory returns a Woogeen.ExternalStream instance with user defined options.<br>
  <br><b>options:</b>
  <ul>
      <li>url: RTSP stream URL</li>
      <li>video: boolean or object. Default is false. If the value is a boolean, it indicates whether video is enabled or not. If the value is an object, it may have device property ,e.g.,{device: 'camera'} indicates the stream is from camera.</li>
      <li>audio: true/false. Default is false.</li>
      <li><b>Note:</b>if both video and audio are false or undefined, it will fail to publish an ExternalStream.</li>
  </ul>
  <br><b>callback:</b>
  <br>Upon success, err is null, and externalStream is an instance of Woogeen.ExternalStream; upon failure externalStream is undefined and err is one of the following:<br>
  <ul>
    <li><b>{code: 1107, msg: 'USER_INPUT_INVALID'}</b> – user input media option is invalid.</li>
  </ul>
     * @memberOf Woogeen.ExternalStream
     * @static
     * @param {json} options Stream creation options.The options must have url property and must have video or audio.
     * @param {function} callback callback(err, externalStream) will be invoked when ExternalStream creation is done.
     * @example
  <script type="text/javascript">
  // ExternalStream
  var externalStream;
  Woogeen.ExternalStream.create({
    url: 'http://www.example.com/camera',
    video: true,
    audio: true
  }, function (err, stream) {
    if (err) {
      return console.log('create ExternalStream failed:', err);
    }
    externalStream = stream;
  });
  </script>
     */
  WoogeenExternalStream.create = function() {
    createExternalStream.apply(this, arguments);
  };

  Woogeen.Stream = WoogeenStream;

  /**
   * @class Woogeen.LocalStream
   * @extends Woogeen.Stream
   * @classDesc Stream from browser constructed from camera, screen... Use create(options, callback) factory to create an instance.
   */
  Woogeen.LocalStream = WoogeenLocalStream;
  /**
   * @class Woogeen.RemoteStream
   * @extends Woogeen.Stream
   * @classDesc Stream from server retrieved by 'stream-added' event. RemoteStreams are automatically constructed upon the occurrence of the event.
  <br><b>Example:</b>

  ~~~~~~~{.js}
  <script type="text/javascript">
  conference.on('stream-added', function (event) {
    var remoteStream = event.stream;
    console.log('stream added:', stream.id());
  });
  </script>
  ~~~~~~~

   */
  Woogeen.RemoteStream = WoogeenRemoteStream;
  /**
   * @class Woogeen.RemoteMixedStream
   * @extends Woogeen.RemoteStream
   * @classDesc A RemoteStream whose video track is mixed by server.
   */
  Woogeen.RemoteMixedStream = WoogeenRemoteMixedStream;

  /**
   * @class Woogeen.ExternalStream
   * @classDesc Stream from external input(like rtsp). Use create(options, callback) factory to create an instance.
   */
  Woogeen.ExternalStream = WoogeenExternalStream;

}());