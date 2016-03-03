Interaction Test Description
============================
General Description
-------------------
This folder contains the p2p interaction test between browsers.
Currently, the following scene is tested:
+ Chrome-to-Chrome test under both Windows and Ubuntu
+ Chrome-to-IE test under Windows

Source Description
-------------------
+ package '.travis': start scripts need in karma config file for both Windows and Ubuntu.
+ package 'js' & errorHandler.js: helper source files for p2p test(Adapted to IE).
+ package 'netty': a simple lock server based on socket.io for javascript test to enable wait-notify mechanism between test clients.
+ package.json: project and description file.
+ testclient*.conf.js: karma config files for single test client.
+ test-peerwn-user*.js: test case source files.
+ waitnotifyserver.js: local wait wrapper for test case.

How to Run the Case
-------------------
(If you run this test for the first time, please run 'npm install' to download necessary libs)
1. Start lock server: import java project under 'netty' package and run Test.java.
    This will start a socket.io server under port 9092. Additionally, there's a 'LockServerHtmlClient' provided under path 'netty/src'. You can open Client.html to watch the lock signals(Lock server will resend the latest lock it has received).
2. Start a p2p server and change the 'serverIP' field  in test case files(test-peerwn-user*.js).
3. Run 'karma start <testclient*.conf.js>' to start the karma(every time you change your source code or files, this command should be runned). e.g.
    ~~~~~~~~~~~~~~~~~~~{cmd}
    karma start testclient1.conf.js
    karma start testclient2.conf.js
    ~~~~~~~~~~~~~~~~~~~
4. Run 'karma run <test-peerwn-user*.js> -- --grep=<testCaseName>' to really init a test case. 'testCaseName is the description of every block'. (Currently, I only write a long case to call all of our wrapper APIs.) e.g.
    ~~~~~~~~~~~~~~~~~~~{cmd}
    karma run testclient1.conf.js -- --grep=testTwoUserInteraction
    karma run testclient2.conf.js -- --grep=testTwoUserInteraction
    ~~~~~~~~~~~~~~~~~~~
5. Press 'StartTest' button to start the test.

Case Logic: testTwoUserInteraction
-----------------------
Test a normal interaction process between two users.
Actors: User1 and User2
Story:
1. User1Connect
2. User2Connect
3. User1InviteUser2
4. User2AcceptUser1
5. User1CreateLocalStream
6. User2CreateLocalStream
7. User1PublishToUser2
8. User2PublishToUser1
9. User1SendTwoMessagesToUser2
10. User2SendTwoMessagesToUser1
11. User1UnpublishToUser2
12. User2UnpublishToUser1
13. User1StopChatWithUser2
14. User2InviteUser1
15. User1DenyUser2
16. User2Disconnect
17. User1Disconnect

Tips
-----------------------
1. the time interval to excute the above 'karma run' command should not be very long in that I define a short time of waiting.
2. for the browsers that start by our script instead of the embeded launchers in karma, you have to manually close them.
3. the simple server only broadcast all the lock messages to all the clients and resend last lock message every 500 seconds. The client take charge of the logic of testing.
4. remember to close the proxy before testing.
5. if you want to change the test platform(e.g. Firefox) or change the test source code, please change the configuration in karma file.
6. after you change the test code, you should rerun the 'karma start' to refresh or it won't take effect.