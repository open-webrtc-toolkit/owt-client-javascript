var TestClient = function(user, serverURL, config) {
  if (typeof user === "string" && user.indexOf("http") > -1 && !serverURL && !config) {
    serverURL = user;
    user = undefined;
  } else if (typeof user === "object") {
    config = user;
    user = undefined;
  } else if (typeof user === "string" && user.indexOf("http") < 0 && typeof serverURL === "object") {
    config = serverURL;
    serverURL = undefined;
  } else if (user && user.indexOf("http") > -1 && typeof serverURL === "object") {
    config = serverURL;
    serverURL = user;
    user = undefined;
  }
  this.localStream = undefined;
  if (!config) {
    config = {
      iceServers: [{
        urls: "stun:61.152.239.47"
      }, {
        urls: ["turn:61.152.239.47:4478?transport=udp", "turn:61.152.239.47:443?transport=udp", "turn:61.152.239.47:4478?transport=tcp", "turn:61.152.239.47:443?transport=tcp"],
        credential: "master",
        username: "woogeen"
      }]
    };
  } else {
    config["iceServers"] = [{
      urls: "stun:61.152.239.47"
    }, {
      urls: ["turn:61.152.239.47:4478?transport=udp", "turn:61.152.239.47:443?transport=udp", "turn:61.152.239.47:4478?transport=tcp", "turn:61.152.239.47:443?transport=tcp"],
      credential: "master",
      username: "woogeen"
    }];
  };
  this.peerClient = new Woogeen.PeerClient(config);
  this.serverURL = serverURL || "https://localhost:8096/";
  this.user = user || "user" + new Date().getTime();
  this.request = {};
}

