describe('TestDevice2', function() {
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

        actorUserName = "User2",
        targetUserName = "User1",
        serverIP = 'http://10.239.44.33:8095/',
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
            .waitsFor(function() {
                return waitLock('STARTTEST');
            },actorUserName + " wait start message", waitInterval)
            .runs(function() {
                console.log(actorUserName + ' start test!');
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
    it('testTwoUserInteraction', function(done) {
        thisQ
            .runs(function() {
                // start test
                debug(actorUserName + "test start!");
            })
            // 1. User1Connect
            // 2. User2Connect
            .waitsFor(function() {
                //This sentence will cause a bug in testFrameworkTest.
                // debug("wait User1Connect")
                // wait lock
                return waitLock('User1Connect');
            }, actorUserName + "wait lock: User1Connect", waitInterval)
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
                notifyLock('User2Connect')
            })
            // 3. User1InviteUser2
            //4. User2AcceptUser1
            .waitsFor(function() {
                // wait lock
                return waitLock('User1InviteUser2');
            }, actorUserName + "wait lock:User1InviteUser2", waitInterval)
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
                notifyLock('User2AcceptUser1')
            })
            //5. User1CreateLocalStream
            // 6. User2CreateLocalStream
            .waitsFor(function() {
                // wait lock
                return waitLock('User1CreateLocalStream');
            }, actorUserName + "wait lock: User1CreateLocalStream ", waitInterval)
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
                notifyLock('User2CreateLocalStream');
            })
            // 7. User1PublishToUser2
            // 8. User2PublishToUser1
            .waitsFor(function() {
                // wait lock
                return waitLock('User1PublishToUser2');
            }, actorUserName + "wait lock: User1PublishToUser2", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-added_success"] == 1;
            }, actorUserName + "check wait: stream-added", waitInterval)
            .runs(function() {
                // action
                actorUser.publish(targetUserName);
            })
            .waitsFor(function() {
                //actoin check
                return actorUser.request["publish_success"] == 1;
            }, actorUserName + "actoin check: publish", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User2PublishToUser1');
            })
            // 9. User1SendTwoMessagesToUser2
            // 10. User2SendTwoMessagesToUser1
            .waitsFor(function() {
                // wait lock
                return waitLock('User1SendTwoMessagesToUser2');
            }, actorUserName + "wait lock: User1SendTwoMessagesToUser2", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["data-received_success"] == 1;
            }, actorUserName + "check wait: actorUser data-received", waitInterval)
            .runs(function() {
                // action
                actorUser.send(targetUserName, "english ~!#$%^&*()");
                // actorUser.send(targetUserName, "中文 ～！@＃¥％……&＊（）");
            })
            .waitsFor(function() {
                //actoin check
                return actorUser.request["send_success"] == 1;
            }, actorUserName + "actoin check: send message", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User2SendTwoMessagesToUser1');
            })
            // 11. User1UnpublishToUser2
            // 12. User2UnpublishToUser1
            .waitsFor(function() {
                // wait lock
                return waitLock('User1UnpublishToUser2')
            }, actorUserName + "wait lock: User1UnpublishToUser2", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["stream-removed_success"] == 1;
            }, actorUserName + "check wait: stream-removed ", waitInterval)
            .runs(function() {
                // action
                actorUser.unpublish(targetUserName);
            })
            .waitsFor(function() {
                // actoin check
                return actorUser.request["unpublish_success"] == 1;
            }, actorUserName + "actoin check: unpublish ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User2UnpublishToUser1');
            })
            // 13. User1StopChatWithUser2
            // 14. User2InviteUser1
            .waitsFor(function() {
                // wait lock
                return waitLock('User1StopChatWithUser2')
            }, actorUserName + "wait lock: User1StopChatWithUser2", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-stopped_success"] == 1;
            }, actorUserName + " check wait: chat-stopped ", waitInterval)
            .runs(function() {
                //action
                actorUser.invited(targetUserName);
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["invite_success"] == 1;
            }, actorUserName + " check action: invite ", waitInterval)
            .runs(function() {
                // notify lock
                notifyLock('User2InviteUser1')
            })
            // 15. User1DenyUser2
            // 16. User2Disconnect
            .waitsFor(function() {
                // wait lock
                return waitLock('User1DenyUser2')
            }, actorUserName + "wait lock: User1DenyUser2", waitInterval)
            .waitsFor(function() {
                //check wait
                return actorUser.request["chat-denied_success"] == 1;
            }, actorUserName + " check wait: chat-denied ", 6000)
            .runs(function() {
                // action
                actorUser.disconnect();
            })
            .waitsFor(function() {
                //check action
                return actorUser.request["disconnect_success"] == 1;
            }, actorUserName + "check action: disconnect ", waitInterval)
            .runs(function() {
                // notify lock, then exit after a time interval
                notifyLock('User2Disconnect');
            })
            .waits('wait lock send out', 1000)
            .runs(function() {
                // end test
                console.log('test end');
                done();
            })
            // 17. User1Disconnect
    });
});