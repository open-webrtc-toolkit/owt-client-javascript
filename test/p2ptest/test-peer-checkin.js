describe('P2P JS SDK', function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  function debug(type, msg) {
    console.log(type, msg);
  }
  var deferred = Q.defer();
      console.log(deferred);
      deferred.resolve();
      var thisQ = deferred.promise;
      //debug("thisQ is", thisQ);
      var detection = '';
  var client1RemoteId ='';
  var videoDetection = function(videoId) {
    console.log("videoId is ", videoId);
    window.setTimeout(function() {
      var framechecker = new VideoFrameChecker(
        document.getElementById(videoId));
      framechecker.checkVideoFrame_(); // start it
      window.setTimeout(function() {
        framechecker.stop();
        if (framechecker.frameStats.numFrames > 0) {
          console.log("framechecker frames number > 0, is : ", framechecker.frameStats.numFrames);
          console.log("framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
          console.log("framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
          if ((framechecker.frameStats.numFrozenFrames == 0) && (framechecker.frameStats.numBlackFrames == 0)) {
            detection = true;
          } else {
            console.log("framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
            console.log("framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
            detection = false;
          }
        } else {
          console.log("framechecker frames number < = 0 , is : ", framechecker.frameStats.numFrames);
          detection = false;
        };
      }, 1000);
    }, 1000);
  }

  describe('media stream test', function() {
    var media = undefined;
    beforeEach(function() {
      media = new MediaStreamTest();
    });
    afterEach(function() {
      console.log("afterEach media is ", media);
     // media.client.close();
      media.client.clearClient();
      media = undefined;
      detection = '';
    });
    it("create default video", function(done) {
      thisQ
      .runs(function() {
        media.getCameraDefault();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("create default video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("create 720p video", function(done) {
      thisQ
      .runs(function() {
        media.setCameraResulotion("hd720p");
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("create 720p video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("create error video", function(done) {
      thisQ
      .runs(function() {
        media.setCameraResulotion("123");
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("create error video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("create normal fps video", function(done) {
      thisQ
      .runs(function() {
        media.setCameraFps([10, 20]);
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("create normal fps video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    //?
    it("create error fps video", function(done) {
      thisQ
      .runs(function() {
        media.setCameraFps([-1, -2]);
      })
      .waitsFor(function() {
        return media.client.request["createLocal_failed"] == 1;
      }, [[media.client.request["createLocal_success"], 1, "media.client.request\[\"createLocal_success\"]"]], 6000)
      .runs(function() {
        debug("create error fps video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(0);
        expect(media.client.request["createLocal_failed"]).toEqual(1);
        done();
      });
    });

    it("create max fps video", function(done) {
      thisQ
      .runs(function() {
        media.setCameraFps([100, 1000]);
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("create max fps video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("default camera paraments", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      // .runs(function() {
      //   media.defaultCameraParametes();
      // })
      .waitsFor(function() {
        return media.client.hasVideo() == true;
      }, 'hasVideo should be true', 6000)
      .waitsFor(function() {
        return media.client.hasAudio() == true;
      }, 'hasAudio should be true', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == true;
      }, 'disableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.enableVideo() == true;
      }, 'enableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .waitsFor(function() {
        return media.client.disableAudio() == true;
      }, 'disableAudio should be true', 6000)
      .waitsFor(function(){
        return media.client.enableAudio() == true;
      }, 'enableAudio should be true', 6000)
      .runs(function() {
        debug("default camera paraments media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("audio only camera paraments", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream({
          video: false,
          audio: true
        });
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .runs(function() {
        media.audioOnlyCameraParametes();
      })

      .runs(function() {
        debug("audio only camera paraments media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("video only camera paraments", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream({
          video: true,
          audio: false
        });
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)

      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      // .runs(function() {
      //   media.videoOnlyCameraParametes();
      // })
      .waitsFor(function() {
        return media.client.hasVideo() == true;
      }, 'hasVideo should be true', 6000)
      .waitsFor(function() {
        return media.client.hasAudio() == false;
      }, 'hasAudio should be false', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == true;
      }, 'disableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.enableVideo() == true;
      }, 'enableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .waitsFor(function() {
        return media.client.disableAudio() == false;
      }, 'disableAudio should be false', 6000)
      .waitsFor(function(){
        return media.client.enableAudio() == false;
      }, 'enableAudio should be false', 6000)

      .runs(function() {
        debug("video only camera paraments media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("camera enable video twice", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      // .runs(function() {
      //   media.cameraEnableVideoTwice();
      // })
      .waitsFor(function() {
        return media.client.hasVideo() == true;
      }, 'hasVideo should be true', 6000)
      .waitsFor(function() {
        return media.client.hasAudio() == true;
      }, 'hasAudio should be true', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == true;
      }, 'disableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.enableVideo() == true;
      }, 'enableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.enableVideo() == false;
      }, 'enableVideo twice should be false', 6000)
      .waitsFor(function() {
        return detection === true;
      }, 'detect video is playing', 6000)

      .runs(function() {
        debug("camera enable video twice media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("camera disable video twice", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      // .runs(function() {
      //   media.cameraDisableVideoTwice();
      // })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == true;
      }, 'disableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == false;
      }, 'disableVideo twice should be false', 6000)
      .waitsFor(function() {
        return detection === false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.enableVideo() == true;
      }, 'enableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)

      .runs(function() {
        debug("camera disable video twice media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("camera enable audio twice", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .runs(function() {
        media.cameraEnableAudioTwice();
      })
      .runs(function() {
        debug("camera enable audio twice media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("camera disable audio twice", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .runs(function() {
        media.cameraDisableAudioTwice();
      })
      .runs(function() {
        debug("camera disable audio twice media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });

    it("disable audio and video", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      // .runs(function() {
      //   media.cameraDisableAudioAndVideo();
      // })
      .waitsFor(function() {
        return media.client.hasVideo() == true;
      }, 'hasVideo should be true', 6000)
      .waitsFor(function() {
        return media.client.hasAudio() == true;
      }, 'hasAudio should be true', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.disableVideo() == true;
      }, 'disableVideo should be true', 6000)
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .waitsFor(function() {
        return media.client.disableAudio() == true;
      }, 'enableAudio should be true', 6000)

      .runs(function() {
        debug("disable audio and video media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      })
    });

    it("stream close", function(done) {
      thisQ
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        videoDetection('local');
      })
      .runs(function() {
        media.cameraClose();
      })
      .waitsFor(function() {
        return detection == false;
      }, 'detect video is not playing', 6000)
      .runs(function() {
        media.client.clearClient();
        media.client.recreateTestClient();
      })
      .runs(function() {
        media.client.createLocalStream();
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return media.client.request["createLocal_success"] == 1;
      }, 'create localStream success event', 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect video is playing', 6000)
      .runs(function() {
        debug("stream close media client request:", media.client.request);
        expect(media.client.request["createLocal_success"]).toEqual(1);
        expect(media.client.request["createLocal_failed"]).toEqual(0);
        done();
      });
    });
  });

  describe("peer client invited accept/deny test", function() {
    var client1 = undefined,
      client2 = undefined,
      count = 0;
    beforeEach(function() {
      client1 = new TestClient("user" + count++);
      client2 = new TestClient("user" + count++);
    });
    afterEach(function() {
      client1.disconnect();
      client2.disconnect();
      client1.clearClient();
      client2.clearClient();
      detection = '';
    });

    it("peer login normal", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        debug("peer login normal client1 request:", client1.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        done();
      })
    });

    xit("peer login error ip", function(done) {
      thisQ
      .runs(function() {
        client1.serverURL = "http://123"
        client1.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_failed"] == 1;
      }, 'login failed event', 6000)
      .runs(function() {
        debug("peer login error ip client1 request:", client1.request);
        expect(client1.request["connect_success"]).toEqual(0);
        expect(client1.request["connect_failed"]).toEqual(1);
        done()
      });
    });

    xit("peer login error ip then login normal ip", function(done) {
      thisQ
      .runs(function() {
        client1.serverURL = "http://123"
        client1.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_failed"] == 1;
      }, 'login failed event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(0);
        expect(client1.request["connect_failed"]).toEqual(1);
      })
      .runs(function() {
        client1.serverURL = "http://localhost:8095/";
        client1.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        debug("peer login error ip then login normal ip client1 request:", client1.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(1);
        done();
      });
    });

    it("peer invite", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, 'client1 invite event', 6000)
      .runs(function() {
        debug("peer invite client1 request:", client1.request);
        debug("peer invite client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        done();
      });
    });

    it("peer invite empty user", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client1.invited({
          user: ""
        });
      })
      .waitsFor(function() {
        return client1.request["invite_failed"] == 1;
      }, 'client1 invite event', 6000)
      .runs(function() {
        debug("peer invite empty user client1 request:", client1.request);
        debug("peer invite empty user client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(1);
        done();
      });
    });

    it("peer invite and accept", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.accept(client1);
        });
        client1.bindDefaultListener(["chat-started"]);
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, 'client1 chat-started success event', 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, 'accept success event', 6000)
      .runs(function() {
        debug("peer invite and accept client1 request:", client1.request);
        debug("peer invite and accept client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        done();
      });
    });

    it("peer invite and accept then invite twice", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'client1 login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'client2 login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.accept(client1);
        });
        client1.bindListener("chat-started", function() {
          client1.request["chat-started_success"]++;
        }, function() {
          client1.request["chat-started_failed"]++;
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, 'chat-started success event', 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_failed"] == 1;
      }, 'client1 invite failed event', 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, 'client2 accept success event', 6000)
      .runs(function() {
        debug("peer invite and accept then invite twice client1 request:", client1.request);
        debug("peer invite and accept then invite twice client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(1);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      })
    });
    it("login same id", function(done) {
      thisQ
      .runs(function() {
        client2.user = client1.user;
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        debug("login same id client1 request:", client1.request);
        debug("login same id client2 request:", client2.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
        done();
      })
    });

    it("disconnect before login", function(done) {
      thisQ
      .runs(function() {
        client1.disconnect();
        client2.disconnect();
      })
      .waitsFor(function() {
        return client1.request["disconnect_failed"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["disconnect_failed"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["disconnect_success"]).toEqual(0);
        expect(client1.request["disconnect_failed"]).toEqual(1);
        expect(client2.request["disconnect_success"]).toEqual(0);
        expect(client2.request["disconnect_failed"]).toEqual(1);
      })
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        debug("disconnect before login client1 request:", client1.request);
        debug("disconnect before login client2 request:", client2.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
        done();
      });
    });
});

describe("peer client and media stream test", function() {
    var client1 = undefined,
      client2 = undefined,
      count = 0;
    beforeEach(function() {
      client1 = new TestClient("user1");
      client2 = new TestClient("user2");
    });
    afterEach(function() {
      client1.disconnect();
      client2.disconnect();
      client1.clearClient();
      client2.clearClient();
      detection = '';
      client1RemoteId = '';
    });

    //unpublish
    it("publish and unpublish video only", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream({
          video: true,
          audio: false
        });
      })
      .runs(function() {
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'detect local video is playing for video only stream', 10000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
           console.log("get RemoteStream id is ", e.stream.id());
           client1RemoteId = "remote"+e.stream.id();
           client2.showInPage(e.stream, "remote"+e.stream.id());
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream, client1RemoteId);
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
        });
        client1.bindDefaultListener(["chat-started"]);
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat invieted success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat started success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
       videoDetection(client1RemoteId);
      })
      .waitsFor(function() {
        return detection == true;
      }, "remote Stream is playing for video only stream", 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "client2 stream removed event", 6000)
       .runs(function(){
            detection = '';
            videoDetection(client1RemoteId);
       })
       .waitsFor(function(){
       return detection === false;
       }, 'detect remote video is not playing for video only stream', 6000)
      .runs(function() {
        debug("publish and unpublish video only client1 request:", client1.request);
        debug("publish and unpublish video only client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client2.request["stream-added_failed"]).toEqual(0);
        expect(client2.request["stream-removed_failed"]).toEqual(0);
        done();
      });
    });

    it("publish and unpublish audio only", function(done) {
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream({
          video: false,
          audio: true
        });
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          client2.showInPage(e.stream);
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream);
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
        });
        client1.bindDefaultListener(["chat-started"]);
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat invited success", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat started success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "client2 stream removed success event", 6000)
      .runs(function() {
        debug("publish and unpublish audio only client1 request:", client1.request);
        debug("publish and unpublish audio only client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client2.request["stream-added_failed"]).toEqual(0);
        expect(client2.request["stream-removed_failed"]).toEqual(0);
        done();
      });
    });

    it("publish with option zero maxVideoBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxVideoBW: 0
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .runs(function(){
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream successful", 6000)
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing for option zero maxVideoBW', 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
           console.log("get RemoteStream id is ", "remote"+e.stream.id());
           client1RemoteId = "remote"+e.stream.id();
           client2.showInPage(e.stream, "remote"+e.stream.id());
        });
        client2.bindListener("stream-removed", function(e) {
          client1.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream, 'remote'+e.stream.id());
        });
        client1.bindListener("chat-started", function() {
          client1.request["chat-started_success"]++;
          client1.publish(client2);
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "client2 accept success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing for option zero maxVideoBW', 6000)
      .runs(function() {
        debug("publish with option zero maxVideoBW client1 request:", client1.request);
        debug("publish with option zero maxVideoBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    //Set local description failed.
    xit("publish with option zero maxAudioBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxAudioBW: 0
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          client2.showInPage(e.stream);
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream);
        });
        client1.bindListener("chat-started", function() {
          client1.request["chat-started_success"]++;
          client1.publish(client2);
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        debug("publish with option zero maxAudioBW client1 request:", client1.request);
        debug("publish with option zero maxAudioBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    it("publish with option normal maxVideoBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxVideoBW: 500
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .runs(function(){
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing for option normal maxVideoBW')
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          console.log('get remote stream');
          client1RemoteId = 'remote' + e.stream.id();
          client2.showInPage(e.stream, 'remote'+e.stream.id());
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream, client1RemoteId);
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
          client1.request["chat-started_success"]++;
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing for option normal maxVideoBW', 6000)
      .runs(function() {
        debug("publish with option normal maxVideoBW client1 request:", client1.request);
        debug("publish with option normal maxVideoBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    //Set local description failed.
    xit("publish with option normal maxAudioBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxAudioBW: 50
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          client2.showInPage(e.stream);
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream);
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
          console.log('++++++++++++++++++++++++++++++++++')
          client1.request["chat-started_success"]++;
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        debug("publish with option normal maxAudioBW client1 request:", client1.request);
        debug("publish with option normal maxAudioBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    it("publish with option big maxVideoBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxVideoBW: 50000
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .runs(function(){
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing for option big maxVideoBW', 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          console.log('get remote stream');
          client1RemoteId = 'remote' + e.stream.id();
          client2.showInPage(e.stream, 'remote'+e.stream.id());
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream, 'remote'+e.stream.id());
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
          client1.request["chat-started_success"]++;
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing for option big maxVideoBW', 6000)
      .runs(function() {
        debug("publish with option big maxVideoBW client1 request:", client1.request);
        debug("publish with option big maxVideoBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    //Set local description failed.
    xit("publish with option big maxAudioBW", function(done) {
      thisQ
      .runs(function() {
        client1 = new TestClient({
          bandWidth: {
            maxAudioBW: 50000
          }
        });
      })
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
          client2.accept(client1);
        });
        client2.bindListener("stream-added", function(e) {
          client2.request["stream-added_success"]++;
          client2.showInPage(e.stream);
        });
        client2.bindListener("stream-removed", function(e) {
          client2.request["stream-removed_success"]++;
          //client2.removeVideo(e.stream);
        });
        client1.bindListener("chat-started", function() {
          client1.publish(client2);
          client1.request["chat-started_success"]++;
        });
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        debug("publish with option big maxAudioBW client1 request:", client1.request);
        debug("publish with option big maxAudioBW client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });
});

  describe("peer client function test suit 1", function() {
    var client1 = undefined,
      client2 = undefined,
      client1Peer = undefined,
      client2Peer = undefined,
      sender = undefined,
      client1_datasender = undefined,
      client1_data = undefined;

    beforeEach(function(done) {
      client1 = new TestClient("user1");
      client2 = new TestClient("user2");
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .runs(function(){
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return detection == true;
      }, 'local video is playing', 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
        });
        client2.bindListener("chat-denied", function(e) {
          client2.request["chat-denied_success"]++;
        });
        client2.bindListener("stream-added", function(e) {
          client2.showInPage(e.stream, 'remote'+e.stream.id());
          console.log('get remote stream');
          client1RemoteId = 'remote' + e.stream.id();
          client2.request["stream-added_success"]++;
        });
        client2.bindListener("stream-removed", function(e) {
          //client2.removeVideo(e.stream, 'remote'+e.stream.id());
          client2.request["stream-removed_success"]++;
        });
        client1.bindListener("chat-started", function(e) {
          client1.request["chat-started_success"]++;
        });
        client2.bindListener("chat-started", function(e) {
          client2.request["chat-started_success"]++;
          sender = e.senderId;
          client1Peer = e.peerId;
        });
        client1.bindListener("chat-stopped", function(e) {
          client1.request["chat-stopped_success"]++;
          sender = e.senderId;
          client1Peer = e.peerId;
        });
        client2.bindListener("chat-stopped", function(e) {
          client2.request["chat-stopped_success"]++;
        });
        client1.bindListener("server-disconnected", function(e) {
          client1.request["server-disconnected_success"]++;
        });
        client2.bindListener("server-disconnected", function(e) {
          client2.request["server-disconnected_success"]++;
        });
         client1.bindListener("data-received", function(e) {
          client1.request["data-received_success"]++;
          client1_datasender = e.senderId;
          client1_data = e.data;
        });
         client2.bindListener("data-received", function(e) {
          client2.request["data-received_success"]++;
          client2_datasender = e.senderId;
          client2_data = e.data;
        })
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event should equal 1", 6000)
     .runs(function() {
        done();
      });
    });
    afterEach(function() {
      client1.disconnect();
      client2.disconnect();
      client1.clearClient();
      client2.clearClient();
      detection = '';
      client1RemoteId = '';
    });

    //unpublish
    it("publish and unpublish", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "publish success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "stream-removed event", 6000)
            .runs(function(){
              detection = '';
              videoDetection(client1RemoteId);
            })
            .waitsFor(function(){
              return detection === false;
            }, 'remote video is not playing', 6000)
      .runs(function() {
        debug("publish and unpublish client1 request:", client1.request);
        debug("publish and unpublish client2 request:", client2.request);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client2.request["stream-removed_failed"]).toEqual(0);
        expect(client2.request["stream-added_failed"]).toEqual(0);
        done();
      });
    });

    it("unpublish before publish", function(done) {
      debug("run case", "unpublish before publish");
      thisQ
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_failed"] == 1;
      }, "client1 unpublish failed event", 6000)
      .runs(function() {
        debug("unpublish client1 request:", client1.request);
        debug("unpublish client2 request:", client2.request);
        expect(client1.request["unpublish_success"]).toEqual(0);
        expect(client1.request["unpublish_failed"]).toEqual(1);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client2.request["chat-started_success"]).toEqual(1);
        expect(client2.request["chat-started_failed"]).toEqual(0);
        done();
      });
    });

    it("publish twice", function(done) {
      debug("run case", "publish twice");
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, 'publish first time event', 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
      })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, 'publish second time fail event', 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("publish twice client1 request:", client1.request);
        debug("publish twice client2 request:", client2.request);
        console.log("publish twice request:", client1.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client2.request["chat-invited_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    //unpublish
    it("rePublish after unpublish", function(done) {
      debug("run case", "rePublish after unpublish");
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publishsuccess event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream-added event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "client1 unpublish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "client2 stream removed event", 6000)
              .runs(function(){
                detection = '';
                videoDetection(client1RemoteId);
              })
              .waitsFor(function(){
                return detection === false;
              }, 'remote video is not playing', 6000)
              .runs(function(){
                document.getElementById(client1RemoteId).remove();
              })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 2;
      }, "client1 publish success event equal 2", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 2;
      }, "client2 stream-added event equal 2 after republish", 6000)
      .waits('test', 2000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("rePublish client1 request:", client1.request);
        debug("rePublish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(2);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client2.request["stream-added_success"]).toEqual(2);
        done();
      });
    });

    it("close and publish", function(done) {
      debug("run case", "close and publish");
      thisQ
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish fail event", 6000)
      .runs(function() {
        debug("close and publish client1 request:", client1.request);
        debug("close and publish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client2.request["chat-invited_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        done();
      });
    });

    //unpublish close
    it("close , create media stream and  publish", function(done) {
      debug("run case", "close ,create media stream and publish");
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.close();
      })
        .runs(function(){
          detection = '';
          videoDetection('local');
        })
        .waitsFor(function(){
          return detection === false;
        }, 'local video is not playing', 6000)
        .runs(function(){
          document.getElementById('local').remove();
        })
          .runs(function(){
            detection = '';
            videoDetection(client1RemoteId);
          })
          .waitsFor(function(){
            return detection === false;
          }, 'remote video is not playing', 6000)
      .runs(function() {
        client1.createLocalStream();
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 2;
      }, "create localStream success event", 6000)
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 2;
      }, "second time publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 2;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("close and create publish client1 request:", client1.request);
        debug("close and create publish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(2);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["chat-invited_failed"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        expect(client1.request["chat-started_success"]).toEqual(1);
        expect(client1.request["chat-started_failed"]).toEqual(0);
        done();
      });
    });

    it("unpublish publish after close", function(done) {
      thisQ
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_failed"] == 1;
      }, "clien1 unpublish failed event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish failed event", 6000)
      .runs(function() {
        debug("unpublish publish after close client1 request:", client1.request);
        debug("unpublish publish after close client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["unpublish_success"]).toEqual(0);
        expect(client1.request["unpublish_failed"]).toEqual(1);
        expect(client2.request["stream-removed_success"]).toEqual(0);
        expect(client2.request["stream-added_success"]).toEqual(0);
        done();
      });
    });

    //unpublish close
    it("close create different stream type rePublish", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event should equal 1", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.close();
      })
        .runs(function(){
          detection = '';
          videoDetection('local');
        })
        .waitsFor(function(){
          return detection === false;
        }, 'local video is not playing', 6000)
        .runs(function(){
          document.getElementById('local').remove();
        })
          .runs(function(){
            detection = '';
            videoDetection(client1RemoteId);
          })
          .waitsFor(function(){
            return detection === false;
          }, 'remote video is not playing', 6000)
      .runs(function() {
        client1.createLocalStream({
          video: true,
          audio: false
        });
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 2;
      }, "create localStream success event", 6000)
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 2;
      })
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 2;
      }, "client2 stream added success event should equal 2", 6000)
      .waits('test', 2000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("close create different stream type rePublish client1 request:", client1.request);
        debug("close create different stream type rePublish client2 request:", client2.request);
        expect(client1.request["createLocal_failed"]).toEqual(0);
        expect(client1.request["publish_success"]).toEqual(2);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client2.request["stream-added_success"]).toEqual(2);
        done();
      });
    });

    it("send data", function(done) {
      thisQ
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()");
        //client1.send(client2, "english");
      })
      .waitsFor(function() {
        return client1.request["send_success"] == 1;
      }, "client1 send success event", 6000)
      .waitsFor(function() {
        return client2.request["data-received_success"] == 1;
      }, "client2 data-received success event", 6000)
      .runs(function() {
        client2.send(client1, "中文 ～！@＃¥％……&＊（）");
      })
      .waitsFor(function() {
        return client2.request["send_success"] == 1;
      }, "client2 send success event", 6000)
      .waitsFor(function() {
        return client1.request["data-received_success"] == 1;
      }, "client1 data-received success event", 6000)
      .runs(function() {
        debug("send data client1 request:", client1.request);
        debug("send data client2 request:", client2.request);
        expect(client1.request["data-received_success"]).toEqual(1);
        expect(client1.request["data-received_failed"]).toEqual(0);
        expect(client2.request["data-received_success"]).toEqual(1);
        expect(client2.request["data-received_failed"]).toEqual(0);
        expect(client1_datasender).toEqual("user2");
        expect(client1_data).toEqual("中文 ～！@＃¥％……&＊（）");
        expect(client2_datasender).toEqual("user1");
        expect(client2_data).toEqual("english ~!#$%^&*()");
        done();
      });
    });

   it("disableVideo after publish", function(done) {
    thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.disableVideo();
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function(){
        return detection === false;
      }, 'local video is not playing', 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection === false;
      }, 'remote video is not playing', 6000)
      .runs(function() {
        debug("disableVideo after publish client1 request:", client1.request);
        debug("disableVideo after publish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("publish after disableVideo enableVideo", function(done) {
      thisQ
      .runs(function() {
        client1.disableVideo();
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function(){
        return detection === false
      }, 'local video is not playing', 6000)
      .runs(function() {
        client1.enableVideo();
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function(){
        return detection == true;
      }, 'local video is playing', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("publish after disableVideo enableVideo client1 request:", client1.request);
        debug("publish after disableVideo enableVideo client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("publish after disableVideo", function(done) {
      thisQ
      .runs(function() {
        client1.disableVideo();
      })
      .runs(function(){
        detection = '';
        videoDetection('local');
      })
      .waitsFor(function(){
        return detection === false
      }, 'local video is not playing', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection === false;
      }, 'remote video is not playing', 6000)
      .runs(function() {
        debug("publish after disableVideo client1 request:", client1.request);
        debug("publish after disableVideo client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("disableAudio after publish", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.disableAudio();
      })
      .runs(function() {
        debug("disableAduio after publish client1 request:", client1.request);
        debug("disableAduio after publish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("publish after disableAduio enableAudio", function(done) {
      thisQ
      .runs(function() {
        client1.disableAudio();
      })
      .runs(function() {
        client1.enableAudio();
      })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        debug("publish after disableAduio enableAudio client1 request:", client1.request);
        debug("publish after disableAduio enableAudio client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("publish after disableAduio", function(done) {
      thisQ
      .runs(function() {
        client1.disableAudio();
      })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "accept success event", 6000)
      .runs(function() {
        debug("publish after disableAudio client1 request:", client1.request);
        debug("publish after disableAudio client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

    it("publish after close", function(done) {
      thisQ
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "publish failed event", 6000)
      .runs(function() {
        debug("publish after close client1 request:", client1.request);
        debug("publish after close client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        done();
      });
    });

    //unpublish close
    it("unpublish after close", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.close();
      })
            .runs(function(){
              detection = '';
              videoDetection(client1RemoteId);
            })
            .waitsFor(function(){
              return detection === false;
            }, 'remote video is not playing', 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "client1 unpublish failed event", 6000)
      .runs(function() {
        debug("unpublish after close client1 request:", client1.request);
        debug("unpublish after close client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        done();
      });
    });

    it("unpublish after disableVideo", function(done) {
      thisQ
      .runs(function(){
        client1.publish(client2);        
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        client1.disableVideo();
      })
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection === false;
      }, 'remote video is not playing', 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
      .runs(function() {
        debug("unpublish after disableVideo client1 request:", client1.request);
        debug("unpublish after disableVideo client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        done();
      });
    });

    it("unpublish after disableAduio", function(done) {
      debug("RunCase: ", "unpublish after disableAduio");
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.disableAudio();
      })
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
      .runs(function() {
        debug("unpublish after disableAduio client1 request:", client1.request);
        debug("unpublish after disableAduio client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        done();
      });
    });

    it("unpublish before publish", function(done) {
      thisQ
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_failed"] == 1;
      }, "unpublish failed event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "publish failed event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function(){
        detection = '';
        videoDetection(client1RemoteId);
      })
      .waitsFor(function(){
        return detection == true;
      }, 'remote video is playing', 6000)
      .runs(function() {
        debug("unpublish before publish client1 request:", client1.request);
        debug("unpublish before publish client2 request:", client2.request);
        expect(client1.request["unpublish_success"]).toEqual(0);
        expect(client1.request["unpublish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        done();
      });
    });

  });

  describe("peer client function test 2", function() {
    var client1 = undefined,
      client2 = undefined,
      sender = undefined,
      client1Peer = undefined,
      client2Peer = undefined,
      client1_datasender = undefined,
      client2_datasender = undefined,
      client1_data = undefined,
      client2_data = undefined;

    beforeEach(function(done) {
      client1 = new TestClient("user1");
      client2 = new TestClient("user2");
      thisQ
      .runs(function() {
        client1.connect();
        client2.connect();
        client1.createLocalStream();
      })
      .waitsFor(function() {
        return client1.request["createLocal_success"] == 1;
      }, "create localStream success event", 6000)
      .waitsFor(function() {
        return client1.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 1;
      }, 'login successful event', 6000)
      .runs(function() {
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(1);
        expect(client2.request["connect_failed"]).toEqual(0);
      })
      .runs(function() {
        client2.bindListener("chat-invited", function(e) {
          client2.request["chat-invited_success"]++;
        });
        client1.bindListener("chat-denied", function(e) {
          client1.request["chat-denied_success"]++;
        });
         client2.bindListener("chat-denied", function(e) {
          client2.request["chat-denied_success"]++;
        });
        client2.bindListener("stream-added", function(e) {
          client2.showInPage(e.stream, 'remote'+e.stream.id());
          console.log('get remote stream');
          client1RemoteId = 'remote' + e.stream.id();
          client2.request["stream-added_success"]++;
        });
        client2.bindListener("stream-removed", function(e) {
          //client2.removeVideo(e.stream, 'remote'+e.stream.id());
          client2.request["stream-removed_success"]++;
        });
        client1.bindListener("chat-started", function(e) {
          client1.request["chat-started_success"]++;
        });
        client2.bindListener("chat-started", function(e) {
          client2.request["chat-started_success"]++;
        });
         client1.bindListener("chat-stopped", function(e) {
          client1.request["chat-stopped_success"]++;
           sender = e.senderId;
          client1Peer = e.peerId;
        });
        client2.bindListener("chat-stopped", function(e) {
          client2.request["chat-stopped_success"]++;
           sender = e.senderId;
          client2Peer = e.peerId;
        });
        client1.bindListener("server-disconnected", function(e) {
          client1.request["server-disconnected_success"]++;
        });
        client2.bindListener("server-disconnected", function(e) {
          client2.request["server-disconnected_success"]++;
        });
         client1.bindListener("data-received", function(e) {
          client1.request["data-received_success"]++;
          client1_datasender = e.senderId;
          client1_data = e.data;
        });
         client2.bindListener("data-received", function(e) {
          client2.request["data-received_success"]++;
          client2_datasender = e.senderId;
          client2_data = e.data;
        });
        done();
      });

    });
    afterEach(function() {
      client1.disconnect();
      client2.disconnect();
      client1.clearClient();
      client2.clearClient();
    });

    it("publish before invite", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat started success event", 6000)
       .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .runs(function() {
        debug("publish before invite client1 request:", client1.request);
        debug("publish before invite client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_success"]).toEqual(0);
        done();
      });
    });

    it("publish before peer login", function(done) {
      thisQ
      .runs(function() {
        client2.disconnect();
      })
      .waitsFor(function() {
        return client2.request["disconnect_success"] == 1;
      }, 'client2 disconnect successful event', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, 'client1 publish failed event', 6000)
      .runs(function() {
        client2.connect();
      })
      .waitsFor(function() {
        return client2.request["connect_success"] == 2;
      }, 'client2 login successful event', 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat started success event", 6000)
       .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat started success event", 6000)
      .runs(function() {
        debug("publish before peer login client1 request:", client1.request);
        debug("publish before peer login client2 request:", client2.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(2);
        expect(client2.request["connect_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(0);
        done();
      });
    });

    it("publish unpublish before invited", function(done) {
      thisQ
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, 'publish failed event', 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_failed"] == 1;
      }, 'unpublish failed event', 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event should equal 1", 6000)
      .runs(function() {
        debug("publish unpublish before invited client1 request:", client1.request);
        debug("publish unpublish before invited client2 request:", client2.request);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(0);
        expect(client2.request["chat-invited_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        expect(client1.request["invite_failed"]).toEqual(0);
        done();
      });
    });

    it("publish before accept", function(done) {
      debug("RunCase","publish before accept");
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 chat-invited event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, 'client1 publish fail event', 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event should equal 1", 6000)
      .runs(function() {
        debug("publish before accept client1 request:", client1.request);
        debug("publish before accept client2 request:", client2.request);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(0);
        done();
      });
    });

    it("publish close before accept", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, 'client2 receive chat-invited event', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish failed event", 6000)
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
       .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event should equal 1", 6000)
      .runs(function() {
        debug("publish close before accept client1 request:", client1.request);
        debug("publish close before accept client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        done();
      });
    });

    it("publish before deny", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, 'client2 receive chat-invited event', 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish failed event", 6000)
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "deny success event", 6000)
       .waitsFor(function() {
        return client1.request["chat-denied_success"] == 1;
      }, "client1 get chat denied event", 6000)
      .runs(function() {
        debug("publish before deny client1 request:", client1.request);
        debug("publish before deny client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        done();
      });
    });

    it("publish before deny invited and accept then publish", function(done) {
      thisQ
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_failed"] == 1;
      }, "client2 deny failed event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "client1 publish failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "client2 receive invite event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "client2 accept success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        debug("publish before deny invited and accept then publish client1 request:", client1.request);
        debug("publish before deny invited and accept then publish client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(1);
        done();
      });
    });

    it("invited and deny", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "client2 deny event", 6000)
      .waitsFor(function() {
        return client1.request["chat-denied_success"] == 1;
      }, "client1 get chat denied event", 6000)
      .runs(function() {
        debug("invited and deny client1 request:", client1.request);
        debug("invited and deny client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client2.request["deny_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["deny_failed"]).toEqual(0);
        done();
      });
    });

    it("invited and deny publish", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "client2 deny success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-denied_success"] == 1;
      }, "client1 get chat denied event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "publish failed event", 6000)
      .runs(function() {
        debug("invited and deny publish client1 request:", client1.request);
        debug("invited and deny publish client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["deny_failed"]).toEqual(0);
        expect(client2.request["deny_success"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        done();
      });
    });

    it("publish close before deny", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_failed"] == 1;
      }, "deny failed event", 6000)
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "deny failed event", 6000)
      .runs(function() {
        debug("publish close before deny client1 request:", client1.request);
        debug("publish close before deny client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["publish_failed"]).toEqual(1);
        expect(client1.request["publish_success"]).toEqual(0);
        done();
      });
    });

    it("close before invited", function(done) {
      thisQ
      .runs(function() {
        client1.close();
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        debug("close before invited client1 request:", client1.request);
        debug("close before invited client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      });
    });

    it("accept before invited", function(done) {
      thisQ
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_failed"] == 1;
      }, "accept failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        debug("accept before invited client1 request:", client1.request);
        debug("accept before invited client2 request:", client2.request);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        done();
      });
    });

    it("accept before invited then invited and accept", function(done) {
      thisQ
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_failed"] == 1;
      }, "accept failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
     .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 2;
      }, "invited success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-invited_success"] == 2;
      }, "chat-invited event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept failed event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        debug("accept before invited then invited and accept client1 request:", client1.request);
        debug("accept before invited then invited and accept client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(2);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(1);
        done();
      });
    });

    it("disconnect before invited", function(done) {
      thisQ
      .runs(function() {
        client1.disconnect();
        client2.disconnect();
      })
      .runs(function() {
        expect(client1.request["disconnect_success"]).toEqual(1);
        expect(client1.request["disconnect_failed"]).toEqual(0);
        expect(client2.request["disconnect_success"]).toEqual(1);
        expect(client2.request["disconnect_failed"]).toEqual(0);
      })
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_failed"] == 1;
      }, "invited success event", 6000)
      .runs(function() {
        debug("disconnect before invited client1 request:", client1.request);
        debug("disconnect before invited client2 request:", client2.request);
        expect(client1.request["invite_failed"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(0);
        done();
      });
    });

    it("deny before invited", function(done) {
      thisQ
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_failed"] == 1;
      }, "client2 deny failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "client1 invited success event", 6000)
      .runs(function() {
        debug("deny before invited client1 request:", client1.request);
        debug("deny before invited client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["deny_failed"]).toEqual(1);
        expect(client2.request["deny_success"]).toEqual(0);
        done();
      });
    });

    it("unpublish before invited", function(done) {
      thisQ
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_failed"] == 1;
      }, "unpublish failed event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .runs(function() {
        debug("unpublish before invited client1 request:", client1.request);
        debug("unpublish before invited client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["unpublish_failed"]).toEqual(1);
        expect(client1.request["unpublish_success"]).toEqual(0);
        done();
      });
    });

    it("stop before peer connect", function(done) {
      thisQ
      .runs(function() {
        client2.disconnect();
      })
      .waitsFor(function() {
        return client2.request["disconnect_success"] == 1;
      }, "client2 disconnect success event", 6000)
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_failed"] == 1;
      }, "stop failed event", 6000)
      .runs(function() {
        client2.connect();
      })
      .waitsFor(function() {
        return client2.request["connect_success"] == 2;
      }, "client2 connect success event", 6000)
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept failed event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        debug("stop before connect client1 request:", client1.request);
        debug("stop before connect client2 request:", client2.request);
        expect(client1.request["connect_success"]).toEqual(1);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client1.request["stop_failed"]).toEqual(1);
        expect(client1.request["stop_success"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(2);
        expect(client2.request["connect_failed"]).toEqual(0);
        done();
      });
    });

    it("stop after invited and before peer accept", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invite success event", 6000)
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_success"] == 1;
      }, "stop failed event", 6000)
      .runs(function() {
        debug("stop after invited client1 request:", client1.request);
        debug("stop after invited client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["stop_failed"]).toEqual(0);
        expect(client1.request["stop_success"]).toEqual(1);
        done();
      });
    });

    it("stop after accept", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_success"] == 1;
      }, "stop success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-stopped_success"] == 1;
      }, "client2 chat-stopped success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-stopped_success"] == 1;
      }, "client1 chat-stopped success event", 6000)
      .runs(function() {
        debug("stop after accept client1 request:", client1.request);
        debug("stop after accept client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["stop_success"]).toEqual(1);
        expect(client1.request["stop_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      });
    });

    it("stop after unpublish", function(done) {
    thisQ
     .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "client2 accept success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
       .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "client2 stream-removed success event", 6000)
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_success"] == 1;
      }, "stop success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-stopped_success"] == 1;
      }, "client2 chat-stopped success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-stopped_success"] == 1;
      }, "client1 chat-stopped success event", 6000)
      .runs(function() {
        debug("stop after unpublish client1 request:", client1.request);
        debug("stop after unpublish client2 request:", client2.request);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client1.request["stop_success"]).toEqual(1);
        expect(client1.request["stop_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      });
    });

    it("stop after connect", function(done) {
      thisQ
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_failed"] == 1;
      }, "stop success event", 6000)
      .runs(function() {
        debug("stop after connect client1 request:", client1.request);
        debug("stop after connect client2 request:", client2.request);
        expect(client1.request["stop_success"]).toEqual(0);
        expect(client1.request["stop_failed"]).toEqual(1);
        done();
      });
    });

    it("send before connect", function(done) {
      thisQ
      .runs(function() {
         client2.disconnect();
         client1.disconnect();
      })
       .waitsFor(function() {
        return client1.request["disconnect_success"] == 1;
      }, "client1 disconnect event", 6000)
        .waitsFor(function() {
        return client2.request["disconnect_success"] == 1;
      }, "client2 disconnect event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()");
        client2.send(client1, "中文 ～！@＃¥％……&＊（）");
      })
      .waitsFor(function() {
        return client1.request["send_failed"] == 1;
      }, "client 1 send failed event", 6000)
      .waitsFor(function() {
        return client2.request["send_failed"] == 1;
      }, "client 2 send failed event", 6000)
      .runs(function() {
        client1.connect();
        client2.connect();
      })
      .waitsFor(function() {
        return client1.request["connect_success"] == 2;
      }, 'client1 login successful event', 6000)
      .waitsFor(function() {
        return client2.request["connect_success"] == 2
      }, 'client2 login successful event', 6000)
      .runs(function() {
        debug("send before connect client1 request:", client1.request);
        debug("send before connect client2 request:", client2.request);
        expect(client1.request["connect_success"]).toEqual(2);
        expect(client1.request["connect_failed"]).toEqual(0);
        expect(client1.request["send_failed"]).toEqual(1);
        expect(client1.request["send_success"]).toEqual(0);
        expect(client2.request["connect_success"]).toEqual(2);
        expect(client2.request["connect_failed"]).toEqual(0);
        done();
      });
    });

    it("send after publish", function(done) {
     thisQ
     .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept failed event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_success"] == 1;
      }, "client1 send success event", 6000)
      .waitsFor(function() {
        return client2.request["data-received_success"] == 1;
      }, "client2 data-received success event", 6000)
      .runs(function() {
        client2.send(client1, "中文 ～！@＃¥％……&＊（）");
      })
      .waitsFor(function() {
        return client2.request["send_success"] == 1;
      }, "client2 send success event", 6000)
      .waitsFor(function() {
        return client1.request["data-received_success"] == 1;
      }, "client1 data-received success event", 6000)
      .runs(function() {
        debug("send after publish client1 request:", client1.request);
        debug("send after publish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["send_success"]).toEqual(1);
        expect(client1.request["send_failed"]).toEqual(0);
        expect(client1.request["data-received_success"]).toEqual(1);
        expect(client1.request["data-received_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        expect(client2.request["send_success"]).toEqual(1);
        expect(client2.request["send_failed"]).toEqual(0);
        expect(client2.request["data-received_success"]).toEqual(1);
        expect(client2.request["data-received_failed"]).toEqual(0);
        expect(client1_datasender).toEqual("user2");
        expect(client1_data).toEqual("中文 ～！@＃¥％……&＊（）");
        expect(client2_datasender).toEqual("user1");
        expect(client2_data).toEqual("english ~!#$%^&*()");
        done();
      });
    });

    it("send after unpublish", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept failed event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        client1.publish(client2);
      })
      .waitsFor(function() {
        return client1.request["publish_success"] == 1;
      }, "client1 publish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-added_success"] == 1;
      }, "client2 stream added success event", 6000)
      .runs(function() {
        client1.unpublish(client2);
      })
      .waitsFor(function() {
        return client1.request["unpublish_success"] == 1;
      }, "unpublish success event", 6000)
      .waitsFor(function() {
        return client2.request["stream-removed_success"] == 1;
      }, "client2 stream removed success event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_success"] == 1;
      }, "send success event", 6000)
      .waitsFor(function() {
        return client2.request["data-received_success"] == 1;
      }, "client2 data-received success event", 6000)
      .runs(function() {
        client2.send(client1, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client2.request["send_success"] == 1;
      }, "send success event", 6000)
      .waitsFor(function() {
        return client1.request["data-received_success"] == 1;
      }, "client1 data-received success event", 6000)
      .runs(function() {
        debug("send after unpublish client1 request:", client1.request);
        debug("send after unpublish client2 request:", client2.request);
        expect(client1.request["publish_success"]).toEqual(1);
        expect(client1.request["publish_failed"]).toEqual(0);
        expect(client1.request["unpublish_success"]).toEqual(1);
        expect(client1.request["unpublish_failed"]).toEqual(0);
        expect(client1.request["send_success"]).toEqual(1);
        expect(client1.request["send_failed"]).toEqual(0);
        expect(client1.request["data-received_success"]).toEqual(1);
        expect(client1.request["data-received_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        expect(client2.request["send_success"]).toEqual(1);
        expect(client2.request["send_failed"]).toEqual(0);
        expect(client2.request["data-received_success"]).toEqual(1);
        expect(client2.request["data-received_failed"]).toEqual(0);
        expect(client1.request["send_success"]).toEqual(1);
        expect(client1.request["send_failed"]).toEqual(0);
        expect(client1.request["data-received_success"]).toEqual(1);
        expect(client1.request["data-received_failed"]).toEqual(0);
        expect(client1_datasender).toEqual("user2");
        expect(client1_data).toEqual("english ~!#$%^&*()");
        expect(client2_datasender).toEqual("user1");
        expect(client2_data).toEqual("english ~!#$%^&*()");
        done();
      });
    });

    it("send after stop", function(done) {
      thisQ
     .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
       .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept failed event", 6000)
      .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        client1.stop(client2);
      })
      .waitsFor(function() {
        return client1.request["stop_success"] == 1;
      }, "stop success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-stopped_success"] == 1;
      }, "client 1 get chat stopped success event", 6000)
      .waitsFor(function() {
        return client2.request["chat-stopped_success"] == 1;
      }, "client 2 get chat stopped success event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_failed"] == 1;
      }, "send failed event", 6000)
      .runs(function() {
        debug("send after stop client1 request:", client1.request);
        debug("send after stop client2 request:", client2.request);
        expect(client1.request["send_success"]).toEqual(0);
        expect(client1.request["send_failed"]).toEqual(1);
        expect(client1.request["stop_success"]).toEqual(1);
        expect(client1.request["stop_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      });
    });

    it("send before accept", function(done) {
      thisQ
     .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_failed"] == 1;
      }, "send failed event", 6000)
      .runs(function() {
        client2.accept(client1);
      })
      .waitsFor(function() {
        return client2.request["accept_success"] == 1;
      }, "accept success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-started_success"] == 1;
      }, "client2 chat-started success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-started_success"] == 1;
      }, "client1 chat-started success event", 6000)
      .runs(function() {
        debug("send before accept client1 request:", client1.request);
        debug("send before accept client2 request:", client2.request);
        expect(client1.request["send_success"]).toEqual(0);
        expect(client1.request["send_failed"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["accept_success"]).toEqual(1);
        expect(client2.request["accept_failed"]).toEqual(0);
        done();
      });
    });

    it("send before deny", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_failed"] == 1;
      }, "send failed event", 6000)
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "deny success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-denied_success"] == 1;
      }, "client1 chat-denied success event", 6000)
      .runs(function() {
        debug("send before deny client1 request:", client1.request);
        debug("send before deny client2 request:", client2.request);
        expect(client1.request["send_success"]).toEqual(0);
        expect(client1.request["send_failed"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["deny_success"]).toEqual(1);
        expect(client2.request["deny_failed"]).toEqual(0);
        done();
      });
    });

    it("send after deny", function(done) {
      thisQ
      .runs(function() {
        client1.invited(client2);
      })
      .waitsFor(function() {
        return client1.request["invite_success"] == 1;
      }, "invited success event", 6000)
       .waitsFor(function() {
        return client2.request["chat-invited_success"] == 1;
      }, "chat-invited event", 6000)
      .runs(function() {
        client2.deny(client1);
      })
      .waitsFor(function() {
        return client2.request["deny_success"] == 1;
      }, "deny success event", 6000)
      .waitsFor(function() {
        return client1.request["chat-denied_success"] == 1;
      }, "client1 chat-denied success event", 6000)
      .runs(function() {
        client1.send(client2, "english ~!#$%^&*()")
      })
      .waitsFor(function() {
        return client1.request["send_failed"] == 1;
      }, "send failed event", 6000)
      .runs(function() {
        debug("send after deny client1 request:", client1.request);
        debug("send after deny client2 request:", client2.request);
        expect(client1.request["send_success"]).toEqual(0);
        expect(client1.request["send_failed"]).toEqual(1);
        expect(client1.request["invite_success"]).toEqual(1);
        expect(client1.request["invite_failed"]).toEqual(0);
        expect(client2.request["deny_success"]).toEqual(1);
        expect(client2.request["deny_failed"]).toEqual(0);
        done();
      });
    });

 });
  });