TestClient.prototype = {
  debug: function(title, msg) {
    console.log("TestClient DEBUG MESSAGE: ");
    console.log(title, msg);
  },
  createLocalStream: function(config) {
    if (!config) {
      config = {
        audio: true,
        video: true
      };
    }
    var that = this;
    if (this.localStream) {
      this.localStream = undefined;
    }
    this.request["createLocal_success"] = this.request["createLocal_success"] || 0;
    this.request["createLocal_failed"] = this.request["createLocal_failed"] || 0;
    Woogeen.LocalStream.create(config, function(err, stream) {
      if (err) {
        that.debug("create stream error:", err);
        that.request["createLocal_failed"]++;
        return;
      }
      that.debug("create stream", "success");
      that.localStream = stream;
      that.request["createLocal_success"]++;
      that.showInPage(stream, type);
    }, function(err) {
      that.request["createLocal_failed"]++;
    });
  },
  bindDefaultListener: function(types) {
    var i = 0,
      count = types.length,
      that = this;
    while (i < count) {
      var str = types[i];
      this.request[str + "_success"] = this.request[str + "_success"] || 0;
      this.request[str + "_failed"] = this.request[str + "_failed"] || 0;
      this.peerClient.addEventListener(str, function(e) {
        that.debug(str + "_success", e);
        that.request[str + "_success"]++;
      }, function(e) {
        that.debug(str + "_failed", e);
        that.request[str + "_failed"]++;
      });
      i++;
    }
  },
  bindListener: function(type, seccessCallBack, errCallBack) {
    this.request[type + "_success"] = this.request[type + "_success"] || 0;
    this.request[type + "_failed"] = this.request[type + "_failed"] || 0;
    this.peerClient.addEventListener(type, seccessCallBack, errCallBack);
  },
  connect: function() {
    var that = this;
    this.request["connect_success"] = this.request["connect_success"] || 0;
    this.request["connect_failed"] = this.request["connect_failed"] || 0;
    this.peerClient.connect({
      host: this.serverURL,
      token: this.user
    }, function() {
      that.debug("connect peer", "success");
      that.request["connect_success"]++;
    }, function() {
      that.debug("connect peer", "failed");
      that.request["connect_failed"]++;
    });
  },
  disconnect: function() {
    var that = this;
    this.request["disconnect_success"] = this.request["disconnect_success"] || 0;
    this.request["disconnect_failed"] = this.request["disconnect_failed"] || 0;
    this.peerClient.disconnect(function() {
      that.debug("disconnect peer", "success");
      that.request["disconnect_success"]++;
    }, function() {
      that.debug("disconnect peer", "failed");
      that.request["disconnect_failed"]++;
    });
  },
  accept: function(tc) {
    var that = this;
    this.request["accept_success"] = this.request["accept_success"] || 0;
    this.request["accept_failed"] = this.request["accept_failed"] || 0;
    this.peerClient.accept(tc.user, function() {
      that.debug("accept:", "accept user: " + tc.user + " success");
      that.request["accept_success"]++;
    }, function() {
      that.debug("accept:", "accept user: " + tc.user + " failed");
      that.request["accept_failed"]++;
    });
  },
  deny: function(tc) {
    var that = this;
    this.request["deny_success"] = this.request["deny_success"] || 0;
    this.request["deny_failed"] = this.request["deny_failed"] || 0;
    this.peerClient.deny(tc.user, function() {
      that.debug("deny:", "deny user: " + tc.user + " success");
      that.request["deny_success"]++;
    }, function() {
      that.debug("deny:", "deny user: " + tc.user + " failed");
      that.request["deny_failed"]++;
    });
  },
  invited: function(tc) {
    var that = this;
    this.request["invite_success"] = this.request["invite_success"] || 0;
    this.request["invite_failed"] = this.request["invite_failed"] || 0;
    this.peerClient.invite(tc.user, function() {
      that.debug("invite:", "invite user: " + tc.user + " success");
      that.request["invite_success"]++;
    }, function() {
      that.debug("invite:", "invite user: " + tc.user + " failed");
      that.request["invite_failed"]++;
    });
  },
  publish: function(tc) {
    var that = this;
    this.request["publish_success"] = this.request["publish_success"] || 0;
    this.request["publish_failed"] = this.request["publish_failed"] || 0;
    this.peerClient.publish(this.localStream, tc.user, function() {
      that.debug("publish:", "publish to user: " + tc.user + " success");
      that.request["publish_success"]++;
    }, function() {
      that.debug("publish:", "publish to user: " + tc.user + " failed");
      that.request["publish_failed"]++;
    });
  },
  unpublish: function(tc) {
    var that = this;
    this.request["unpublish_success"] = this.request["unpublish_success"] || 0;
    this.request["unpublish_failed"] = this.request["unpublish_failed"] || 0;
    this.peerClient.unpublish(this.localStream, tc.user, function() {
      that.debug("unpublish:", "unpublish to user: " + tc.user + " success");
      that.request["unpublish_success"]++;
    }, function() {
      that.debug("unpublish:", "unpublish to user: " + tc.user + " failed");
      that.request["unpublish_failed"]++;
    });
  },
  send: function(tc, msg) {
    var that = this;
    this.request["send_success"] = this.request["send_success"] || 0;
    this.request["send_failed"] = this.request["send_failed"] || 0;
    console.log("*********send","tc.user is", tc.user, " msg is ", msg);
    this.peerClient.send(msg, tc.user, function() {
      that.debug("send success:", "send to user: " + tc.user + " success");
      that.request["send_success"]++;
    }, function() {
      that.debug("send fail:", "send to user: " + tc.user + " failed");
      that.request["send_failed"]++;
    });
  },
  stop: function(tc) {
    var that = this;
    this.request["stop_success"] = this.request["stop_success"] || 0;
    this.request["stop_failed"] = this.request["stop_failed"] || 0;
    this.peerClient.stop(tc.user, function() {
      that.debug("stop:", "stop to user: " + tc.user + " success");
      that.request["stop_success"]++;
    }, function() {
      that.debug("stop:", "stop to user: " + tc.user + " failed");
      that.request["stop_failed"]++;
    });
  },
  enableVideo: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.enableVideo();
  },
  disableVideo: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.disableVideo();
  },
  enableAudio: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.enableAudio();
  },
  disableAudio: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.disableAudio();
  },
  hasVideo: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.hasVideo();
  },
  hasAudio: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    return stream.hasAudio();
  },
  close: function(tc) {
    tc = tc || this;
    var stream = tc.localStream;
    stream.close();
  },
  showInPage: function(stream, type) {
    var video = document.createElement("video"),
      videoId = type;
    video.setAttribute("id", videoId);
    video.setAttribute("width", "320px");
    video.setAttribute("height", "240px");
    video.setAttribute("class", "video");
    video.setAttribute("autoplay", "autoplay");
    document.body.appendChild(video);
    attachMediaStream(video, stream.mediaStream);
    this.request[videoId] = startDetection(videoId, "320", "240");
  },
  removeVideo: function(stream, type) {
    var videos = document.getElementsByClassName("video");
    if (stream) {
      videos = [document.getElementById(type)]
    };
    for (var i = 0; i < videos.length; i++) {
      document.body.removeChild(videos[i]);
    };
  },
  videoPlaying: function() {
    return isVideoPlaying();
  },
  getRequest: function() {
    return this.request;
  },
  clearClient: function() {
    if (this.peerClient) {
      this.peerClient.disconnect();
    }
    this.peerClient = undefined;
    this.request = undefined;
    this.user = undefined;
    if (this.localStream) {
      this.localStream.close();
    }
    this.localStream = undefined;
    this.removeVideo();
  },
  recreateTestClient: function(user, serverURL, config) {
    if (user && user.indexOf("http") > -1 && !serverURL && !config) {
      serverURL = user;
      user = undefined;
    } else if (typeof user === "object") {
      config = user;
      user = undefined;
    } else if (typeof user === "string" && user.indexOf("http") < 0 && typeof serverURL === "object") {
      config = serverURL;
      serverURL = undefined;
    } else if (user && user.indexOf("http") > -1 && typeof serverURL === "object") {
      config = serverURL;
      serverURL = user;
      user = undefined;
    }
    if (!config) {
      config = {};
    }
    this.peerClient = new Woogeen.PeerClient(config);
    this.serverURL = serverURL || "https://localhost:8096/";
    this.user = user || "user" + new Date().getTime();
    this.request = {};
  }
};

TestClient.prototype.constructor = TestClient;
