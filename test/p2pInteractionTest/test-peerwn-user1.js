describe('TestDevice1', function() {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;
    //Init Q
    var deferred = Q.defer();
    deferred.resolve();
    var thisQ = deferred.promise;
    //Init variables
    var actorUser = undefined,
        //TODO add check for these spys
        actorUserPeer = undefined,
        sender = undefined,
        actorUser_datasender = undefined,
        actorUser_data = undefined,

        actorUserName = "User1",
        targetUserName = "User2",
        serverIP = 'http://192.168.1.4:8095/',
        waitInterval = 20000;

    beforeEach(function(done) {
        thisQ
            .runs(function() {
                actorUser = new TestClient(actorUserName, serverIP);
                //bind callback listners
                actorUser.bindListener("server-disconnected", function(e) {
                    actorUser.request["server-disconnected_success"]++;
                });
                actorUser.bindListener("chat-invited", function(e) {
                    actorUser.request["chat-invited_success"]++;
                });
                actorUser.bindListener("chat-denied", function(e) {
                    actorUser.request["chat-denied_success"]++;
                });
                actorUser.bindListener("chat-started", function(e) {
                    console.log("chat-started event");
                    actorUser.request["chat-started_success"]++;
                });
                actorUser.bindListener("chat-stopped", function(e) {
                    actorUser.request["chat-stopped_success"]++;
                    sender = e.senderId;
                    actorUserPeer = e.peerId;
                });
                actorUser.bindListener("stream-added", function(e) {
                    actorUser.showInPage(e.stream);
                    actorUser.request["stream-added_success"]++;
                });
                actorUser.bindListener("stream-removed", function(e) {
                    actorUser.removeVideo(e.stream);
                    actorUser.request["stream-removed_success"]++;
                });
                actorUser.bindListener("data-received", function(e) {
                    actorUser.request["data-received_success"]++;
                    actorUser_datasender = e.senderId;
                    actorUser_data = e.data;
                });
            })
            .waitsFor(function () {
                return waitLock('STARTTEST');
            },actorUserName + " wait start message", waitInterval)
            .runs(function () {
                console.log(actorUserName+' start test!');
                done();
            });
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1SendTwoMessagesToUser2
     * 10. User2SendTwoMessagesToUser1
     * 11. User1UnpublishToUser2
     * 12. User2UnpublishToUser1
     * 13. User1StopChatWithUser2
     * 14. User2InviteUser1
     * 15. User1DenyUser2
     * 16. User2Disconnect
     * 17. User1Disconnect
     */
    it('test01_TwoUserInteraction', function(done) {
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            // 10. User2SendTwoMessagesToUser1
            // 11. User1UnpublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })
            // 14. User2InviteUser1
            // 15. User1DenyUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2InviteUser1')
            }, actorUserName + "wait lock: User2InviteUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + "check wait: chat-invited ", waitInterval)
            .runs(function() {
                // action
                actorUser.deny(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["deny_success"] == 1;
            }, actorUserName + " check action: deny ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1DenyUser2');
            })
            // 16. User2Disconnect
            // 17. User1Disconnect
            .waitsFor(function() {
                // wait lock
                return waitLock('User2Disconnect')
            }, actorUserName + " wait lock: User2Disconnect", waitInterval)
            .runs(function() {
                // check wait
                // action
                actorUser.disconnect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["disconnect_success"] == 1;
            }, actorUserName + "check action: disconnect ", waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     */
    it('test02_Peer1InvitePeer2',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2');
            })
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2InviteUser1
     */
    it('test03_Peer2InvitePeer1',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)

            .waitsFor(function(){
                return waitLock('User2InviteUser1');
            },actorUserName+"wait lock: User2InviteUser1",waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     */
    it('test04_Peer1InviteAndPeer2Accept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2InviteUser1
     * 4. User1AcceptUser2
     */
    it('test05_Peer2InviteAndPeer1Accept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + " wait lock: User2InviteUser1 ", waitInterval)

            .waitsFor(function() {
                //check action
                return waitLock('User2InviteUser1');
            }, actorUserName + " wait lock: User2InviteUser1 ", waitInterval)

            .runs(function(){
                actorUser.accept(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["accept_success"] == 1;
            }, actorUserName + "check action: accept", waitInterval)
            .runs(function(){
                notifyLock("User1AcceptUser2");
            })
             .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
             .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })

    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2InviteUser1
     * 4. User1AcceptUser2
     * 5. User2InviteUser1Again
     */
    it('test06_Peer2InviteAndAcceptThenPeer2InviteAgain',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
             .waitsFor(function() {
                // wait lock
                return waitLock('User2InviteUser1');
            }, actorUserName + "wait lock:User2InviteUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + " chat-invited event", waitInterval)
            .runs(function() {
                // action
                actorUser.accept(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["accept_success"] == 1;
            }, actorUserName + "check action: accept", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1AcceptUser2')
            })

            .waitsFor(function() {
                // wait lock
                return waitLock('User2InviteUser1Again');
            }, actorUserName + "wait lock:User2InviteUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + " chat-invited event", waitInterval)
             .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1InviteUser2Again
     */
    it('test07_Peer1InviteAndAcceptThenPeer1InviteAgain',function(done){
        thisQ
           .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function(){
                return waitLock("User2AcceptUser1");
            },actorUserName+"wait lock: User2AcceptUser1",waitInterval)
            //user1 invite user2 again
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_failed"] == 1;
            }, actorUserName + " check action: invite again ", waitInterval)
            .runs(function(){
                notifyLock('User1InviteUser2Again');
            })
             .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })

    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     */
    it('test08_PublishEachOther',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1;
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User1PublishToUser2
     */
    it('test09_Peer1PublishToPeer2',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1;
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
           
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waits("test end",waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User2CreateLocalStream
     * 6. User2PublishToUser1
     */
    it('test10_Peer2PublishToPeer1',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
           

            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
             .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)

            .waits("test end",waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1PublishToUser2Again
     */
    it('test11_Peer1PublishAgain',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_failed"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2Again');
            })
             .waits('test end',waitInterval)
             .runs(function() {
                console.log('test end');
                done();
             })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User2PublishToUser1Again
     */
    it('test12_Peer2PublishAgain',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1Again');
            }, actorUserName + "wait lock: User2PublishToUser1Again", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     */
    it('test13_PublishUnpublishEachOther',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     */
    it('test14_PublishPeer1Unpublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
           
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User2UnpublishToUser1
     */
    it('test15_PublishPeer2Unpublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
             .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)

            
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
        
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User1PublishToUser2Again
     */
    it('test16_PublishUnpublishThenPeer1RePublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1');
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)

            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 2;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1RePublishToUser2');
            })
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User2PublishToUser1Again
     */
    it('test17_PublishUnpublishThenPeer2RePublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)

            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1');
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)

            .waitsFor(function(){
                return waitLock('User2RePublishToUser1');
             },actorUserName + "wait lock: User2RePublishToUser1", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 2;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    }); 
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStreamAudioOnly
     * 6. User2CreateLocalStreamAudioOnly
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     */
    it('test18_PublishAudioOnlyEachOther',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                config = {audio: true,video: false};
                actorUser.createLocalStream(config);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1;
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStreamAudio
     * 6. User1PublishToUser2
     */
    it('test19_Peer1PublishAudioOnly',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                config = {audio: true,video: false};
                actorUser.createLocalStream(config);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1;
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })

            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User2CreateLocalStreamAudio
     * 6. User2PublishToUser1
     */
    it('test20_Peer2PublishAudioOnly',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
          
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User1UnpublishToUser2
     */
    it('test21_Peer1UnpublishBeforePublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_failed"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)

            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })

             .waits('test end',waitInterval)
             .runs(function() {
                console.log('test end');
                done();
             })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2CreateLocalStream
     * 4. User2PublishToUser1
     */
    it('test22_Peer2PublishBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)


            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
        
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 0;
            }, actorUserName + "check wait: stream-added_failed ", waitInterval)
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1CreateLocalStream
     * 4. User1PublishToUser2
     */
    it('test23_Peer1PublishBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)

            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            .runs(function(){
               actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_failed"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2CreateLocalStream
     * 3. User2PublishToUser1
     */
    it('test24_Peer2PublishBeforeLogin',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            .runs(function() {
                // action
                actorUser.connect();
            })
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 0;
            }, actorUserName + "check wait: stream-added_success ", waitInterval)
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User2Connect
     * 2. User1CreateLocalStream
     * 3. User1PublishToUser2
     */
    it('test25_Peer1PublishBeforeLogin',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            .waitsFor(function() {
                //check action
                return waitLock('User2Connect');
            }, actorUserName + "wait lock: User2Connect", waitInterval)

            .runs(function(){
                actorUser.createLocalStream();
            })
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            .waits('waits for notify event',3000)
            .runs(function() {
                
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })            
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_failed"] == 1;
            }, actorUserName + "check action: publish", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2CreateLocalStream
     * 5. User2PublishToUser1
     */
    it('test26_Peer2PublishBeforeAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })

            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waits("sleeping for a while and check up stream-added event", 10000)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 0;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User1CreateLocalStream
     * 5. User1PublishToUser2
     */
    it('test27_Peer1PublishBeforeAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })

            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
         
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_failed"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
        
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2CreateLocalStream
     * 4. User2UnpublishToUser1
     */
    it('test28_Peer2UnpublishBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
           
          
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1');
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 0;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1CreateLocalStream
     * 4. User1UnpublishToUser2
     */
    it('test29_Peer1UnpublishBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })

            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_failed"] == 1;
            }, actorUserName + "check action: unpublish failed ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2InviteUser1
     * 4. User1DenyUser2
     */
    it('test30_Peer2InviteAndDeny',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            // 4. User2InviteUser1
            // 5. User1DenyUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2InviteUser1')
            }, actorUserName + "wait lock: User2InviteUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + "check wait: chat-invited ", waitInterval)
            .runs(function() {
                // action
                actorUser.deny(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["deny_success"] == 1;
            }, actorUserName + " check action: deny ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1DenyUser2');
            })
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2DenyUser1
     */
    it('test31_Peer1InviteAndDeny',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2');
            })

            .waitsFor(function() {
                //wait lock
                return waitLock('User2DenyUser1');
            }, actorUserName + " wait lock: User2DenyUser1 ", waitInterval)

            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 0;
            }, actorUserName + " check wait: chat-started", waitInterval)
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2InviteUser1
     * 4. User1DenyUser2
     * 5. User2CreateLocalStream
     * 6. User2PublishToUser1
     */
    it('test32_Peer2InviteAndPeer1DenyPeer2Publish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
      
            .waitsFor(function() {
                // wait lock
                return waitLock('User2InviteUser1');
            }, actorUserName + "wait lock: User2InviteUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-invited_success"] == 1;
            }, actorUserName + "check wait: chat-invited ", waitInterval)
            .runs(function() {
                // action
                actorUser.deny(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["deny_success"] == 1;
            }, actorUserName + " check action: deny ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1DenyUser2');
            })

            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
         
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 0;
            }, actorUserName + "check wait: stream-added ", waitInterval)

            .waits('wait lock send out', 3000)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2DenyUser1
     * 5. User1CreateLocalStreaM
     * 6. User1PublishToUser2
     */
    it('test33_Peer1InviteAndPeer2DenyPeer1Publish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
      
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })

            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1;
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })

            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_failed"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2AcceptUser1
     */
    it('test34_Peer2AcceptBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 0;
            }, actorUserName + " check wait: chat-started", waitInterval)
          
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1AcceptUser2
     */
    it('test35_Peer1AcceptBeforeInvite',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
           .runs(function(){
                actorUser.accept(targetUserName);
            })
            .waitsFor(function() {
                //check wait
                return actorUser.request["accept_failed"] == 1;
            }, actorUserName + " check wait: accept_failed should be trigger", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1AcceptUser2');
            })
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 0;
            }, actorUserName + " check wait: chat-started", waitInterval)


            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User2AcceptUser1
     * 4. User1InviteUser2
     * 5. User2AcceptUser1
     */
    it('test36_Peer2AcceptBeforeInviteThenInviteAndAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1BeforeInvite');
            }, actorUserName + " wait lock: User2AcceptUser1BeforeInvite", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 0;
            }, actorUserName + " check wait: chat-started", waitInterval)

            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)

          
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User2Connect
     * 2. User1StopChatWithUser2
     */
    it('test37_Peer1StopBeforeConnect',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })

            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_failed"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })

            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2StopChatWithUser1
     */
    it('test38_Peer2StopBeforeConnect',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            .runs(function(){
                waitLock('User2StopUser1');
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
          
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1StopChatWithUser2
     */
    it('test39_Peer1StopAfterAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
          
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })
          
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User2StopChatWithUser1
     */
    it('test40_Peer2StopAfterAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            
            .waitsFor(function() {
                //check wait
                return waitLock('User2StopChatWithUser1');
            }, actorUserName + " check wait: User2StopChatWithUser1", waitInterval)
            .waitsFor(function() {
                //check action
                return actorUser.request["chat-stopped_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1StopChatWithUser2
     */
    it('test41_Peer1StopAfterPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)

            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })

            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })

    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User2StopChatWithUser1
     */
    it('test42_Peer2StopAfterPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)

            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            
            .waitsFor(function() {
                //check action
                return waitLock("User2StopChatWithUser1");
            }, actorUserName + "check action: User2StopChatWithUser1 ", waitInterval)
            .waitsFor(function() {
                //actoin check
                return actorUser.request["chat-stopped_success"] == 1;
            }, actorUserName + "actoin check: chat stopped", waitInterval)
            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User1StopChatWithUser2
     */
    it('test43_Peer1StopAfterUnpublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)

            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User2StopChatWithUser1
     */
    it('test44_Peer2StopAfterUnpublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            .waitsFor(function() {
                //check action
                return waitLock('User2StopChatWithUser1');
            }, actorUserName + "wait lock: User2StopChatWithUser1 ", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-stopped_success"] == 1;
            }, actorUserName + " check wait: chat-stopped ", waitInterval)
            .waits('test end', waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1SendTwoMessagesToUser2
     * 6. User2SendTwoMessagesToUser1
     * 7. User1StopChatWithUser2
     */
    it('test45_Peer1StopAfterSend',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
     
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            // 10. User2SendTwoMessagesToUser1
            // 11. User1UnpublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
            
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
           
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1SendTwoMessagesToUser2
     * 6. User2SendTwoMessagesToUser1
     * 7. User2StopChatWithUser1
     */
    it('test46_Peer2StopAfterSend',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
     
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            // 10. User2SendTwoMessagesToUser1
            // 11. User1UnpublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
            
            .waitsFor(function() {
                //check action
                return waitLock('User2StopChatWithUser1');
            }, actorUserName + "check action: stop ", waitInterval)
           
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1SendTwoMessagesToUser2
     * 6. User2SendTwoMessagesToUser1
     */
    it('test47_SendEachOther',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
           
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            // 10. User2SendTwoMessagesToUser1
            // 11. User1UnpublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)

            .waits('test end', waitInterval)

            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1SendTwoMessagesToUser2
     */
    it('test48_Peer1Send',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
           
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })

            .waits('test end', waitInterval)
          
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
   /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User2SendTwoMessagesToUser1
     */
    it('test49_Peer2Send',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .runs(function() {
                // action
                notifyLock('User1SendMessagesToUser2')
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
             .waitsFor(function() {
                //actoin check
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "actoin check: send message", waitInterval)
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendMessagesToUser1')
            }, actorUserName + "wait lock: User2SendMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
            .waits('test end', waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2SendTwoMessagesToUser1
     */
    it('test50_Peer2SendBeforeConnect',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })

            .runs(function() {
                // check wait
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1Connect')
            })

            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 0;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
           
            
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User2Connect
     * 2. User1SendTwoMessagesToUser2
     */
    it('test51_Peer1SendBeforeConnect',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })

            .waitsFor(function() {
                // wait lock
                return waitLock('User2Connect')
            }, actorUserName + "wait lock: User2Connect", waitInterval)

            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_failed"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })

            .waits('test end', waitInterval)
           
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User2SendTwoMessagesToUser1
     */
    it('test52_Peer2SendAfterPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)

            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
           
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)
            .waits('test end', waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1SendTwoMessagesToUser2
     */
    it('test53_Peer1SendAfterPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
           
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User2SendTwoMessagesToUser1
     */
    it('test54_Peer2SendAfterUnPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)

            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
        
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)

            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)

            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1CreateLocalStream
     * 6. User2CreateLocalStream
     * 7. User1PublishToUser2
     * 8. User2PublishToUser1
     * 9. User1UnpublishToUser2
     * 10. User2UnpublishToUser1
     * 11. User1SendTwoMessagesToUser2
     */
    it('test55_Peer1SendAfterUnPublish',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                actorUser.createLocalStream();
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["createLocal_success"] == 1
            }, actorUserName + " check action: create localStream ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1CreateLocalStream');
            })
            // 6. User2CreateLocalStream
            // 7. User1PublishToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2CreateLocalStream');
            }, actorUserName + "wait lock: User2CreateLocalStream", waitInterval)
            .runs(function() {
                //check wait
                // action
                //TODO change wrapper of publish
                actorUser.publish(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1PublishToUser2');
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "check action: publish", waitInterval)

            // 8. User2PublishToUser1
            // 9. User1SendTwoMessagesToUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2PublishToUser1');
            }, actorUserName + "wait lock: User2PublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added ", waitInterval)
        
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // check action
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "check action: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1UnpublishToUser2');
            })
            // 12. User2UnpublishToUser1
            // 13. User1StopChatWithUser2
            .waitsFor(function() {
                // wait lock
                return waitLock('User2UnpublishToUser1')
            }, actorUserName + "wait lock: User2UnpublishToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)


            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
           
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1StopChatWithUser2
     * 6. User2SendTwoMessagesToUser1
     */
    it('test56_Peer2SendAfterStop',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })

            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1')
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 0;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)

            .waits('test end',waitInterval)
            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2AcceptUser1
     * 5. User1StopChatWithUser2
     * 6. User1SendTwoMessagesToUser2
     */
    it('test57_Peer1SendAfterStop',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2AcceptUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-started_success"] == 1;
            }, actorUserName + " check wait: chat-started", waitInterval)
            .runs(function() {
                // action
                // TODO: change wrapper function for stop()
                actorUser.stop(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["stop_success"] == 1;
            }, actorUserName + "check action: stop ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1StopChatWithUser2');
            })

            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_failed"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2SendTwoMessagesToUser1
     */
    it('test58_Peer2SendBeforeAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
           
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1');
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 0;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)

            .waits('test end',waitInterval)

            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User1SendTwoMessagesToUser2
     */
    it('test59_Peer1SendBeforeAccept',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
           

            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_failed"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
           
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2InviteUser1
     * 5. User2DenyUser1
     * 6. User2SendTwoMessagesToUser1
     */
    it('test60_Peer2SendAfterDeny',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)

            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2DenyUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-denied_success"] == 1;
            }, actorUserName + " check wait: chat-denied ", 6000)

           
            .waitsFor(function() {
                // wait lock
                return waitLock('User2SendTwoMessagesToUser1');
            }, actorUserName + "wait lock: User2SendTwoMessagesToUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 0;
            }, actorUserName + "check wait: actorUser data-received ", waitInterval)


            .runs(function() {
                // ends the case
                console.log('test end');
                done();
            })
    });
    /**
     * Test a normal interaction process between two users.
     * Actors: User1 and User2
     * Story:
     * 1. User1Connect
     * 2. User2Connect
     * 3. User1InviteUser2
     * 4. User2InviteUser1
     * 5. User2DenyUser1
     * 6. User1SendTwoMessagesToUser2
     */
    it('test61_Peer1SendAfterDeny',function(done){
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // .waits('wait for user2 init', 10000)
            // // 1. User1Connect
            .runs(function() {
                // action
                actorUser.connect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["connect_success"] == 1;
            }, actorUserName + " check action: login ", waitInterval)
            .runs(function() {
                //notify lock
                notifyLock('User1Connect');
            })
            // 2. User2Connect
            // 3. User1InviteUser2
            .waitsFor(function() {
                //wait lock
                return waitLock('User2Connect');
            }, actorUserName + " wait lock: User2Connect ", waitInterval)
            .runs(function() {
                //check wait
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1InviteUser2')
            })
            //4. User2AcceptUser1
            //5. User1CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User2DenyUser1');
            }, actorUserName + " wait lock: User2AcceptUser1", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-denied_success"] == 1;
            }, actorUserName + " check wait: chat-denied ", 6000)

            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["send_failed"] == 1;
            }, actorUserName + "check action: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User1SendTwoMessagesToUser2');
            })
            
            .waits('test end',waitInterval)
            .runs(function() {
                console.log('test end');
                done();
            })
    });
});
