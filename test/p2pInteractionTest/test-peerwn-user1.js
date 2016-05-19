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
        serverIP = 'http://localhost:8095/',
        waitInterval = 20000;

    beforeEach(function(done) {
        thisQ
            .runs(function() {
                actorUser = new TestClient(actorUserName, serverIP);
                //bind callback listners
				actorUser.showLog();// add Pnotify;
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
                    actorUser.showInPage(e.stream, "REMOTE STREAM");
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
    it('testTwoUserInteraction', function(done) {
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
});