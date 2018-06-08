describe('P2P JS SDK', function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000;
  var deferred = Q.defer();
  console.log(deferred);
  deferred.resolve();
  var thisQ = deferred.promise;
  var detection = '';

  function isChrome(){
     if (navigator.userAgent.indexOf('Chrome') >= 0){
        return true;
     }else{
        return false;
     }
  }

  function debug(type, msg) {
    console.log(type, msg);
  }

  var videoDetection = function(streamId) {
    window.setTimeout(function() {
      var framechecker = new VideoFrameChecker(
        document.getElementById(streamId));
      framechecker.checkVideoFrame_();
      window.setTimeout(function() {
        framechecker.stop();
        if (framechecker.frameStats.numFrames > 0) {
          console.log("Framechecker frames number > 0, is : ", framechecker.frameStats.numFrames);
          console.log("Framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
          console.log("Framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
          if ((framechecker.frameStats.numFrozenFrames == 0) && (framechecker.frameStats.numBlackFrames == 0)) {
            detection = true;
          } else {
            console.log("Framechecker numFrozenFrames number  is : ", framechecker.frameStats.numFrozenFrames);
            console.log("Framechecker numBlackFrames number  is : ", framechecker.frameStats.numBlackFrames);
            detection = false;
          }
        } else {
          console.log("Framechecker frames number < = 0 , is : ", framechecker.frameStats.numFrames);
          detection = false;
        };
      }, 1000);
    }, 1000);
  }

  describe('media stream test', function() {
    var actorUser = undefined;

    beforeEach(function() {
      actorUser = new TestClient(userName1, serverIP);
    });

    afterEach(function() {
      actorUser.close();
      actorUser.removeVideo(actorUser.localStream);
      detection = '';
    });

    var resolutionList=new Array("undefined","vga")
    for(let i = 0 ; i<resolutionList.length;i++){
        it('createLocalStreamWith'+resolutionList[i],function(done){
            thisQ
                .runs(function() {
                // start test
                console.log("test:"+resolutionList[i])
                debug(userName1 + "test start!");
                })
                .runs(function() {
                    // action
                    var resolution ,width ,height;
                    if(resolutionList[i] === 'undefined'){
                        width = undefined;
                        height = undefined;
                    }else if(resolutionList[i] === 'vga'){
                        width = 640;
                        height = 480;
                    }else if(resolutionList[i] === 'hd720p'){
                        width = 1280;
                        height = 720;
                    }else if(resolutionList[i] === 'hd1080p'){
                        width = 1920;
                        height = 1080;
                    }
                    resolution = new Ics.Base.Resolution(width,height)
                    actorUser.createLocalStream(resolution ,undefined);
                })
                .waitsFor(function() {
                    // check action
                    return actorUser.request["createLocal_success"] == 1
                }, userName1 + " check action: create localStream ", waitInterval)
                .runs(function() {
                    // action
                    detection = "";
                    videoDetection("stream"+actorUser.request["localStreamId"]);
                })
                .waitsFor(function() {
                    //wait lock
                    return detection == true;
                }, userName1 + " create localstream is fail", waitInterval)
                .waits('test end',2000)
                .runs(function() {
                    console.log('test end');
                    done();
                })
        });
    }

    it('createCameraStreamWithVideoOnly',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            .runs(function() {
                // action
                actorUser.createLocalStreamVideoOnly();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                // action
                detection = "";
                videoDetection("stream"+actorUser.request["localStreamId"]);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName1 + " create localstream is fail", waitInterval)
            .runs(function() {
                var video_result = actorUser.hasVideo(actorUser.localStream);
                var audio_rsult = actorUser.hasAudio(actorUser.localStream);
                expect(video_result).toBeTruthy();
                expect(audio_rsult).toBeFalsy();
            })
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('createCameraStreamWithAudioOnly',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            .runs(function() {
                // action
                actorUser.createLocalStreamAudioOnly();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                var video_result = actorUser.hasVideo(actorUser.localStream);
                var audio_rsult = actorUser.hasAudio(actorUser.localStream);
                expect(audio_rsult).toBeTruthy();
                expect(video_result).toBeFalsy();
            })
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

  });

 describe('Connect Test', function() {
    var actorUser = undefined;

    beforeEach(function() {
      actorUser = new TestClient(userName1, serverIP);
    });

    afterEach(function() {
      actorUser.disconnect();
    });

    it('connect',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('conncetWithUndefineName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.userName = undefined
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('conncetWithNullName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect(undefined,null);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

   it('conncetWithChineseName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                actorUser.connect(undefined,userNameInChinese);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });


   it('conncetWithSymolName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect(undefined,userNameInSymol);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('conncetWithEmptyName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect(undefined,"");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('connectTwiceWithSameName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_failed"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('connectTwiceWithDifferentName',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)

            .runs(function() {
                // action
                actorUser.connect("234");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_failed"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('disconnectWithoutConnection',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(userName1 + "test start!");
            })
            .runs(function() {
                // action
                actorUser.disconnect();
            })
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waits('test end',2000)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
  });

  describe('CI Test', function() {
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
    beforeEach(function() {
        thisQ
        .runs(function() {
            // start test
            actorUser1 = new TestClient(userName1, serverIP);
            actorUser1.bindListener("serverdisconnected", function(e) {
                actorUser1.request["server-disconnected_success"]++;
            });
            actorUser1.bindListener('streamadded', function(e) {
                console.log("trigger streamadded ")
                actorUser1.request["streamadded_success"]++;
                actorUser1.showInPage(e.stream);
                e.stream.addEventListener('ended',()=>{
                    console.log("stream is ended ")
                    actorUser1.request["streamended_success"]++;
                })
                User1RemoteId = e.stream.id;
                User1RemoteStream = e.stream;
            });
            actorUser1.bindListener("messagereceived", function(e) {
                actorUser1.request["data-received_success"]++;
                actorUser1_datasender = e.origin;
                actorUser1_data = e.message;
            });
        })
        .runs(function() {
            actorUser2 = new TestClient(userName2, serverIP);
            actorUser2.bindListener("serverdisconnected", function(e) {
                actorUser2.request["server-disconnected_success"]++;
            });
            actorUser2.bindListener('streamadded', function(e) {
                console.log("trigger streamadded ")
                actorUser2.request["streamadded_success"]++;
                actorUser2.showInPage(e.stream);
                e.stream.addEventListener('ended',()=>{
                    console.log("stream is ended ")
                    actorUser2.request["streamended_success"]++;
                })
                User2RemoteId = e.stream.id;
                User2RemoteStream = e.stream;
            });
            actorUser2.bindListener("messagereceived", function(e) {
                actorUser2.request["data-received_success"]++;
                actorUser2_datasender = e.origin;
                actorUser2_data = e.message;
            });
        })
    });

    afterEach(function() {
      thisQ
       .runs(function() {
            actorUser1.disconnect();
            actorUser1 = undefined
       })
       .runs(function() {
            actorUser2.disconnect();
            actorUser2 = undefined
       })
    });

    it('publish',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)
            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser1.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                // action
                detection = "";
                videoDetection("stream"+actorUser1.request["localStreamId"]);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName1 + " create localstream is fail", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                actorUser1.publish(userName2);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["publish_success"] == 1;
            }, userName1 + "check action: publish", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamadded_success"] == 1;
            }, userName2 + "check wait: stream-added", waitInterval)
            .runs(function() {
                // action
                detection ="";
                videoDetection("stream"+User2RemoteId);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName2 + " remote stream is good", waitInterval)
            .runs(function() {
                actorUser1.close();
                actorUser1.removeVideo(actorUser1.localStream);
                actorUser2.removeVideo(User2RemoteStream)
                detection = '';
            })
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('publishVideoOnly',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)
            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.createLocalStreamVideoOnly();
            })
            .waitsFor(function() {
                // check action
                return actorUser1.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                // action
                detection = "";
                videoDetection("stream"+actorUser1.request["localStreamId"]);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName1 + " create localstream is fail", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                actorUser1.publish(userName2);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["publish_success"] == 1;
            }, userName1 + "check action: publish", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamadded_success"] == 1;
            }, userName2 + "check wait: stream-added", waitInterval)
            .runs(function() {
                // action
                detection ="";
                videoDetection("stream"+User2RemoteId);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName2 + " remote stream is good", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                var video_result = actorUser2.hasVideo(User2RemoteStream);
                var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
                expect(video_result).toBeTruthy();
                expect(audio_rsult).toBeFalsy();
            })
            .runs(function() {
                actorUser1.close();
                actorUser1.removeVideo(actorUser1.localStream);
                actorUser2.removeVideo(User2RemoteStream)
                detection = '';
            })
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('publishAudioOnly',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)
            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.createLocalStreamAudioOnly();
            })
            .waitsFor(function() {
                // check action
                return actorUser1.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                actorUser1.publish(userName2);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["publish_success"] == 1;
            }, userName1 + "check action: publish", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamadded_success"] == 1;
            }, userName2 + "check wait: stream-added", waitInterval)
            .runs(function() {
                var video_result = actorUser2.hasVideo(User2RemoteStream);
                var audio_rsult = actorUser2.hasAudio(User2RemoteStream);
                expect(video_result).toBeFalsy();
                expect(audio_rsult).toBeTruthy();
            })
            .runs(function() {
                actorUser1.close();
                actorUser1.removeVideo(actorUser1.localStream);
                actorUser2.removeVideo(User2RemoteStream)
                detection = '';
            })
            .runs(function() {
                console.log('test end');
                done();
            })
    });

    it('sendEachOther',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)

            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.send(userName2,sendMsg);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["send_success"] == 1;
            }, userName1 + " check action: send ", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser2.request["data-received_success"] == 1;
            }, userName2 + "check wait: actorUser data-received ", waitInterval)
            .runs(function() {
                expect(actorUser2_datasender).toEqual(userName1);
                expect(actorUser2_data).toEqual(sendMsg);
            })
            .runs(function() {
                // action
                actorUser2.send(userName1,sendMsg);
            })
            .waitsFor(function() {
                //check action
                return actorUser2.request["send_success"] == 1;
            }, userName2 + " check action: send ", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser1.request["data-received_success"] == 1;
            }, userName1 + " check wait: actorUser data-received ", waitInterval)
            .runs(function() {
                expect(actorUser1_datasender).toEqual(userName2);
                expect(actorUser1_data).toEqual(sendMsg);
            })
            .runs(function() {
                console.log('test end');
                done();
            })
        });

    isChrome() && it('unpublish',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)

            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser1.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)

            .runs(function() {
                // action
                detection = "";
                videoDetection("stream"+actorUser1.request["localStreamId"]);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName1 + " create localstream is fail", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                actorUser1.publish(userName2);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["publish_success"] == 1;
            }, userName1 + "check action: publish", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamadded_success"] == 1;
            }, userName2 + "check wait: stream-added", waitInterval)
            .runs(function() {
                // action
                detection ="";
                videoDetection("stream"+User2RemoteId);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName2 + " remote stream is good", waitInterval)
            .runs(function() {
                // action
                actorUser1.unpublish();
            })
            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamended_success"] == 1;
            }, userName2 + "check wait: streamended_success", waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
        });

    it('stop',function(done){
        thisQ
            // 1. User1Connect
            .runs(function() {
                // action
                actorUser1.connect();
            })
            .runs(function() {
                // action
                actorUser2.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["connect_success"] == 1;
            }, userName1 + " check action: login ", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser2.request["connect_success"] == 1;
            }, userName2 + " check action: login ", waitInterval)
            .runs(function() {
                // action
                actorUser1.replaceAllowedRemoteIds(userName2);
            })
            .runs(function() {
                // action
                actorUser2.replaceAllowedRemoteIds(userName1);
            })
            .runs(function() {
                // action
                actorUser1.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser1.request["createLocal_success"] == 1
            }, userName1 + " check action: create localStream ", waitInterval)
            .runs(function() {
                // action
                detection = "";
                videoDetection("stream"+actorUser1.request["localStreamId"]);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName1 + " create localstream is fail", waitInterval)
            .runs(function() {
                //TODO change wrapper of publish
                actorUser1.publish(userName2);
            })
            .waitsFor(function() {
                //check action
                return actorUser1.request["publish_success"] == 1;
            }, userName1 + "check action: publish", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamadded_success"] == 1;
            }, userName2 + "check wait: stream-added", waitInterval)
            .runs(function() {
                // action
                detection ="";
                videoDetection("stream"+User2RemoteId);
            })
            .waitsFor(function() {
                //wait lock
                return detection == true;
            }, userName2 + " remote stream is good", waitInterval)
            .runs(function() {
                // action
                actorUser1.stop(userName2);
            })
            .waitsFor(function() {
                //check wait
                return actorUser1.request["publication_end_success"] == 1;
            }, userName1 + "check wait: publication_end_success", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser2.request["streamended_success"] == 1;
            }, userName2 + "check wait: streamended_success", waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
        });
    });
});

