describe('P2P JS SDK', function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  var detection = '';

  function removeVideo() {
    var videos = document.getElementsByClassName("video");
    for (var i = 0; i < videos.length; i++) {
      document.body.removeChild(videos[i]);
    };
  }

  function waitsFor(latch, message, tiout) {
    var timeout;
    var TIMEOUT = 5000;
    var deferred = Q.defer();
    if (!tiout) {
      timeout = TIMEOUT;
    } else {
      timeout = tiout;
    }
    var debugFunction = function (msg, result) {
      console.log('++++ Error message from return  waitsForAndthen:', msg, "actual is ", result);
    };
    var selfTimeOut = setTimeout(function doWaitsFor() {
      clearInterval(interval);
      clearTimeout(selfTimeOut);
      if (message) {
        if (message.length > 0) {
          console.log("Event Error: ", message, "do not triggered after ", tiout);
          expect(0).toEqual(1);
          console.log("Event Error2: ", message, "do not triggered after ", tiout);
          if (message instanceof Array) {
            for (var i = 0; i < message.length; i++) {
              debugFunction("expect" + message[i][2] + "to equal " + message[i][1], message[i][0]);
              expect(message[i][0]).toEqual(message[i][1]);
            }
          }
        }
      }
    }, timeout);
    var interval = setInterval(function () {
      if (latch.call(latch)) {
        clearInterval(interval);
        clearTimeout(selfTimeOut);
        deferred.resolve();
      }
    }, 1);
    return deferred.promise;
  }

  function waits(message, tiout) {
    console.log('waits ' + message + ' for time: ' + tiout);
    var deferred = Q.defer();
    setTimeout(function () {
      deferred.resolve();
    }, tiout);
    return deferred.promise;
  }

  function isChrome() {
    return navigator.userAgent.indexOf('Chrome') >= 0;
  }

  function debug(type, msg) {
    console.log(type, msg);
  }

  var videoDetection = function (streamId) {
    window.setTimeout(function () {
      var framechecker = new VideoFrameChecker(
        document.getElementById(streamId));
      framechecker.checkVideoFrame_();
      window.setTimeout(function () {
        framechecker.stop();
        if (framechecker.frameStats.numFrames > 0) {
          console.log("Framechecker frames number > 0, is : ", framechecker.frameStats.numFrames);
          console.log("Framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
          console.log("Framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
          if ((framechecker.frameStats.numFrozenFrames === 0) && (framechecker.frameStats.numBlackFrames == 0)) {
            detection = true;
          } else {
            console.log("Framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
            console.log("Framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
            detection = false;
          }
        } else {
          console.log("Framechecker frames number < = 0 , is : ", framechecker.frameStats.numFrames);
          detection = false;
        }
      }, 1000);
    }, 1000);
  }

  describe('media stream test', function () {
    var actorUser = undefined;

    beforeEach(function () {
      actorUser = new TestClient(userName1, serverIP);
    });

    afterEach(function () {
      actorUser.close();
      removeVideo();
      detection = '';
    });

    var resolutionList = ["undefined", "vga"];
    for (i = 0; i < resolutionList.length; i++) {
      it('createLocalStreamWith' + resolutionList[i], function (done) {
        Q('createLocalStream')
          .then(function () {
            // start test
            console.log("test:" + resolutionList[i])
            debug(userName1 + "test start!");
          })
          .then(function () {
            // action
            var resolution, width, height;
            if (resolutionList[i] === 'undefined') {
              width = undefined;
              height = undefined;
            } else if (resolutionList[i] === 'vga') {
              width = 640;
              height = 480;
            } else if (resolutionList[i] === 'hd720p') {
              width = 1280;
              height = 720;
            } else if (resolutionList[i] === 'hd1080p') {
              width = 1920;
              height = 1080;
            }
            resolution = new Oms.Base.Resolution(width, height)
            actorUser.createLocalStream(resolution, undefined);
          })
          .then(function () {
            return waitsFor(function () {
              // check action
              return actorUser.request["createLocal_success"] === 1
            }, userName1 + " check action: create localStream ", waitInterval)
          })
          .then(function () {
            // action
            detection = "";
            videoDetection("stream" + actorUser.request["localStreamId"]);
          })
          .then(function () {
            return waitsFor(function () {
              //wait lock
              return detection === true;
            }, userName1 + " create localstream is fail", waitInterval)
          })
          .then(function () {
            waits('test end', 2000)
          })
          .then(function () {
            console.log('test end');
            done();
          })
      });
    }

    it('createCameraStreamWithVideoOnly', function (done) {
      Q('createCameraStreamWithVideoOnly')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        .then(function () {
          // action
          actorUser.createLocalStreamVideoOnly();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + actorUser.request["localStreamId"]);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " create localstream is fail", waitInterval)
        })
        .then(function () {
          var video_result = actorUser.hasVideo(actorUser.localStream);
          var audio_rsult = actorUser.hasAudio(actorUser.localStream);
          expect(video_result).toBeTruthy();
          expect(audio_rsult).toBeFalsy();
        })
        .then(function () {
          return waits('test end', 2000)
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('createCameraStreamWithAudioOnly', function (done) {
      Q('createCameraStreamWithAudioOnly')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        .then(function () {
          // action
          actorUser.createLocalStreamAudioOnly();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          var video_result = actorUser.hasVideo(actorUser.localStream);
          var audio_rsult = actorUser.hasAudio(actorUser.localStream);
          expect(audio_rsult).toBeTruthy();
          expect(video_result).toBeFalsy();
        })
        .then(function () {
          return waits('test end', 2000)
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

  });

  describe('Connect Test', function () {
    var actorUser = undefined;

    beforeEach(function () {
      actorUser = new TestClient(userName1, serverIP);
    });

    afterEach(function () {
      actorUser.disconnect();
    });

    it('connect', function (done) {
      Q('connect')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('conncetWithUndefineName', function (done) {
      Q('conncetWithUndefineName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // // 1. User1Connect
        .then(function () {
          // action
          actorUser.userName = undefined
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('conncetWithNullName', function (done) {
      Q('conncetWithNullName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect(undefined, null);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('conncetWithChineseName', function (done) {
      Q('conncetWithChineseName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          actorUser.connect(undefined, userNameInChinese);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });


    it('conncetWithSymolName', function (done) {
      Q('conncetWithSymolName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect(undefined, userNameInSymol);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('conncetWithEmptyName', function (done) {
      Q('conncetWithEmptyName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect(undefined, "");
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('connectTwiceWithSameName', function (done) {
      Q('connectTwiceWithSameName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_failed"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('connectTwiceWithDifferentName', function (done) {
      Q('connectTwiceWithDifferentName')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser.connect("234");
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_failed"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    it('disconnectWithoutConnection', function (done) {
      Q('disconnectWithoutConnection')
        .then(function () {
          // start test
          debug(userName1 + "test start!");
        })
        .then(function () {
          // action
          actorUser.disconnect();
        })
        // 1. User1Connect
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waits('test end', 2000);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });
  });

  describe('CI Test', function () {
    var actorUser1 = undefined;
    var actorUser2 = undefined;
    var User1RemoteId = "";
    var User1RemoteStream = undefined;
    var User2RemoteId = "";
    var User2RemoteStream = undefined;
    var actorUser1_datasender = undefined;
    var actorUser1_data = undefined;
    var actorUser2_datasender = undefined;
    var actorUser2_data = undefined;
    beforeEach(function () {
      Q('beforeEach')
        .then(function () {
          actorUser1 = new TestClient(userName1, serverIP);
          actorUser1.bindListener("serverdisconnected", function (e) {
            actorUser1.request["server-disconnected_success"]++;
          });
          actorUser1.bindListener('streamadded', function (e) {
            console.log("trigger streamadded ")
            actorUser1.request["streamadded_success"]++;
            actorUser1.showInPage(e.stream);
            e.stream.addEventListener('ended', () => {
              console.log("stream is ended ")
              actorUser1.request["streamended_success"]++;
            })
            User1RemoteId = e.stream.id;
            User1RemoteStream = e.stream;
          });
          actorUser1.bindListener("messagereceived", function (e) {
            actorUser1.request["data-received_success"]++;
            actorUser1_datasender = e.origin;
            actorUser1_data = e.message;
          });
        })
        .then(function () {
          actorUser2 = new TestClient(userName2, serverIP);
          actorUser2.bindListener("serverdisconnected", function (e) {
            actorUser2.request["server-disconnected_success"]++;
          });
          actorUser2.bindListener('streamadded', function (e) {
            console.log("trigger streamadded ")
            actorUser2.request["streamadded_success"]++;
            actorUser2.showInPage(e.stream);
            e.stream.addEventListener('ended', () => {
              console.log("stream is ended ")
              actorUser2.request["streamended_success"]++;
            })
            User2RemoteId = e.stream.id;
            User2RemoteStream = e.stream;
          });
          actorUser2.bindListener("messagereceived", function (e) {
            actorUser2.request["data-received_success"]++;
            actorUser2_datasender = e.origin;
            actorUser2_data = e.message;
          });
        })
    });

    afterEach(function () {
      Q('afterEach')
        .then(function () {
          removeVideo()
        })
        .then(function () {
          actorUser1.disconnect();
          actorUser1 = undefined
        })
        .then(function () {
          actorUser2.disconnect();
          actorUser2 = undefined
        })
    });

    it('publish', function (done) {
      Q('publish')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.createLocalStream();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser1.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + actorUser1.request["localStreamId"]);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " create localstream is fail", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + "check action: publish", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + "check wait: stream-added", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + User2RemoteId);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remote stream is good", waitInterval)
        })
        .then(function () {
          console.log('test end');
          actorUser1.close();
          done();
        })
    });

    it('publishVideoOnly', function (done) {
      Q('publishVideoOnly')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.createLocalStreamVideoOnly();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser1.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + actorUser1.request["localStreamId"]);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " create localstream is fail", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + "check action: publish", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + "check wait: stream-added", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + User2RemoteId);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remote stream is good", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          var video_result = actorUser2.hasVideo(User2RemoteStream);
          var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
          expect(video_result).toBeTruthy();
          expect(audio_rsult).toBeFalsy();
        })
        .then(function () {
          console.log('test end');
          actorUser1.close();
          done();
        })
    });

    it('publishAudioOnly', function (done) {
      Q('publishAudioOnly')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.createLocalStreamAudioOnly();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser1.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + "check action: publish", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] == 1;
          }, userName2 + "check wait: stream-added", waitInterval)
        })
        .then(function () {
          var video_result = actorUser2.hasVideo(User2RemoteStream);
          var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
          expect(video_result).toBeFalsy();
          expect(audio_rsult).toBeTruthy();
        })
        .then(function () {
          console.log('test end');
          actorUser1.close();
          done();
        })
    });

    it('sendEachOther', function (done) {
      Q('sendEachOther')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.send(userName2, sendMsg);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["send_success"] === 1;
          }, userName1 + " check action: send ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["data-received_success"] === 1;
          }, userName2 + "check wait: actorUser data-received ", waitInterval)
        })
        .then(function () {
          expect(actorUser2_datasender).toEqual(userName1);
          expect(actorUser2_data).toEqual(sendMsg);
        })
        .then(function () {
          // action
          actorUser2.send(userName1, sendMsg);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["send_success"] === 1;
          }, userName2 + " check action: send ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser1.request["data-received_success"] === 1;
          }, userName1 + " check wait: actorUser data-received ", waitInterval)
        })
        .then(function () {
          expect(actorUser1_datasender).toEqual(userName2);
          expect(actorUser1_data).toEqual(sendMsg);
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });

    isChrome() && it('unpublish', function (done) {
      Q('unpublish')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.createLocalStream();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser1.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + actorUser1.request["localStreamId"]);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " create localstream is fail", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + "check action: publish", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + "check wait: stream-added", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + User2RemoteId);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remote stream is good", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.unpublish();
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamended_success"] === 1;
          }, userName2 + "check wait: streamended_success", waitInterval)
        })
        .then(function () {
          console.log('test end');
          actorUser1.close()
          done();
        })
    });

    it('stop', function (done) {
      Q('stop')
      // 1. User1Connect
        .then(function () {
          // action
          actorUser1.connect();
        })
        .then(function () {
          // action
          actorUser2.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["connect_success"] === 1;
          }, userName1 + " check action: login ", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " check action: login ", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.replaceAllowedRemoteIds(userName2);
        })
        .then(function () {
          // action
          actorUser2.replaceAllowedRemoteIds(userName1);
        })
        .then(function () {
          // action
          actorUser1.createLocalStream();
        })
        .then(function () {
          return waitsFor(function () {
            // check action
            return actorUser1.request["createLocal_success"] === 1
          }, userName1 + " check action: create localStream ", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + actorUser1.request["localStreamId"]);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " create localstream is fail", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + "check action: publish", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + "check wait: stream-added", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoDetection("stream" + User2RemoteId);
        })
        .then(function () {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remote stream is good", waitInterval)
        })
        .then(function () {
          // action
          actorUser1.stop(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser1.request["publication_end_success"] === 1;
          }, userName1 + "check wait: publication_end_success", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamended_success"] === 1;
          }, userName2 + "check wait: streamended_success", waitInterval)
        })
        .then(function () {
          console.log('test end');
          actorUser1.close()
          done();
        })
    });
  });
});

