describe('P2P JS SDK', function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 40000;
  var detection = '';
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
          expect(0).toEqual(1);
          console.log("Test-Error: " + message);
          if (message instanceof Array) {
            for (var i = 0; i < message.length; i++) {
              debugFunction("expect" + message[i][2] + "to equal " + message[i][1], message[i][0]);
              expect(message[i][0]).toEqual(message[i][1]);
            }
          }
        }
      }
      deferred.reject();
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


  var videoDetection = function (stream, canvasElement) {
   let videoCheckMessage = ""
   var deferred = Q.defer();
    window.setTimeout(function () {
      var framechecker = new VideoFrameChecker(stream, canvasElement);
      framechecker.checkVideoFrame_();
      window.setTimeout(function () {
        framechecker.stop();
        if (framechecker.frameStats.numFrames > 0) {
          console.log("Framechecker total frames number is : ", framechecker.frameStats.numFrames - 1);
          console.log("Framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
          console.log("Framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
          if ((framechecker.frameStats.numFrozenFrames === 0) && (framechecker.frameStats.numBlackFrames == 0)) {
            detection = true;
          } else {
            if (framechecker.frameStats.numFrozenFrames !== 0){
                videoCheckMessage = framechecker.frameStats.numFrozenFrames + " freeze frame was detected"
            }
            if (framechecker.frameStats.numBlackFrames == 0) {
                videoCheckMessage = videoCheckMessage + ", " + framechecker.frameStats.numBlackFrames + " black frame was detected"
            }
            detection = false;
          }
        } else {
          console.log("Framechecker frames number is : ", framechecker.frameStats.numFrames);
          videoCheckMessage = "readyState of the MediaStreamTrack provided in the constructor is not live"
          detection = false;
        }
        deferred.resolve(videoCheckMessage);
      }, 4000);
    }, 2000);
    return deferred.promise;
  }

  describe('media stream test', function () {
    var actorUser = undefined;
    var canvasElement = undefined;
    beforeAll(function () {
       console.log("before all")
       canvasElement = document.createElement('canvas');
    })
    beforeEach(function () {
      actorUser = new TestClient(userName1, serverIP);
    });

    afterEach(function () {
      actorUser.close();
      actorUser = undefined;
      detection = '';
    });

    var resolutionList = ["undefined", "vga"];
    for (i = 0; i < resolutionList.length; i++) {
      it('createLocalStream-' + resolutionList[i], function (done) {
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
            resolution = new Owt.Base.Resolution(width, height)
            actorUser.createLocalStream(resolution, undefined);
          })
          .then(function () {
            return waitsFor(function () {
              // check action
              return actorUser.request["createLocal_success"] === 1
            }, userName1 + " create localStream success callback can not trigger", waitInterval)
          })
          .then(function () {
            // action
            detection = "";
            return videoDetection(actorUser.localStream, canvasElement);
          })
          .then(function (videoCheckMessage) {
            return waitsFor(function () {
              //wait lock
              return detection === true;
            }, userName1 + " localStream  check failed because " + videoCheckMessage , waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          return videoDetection(actorUser.localStream, canvasElement);
        })
        .then(function (videoCheckMessage) {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName1 + " localStream  check failed because " + videoCheckMessage, waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          // action
          actorUser.connect();
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_failed"] === 1;
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          // action
          actorUser.connect("234");
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser.request["connect_failed"] === 1;
          }, userName1 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
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
    var canvasElement = undefined;
    beforeAll(function () {
       console.log("before all")
       canvasElement = document.createElement('canvas');
    })

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
          actorUser2 = new TestClient(userName2, serverIP);
          actorUser2.bindListener("serverdisconnected", function (e) {
            actorUser2.request["server-disconnected_success"]++;
          });
          actorUser2.bindListener('streamadded', function (e) {
            console.log("trigger streamadded ")
            actorUser2.request["streamadded_success"]++;
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
          actorUser1.disconnect();
          actorUser1 = undefined
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + " stream-added event can not trigger", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoCheckMessage = ""
          return videoDetection(User2RemoteStream,canvasElement);
        })
        .then(function (videoCheckMessage) {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remoteStream  check failed because " + videoCheckMessage, waitInterval)
        })
        .then(function () {
          actorUser1.close();
          detection = '';
        })
        .then(function () {
          console.log('test end');
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + " stream-added event can not trigger", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoCheckMessage = ""
          return videoDetection(User2RemoteStream,canvasElement);
        })
        .then(function (videoCheckMessage) {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remoteStream check failed because " + videoCheckMessage, waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          var video_result = actorUser2.hasVideo(User2RemoteStream);
          var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
          expect(video_result).toBeTruthy();
          expect(audio_rsult).toBeFalsy();
        })
        .then(function () {
          actorUser1.close();
          detection = '';
        })
        .then(function () {
          console.log('test end');
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] == 1;
          }, userName2 + " stream-added event can not trigger", waitInterval)
        })
        .then(function () {
          var video_result = actorUser2.hasVideo(User2RemoteStream);
          var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
          expect(video_result).toBeFalsy();
          expect(audio_rsult).toBeTruthy();
        })
        .then(function () {
          actorUser1.close();
          detection = '';
        })
        .then(function () {
          console.log('test end');
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " send message success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["data-received_success"] === 1;
          }, userName2 + " messagereceived event can not trigger ", waitInterval)
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
          }, userName2 + " send message success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser1.request["data-received_success"] === 1;
          }, userName1 + " messagereceived event can not trigger", waitInterval)
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + " stream-added event can not trigger", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          videoCheckMessage = ""
          return videoDetection(User2RemoteStream,canvasElement);
        })
        .then(function (videoCheckMessage) {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remoteStream check failed because " + videoCheckMessage, waitInterval)
        })
        .then(function () {
          // action
          actorUser1.unpublish();
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamended_success"] === 1;
          }, userName2 + " stream.ended event can not trigger", waitInterval)
        })
        .then(function () {
          actorUser1.close();
          detection = '';
        })
        .then(function () {
          console.log('test end');
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
          }, userName1 + " login to p2pServer failed", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser2.request["connect_success"] === 1;
          }, userName2 + " login to p2pServer failed", waitInterval)
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
          }, userName1 + " create localStream success callback can not trigger", waitInterval)
        })
        .then(function () {
          //TODO change wrapper of publish
          actorUser1.publish(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check action
            return actorUser1.request["publish_success"] === 1;
          }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamadded_success"] === 1;
          }, userName2 + " stream-added event can not trigger", waitInterval)
        })
        .then(function () {
          // action
          detection = "";
          return videoDetection(User2RemoteStream,canvasElement);
        })
        .then(function (videoCheckMessage) {
          return waitsFor(function () {
            //wait lock
            return detection === true;
          }, userName2 + " remoteStream check failed because " + videoCheckMessage, waitInterval)
        })
        .then(function () {
          // action
          actorUser1.stop(userName2);
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser1.request["publication_end_success"] === 1;
          }, userName1 + " publication.ended event can not trigger", waitInterval)
        })
        .then(function () {
          return waitsFor(function () {
            //check wait
            return actorUser2.request["streamended_success"] === 1;
          }, userName2 + " stream.ended event can not trigger", waitInterval)
        })
        .then(function () {
          actorUser1.close();
          detection = '';
        })
        .then(function () {
          console.log('test end');
          done();
        })
    });
  });

  describe('publish Test', function () {
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
    var canvasElement = undefined;
    beforeAll(function () {
       console.log("before")
       canvasElement = document.createElement('canvas');
    })
    afterEach(function () {
      Q('afterEach')
        .then(function () {
          actorUser2.close();
          actorUser1.close();
          detection = '';
          actorUser1.disconnect();
          actorUser2.disconnect();
          actorUser1 = undefined
          actorUser2 = undefined
        })
    });

    var videoCodecList = ["vp8", "h264"];
    for (i = 0; i < videoCodecList.length; i++) {
      it('publishEachOtherWithCodec-' + videoCodecList[i], function (done) {
        Q('publishEachOther')
          .then(function () {
            // action
            config ={
              videoEncodings:[{
                codec:{
                  name:videoCodecList[i]
                },
                maxBitrate:1000
              }]
            }
            actorUser1 = new TestClient(userName1, serverIP, config);
            actorUser1.bindListener("serverdisconnected", function (e) {
              actorUser1.request["server-disconnected_success"]++;
            });
            actorUser1.bindListener('streamadded', function (e) {
              console.log("trigger streamadded ")
              actorUser1.request["streamadded_success"]++;
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
            actorUser2 = new TestClient(userName2, serverIP, config);
            actorUser2.bindListener("serverdisconnected", function (e) {
             actorUser2.request["server-disconnected_success"]++;
            });
            actorUser2.bindListener('streamadded', function (e) {
             console.log("trigger streamadded ")
             actorUser2.request["streamadded_success"]++;
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
            }, userName1 + " login to p2pServer failed", waitInterval)
          })
          .then(function () {
            return waitsFor(function () {
              //check action
              return actorUser2.request["connect_success"] === 1;
            }, userName2 + " login to p2pServer failed", waitInterval)
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
            }, userName1 + " create localStream success callback can not trigger", waitInterval)
          })
          .then(function () {
            //TODO change wrapper of publish
            actorUser1.publish(userName2);
          })
          .then(function () {
            return waitsFor(function () {
              //check action
              return actorUser1.request["publish_success"] === 1;
            }, userName1 + " publish localStream  success callback can not trigger", waitInterval)
          })
          .then(function () {
            return waitsFor(function () {
              //check wait
              return actorUser2.request["streamadded_success"] === 1;
            }, userName2 + " stream-added event can not trigger", waitInterval)
          })
          .then(function () {
            // action
            detection = "";
            return videoDetection(User2RemoteStream,canvasElement);
          })
          .then(function (videoCheckMessage) {
            return waitsFor(function () {
              //wait lock
              return detection === true;
            }, userName2 + " remoteStream check failed because " + videoCheckMessage, waitInterval)
          })
          .then(function () {
            // action
            actorUser2.createLocalStream();
          })
          .then(function () {
            return waitsFor(function () {
              // check action
              return actorUser2.request["createLocal_success"] === 1
            }, userName1 + " create localStream success callback can not trigger", waitInterval)
          })
          .then(function () {
            //TODO change wrapper of publish
            actorUser2.publish(userName1);
          })
          .then(function () {
            return waitsFor(function () {
              //check action
              return actorUser2.request["publish_success"] === 1;
            }, userName2 + " publish localStream  success callback can not trigger", waitInterval)
          })
          .then(function () {
            return waitsFor(function () {
              //check wait
              return actorUser1.request["streamadded_success"] === 1;
            }, userName1 + " stream-added event can not trigger", waitInterval)
          })
          .then(function () {
            // action
            detection = "";
            return videoDetection(User2RemoteStream,canvasElement);
          })
          .then(function (videoCheckMessage) {
            return waitsFor(function () {
              //wait lock
              return detection === true;
            }, userName1 + " remoteStream check failed because " + videoCheckMessage, waitInterval)
          })
          .then(function () {
            console.log('test end');
            done();
          })
      });
    }
  });

});

