Intel CS for WebRTC Client SDK for JavaScript
------------------

# 1 Introduction {#section1}
The Intel CS for WebRTC Client SDK for JavaScript provides tools to help you develop Web applications. The SDK is distributed in the `CS_WebRTC_Client_SDK_JavaScript.&lt;ver&gt;.zip`  release package. The SDK consists of client-side and server-side APIs, as well as sample Web applications:

 - Client-side APIs:  Manage how to act with the peer client, room, and stream.
 - Server-side APIs:  Manage how to create a token, room, and service.

The following table lists the basic JavaScript objects provided in the JavaScript SDK:

@htmlonly
<table class="doxtable">
<caption><b>Table 1: Basic JavaScript objects</b> </caption>
    <tbody>
    <thead>
        <tr>
            <th><b>JavaScript  object</b></th>
            <th><b>Description</b></th>
        </tr>
    </thead>
        <tr>
            <td>adapter.js</td>
            <td>An adapter to interop between different browsers.</td>
        </tr>
         <tr>
            <td>woogeen.sdk.js</td>
            <td>Intel CS for WebRTC cliet SDK for JavaScript.</td>
        </tr>
    </tbody>
</table>
@endhtmlonly

Refer to the SDK release notes for the latest information on the SDK release package, including features, supported browsers, bug fixes, and known issues.

Please include adaper.js before woogeen.sdk.js in HTML files.

If you want to use conference SDK, please also include socket.io.js before woogeen.sdk.js.

# 2 Browser requirement {#section2}
The Intel CS for WebRTC Client SDK for JavaScript has been tested on the following browsers and operating systems:

@htmlonly
<table class="doxtable">
<caption><b>table 2: Browser requirements</b></caption>
    <tbody>
    <thead>
        <tr>
            <th><b>Browser</b></th>
            <th colspan="3"><b>OS</b></th>
        </tr>
    </thead>
        <tr>
            <td><b>Conference Mode</b></td>
            <td><b>Windows*</b></td>
            <td><b>Ubuntu*</b></td>
        </tr>
        <tr width="12pt">
            <td>Chrome* 52</td>
            <td>&radic;</td>
            <td>&radic;</td>
        </tr>
        <tr>
            <td>Firefox* 48</td>
            <td>&radic;</td>
            <td>&radic;</td>
        </tr>
        <tr>
            <td><b>P2P Mode</b></td>
            <td><b>Windows</b></td>
            <td><b>Ubuntu</b></td>
        </tr>
        <tr>
            <td>Chrome* 52</td>
            <td>&radic;</td>
            <td>&radic;</td>
        </tr>
        <tr>
            <td>FireFox* 48</td>
            <td>&radic;</td>
            <td>&radic;</td>
        </tr>
    </tbody>
</table>
@endhtmlonly

# 3 Screen sharing extension {#section3}
We provide source code of a Chrome screen sharing extension sample. Developers should edit manifest.json and publish it to Chrome App Store to make it work for their products. After your extension is published, you will get an extension ID. This ID will be used when create screen sharing stream.

> **Note:** End users need to install your extension and visit your site with https if they want to use screen sharing.

# 4 NAT and firewall traversal {#section4}
Intel CS for WebRTC Client SDK for JavaScript fully supports NAT and firewall traversal with STUN / TURN / ICE. The rfc5766-turn-server version 3.2.3.6 from https://code.google.com/p/rfc5766-turn-server/ has been verified.

# 5 Peer-to-peer (P2P) mode{#section5}
To enable P2P chat, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/JavaScript" src="sc.websocket.js"></script>
<script type="text/JavaScript" src="woogeen.sdk.js"></script>
~~~~~~
The SDK supports Web sockets signaling channel in P2P mode; You need to include `sc.websocket.js` and `socket.io.js` in your HTML files. Please include `socket.io.js` after `woogeen.p2p.js`.

## 5.1 P2P direct call chat {#section5_1}

Direct call chat refers to the discovery of another client by chatting with that user's ID. This is a synchronous call and requires that the two clients be online on the signaling server.
~~~~~~{.js}
<script type="text/javascript">
var isVideo=1;
var serverAddress='http://61.152.239.56:8095/';  // Please change it to signaling server's address.
var p2p=new Woogeen.PeerClient({
  iceServers : [ {
    urls : "stun:61.152.239.60"
  }, {
    urls : ["turn:61.152.239.60:4478?transport=udp","turn:61.152.239.60:443?transport=udp","turn:61.152.239.60:4478?transport=tcp","turn:61.152.239.60:443?transport=tcp"],
    credential : "master",
    username : "woogeen"
  } ]
});  // Initialize a Peer object
var localStream;
var localScreen;

var getTargetId=function(){
  return $('#target-uid').val();
};

$(document).ready(function(){
  $('#target-connect').click(function(){
    p2p.invite(getTargetId(), function(){
      console.log('Invite success.');
    }, function(err){
      console.log('Invite failed with message: '+err.message);
    });
  });

  $('#target-screen').click(function(){
    Woogeen.LocalStream.create({
      video:{
        device:"screen",
        resolution:"hd1080p",
        frameRate: [10,10]
      }
    }, function(err, stream){
      if (err) {
        return L.Logger.error('create LocalStream failed:', err);
      }
      localStream = stream;
      p2p.publish(localStream,$('#target-uid').val());  // Publish local stream to remote client
    });
  });

  $('#target-video-unpublish').click(function(){
    $('#target-video-publish').prop('disabled',false);
    $('#target-video-unpublish').prop('disabled',true);
    p2p.unpublish(localStream,$('#target-uid').val());
  });

  $('#target-video-publish').click(function(){
    $('#target-video-unpublish').prop('disabled',false);
    $('#target-video-publish').prop('disabled',true);
    if(localStream)
      p2p.publish(localStream,$('#target-uid').val());
    else{
      Woogeen.LocalStream.create({
        video:{
          device:"camera",
          resolution:"hd720p"
        },
      audio: true
      }, function(err, stream){
        if (err) {
          return L.Logger.error('create LocalStream failed:', err);
        }
        localStream = stream;
        attachMediaStream($('#local video').get(0),localStream.mediaStream)  // Show local stream
        p2p.publish(localStream,$('#target-uid').val());  // Publish local stream to remote client
      });
    }
  });

  $('#target-disconnect').click(function(){
    p2p.stop($('#target-uid').val());  // Stop chat
  });

  $('#login').click(function(){
    p2p.connect({host:serverAddress, token:$('#uid').val()});  // Connect to peer server
    $('#uid').prop('disabled',true);
  });

  $('#logoff').click(function(){
    p2p.disconnect();  // Disconnected from peer server.
    $('#uid').prop('disabled',false);
  });

  $('#data-send').click(function(){
    p2p.send($('#dataSent').val(),$('#target-uid').val());  // Send data to peer.
  });
});

p2p.on('chat-invited',function(e){  // Receive invitation from remote client.
  $('#target-uid').val(e.senderId);
  p2p.accept(getTargetId());
  //p2p.deny(e.senderId);
});

p2p.on('chat-accepted', function(e){
});

p2p.on('chat-denied',function(e){
  console.log('Invitation to '+e.senderId+' has been denied.');
});

p2p.on('chat-started',function(e){ // Chat started
  console.log('chat started.');
  $('#target-screen').prop('disabled',false);
  $('#data-send').prop('disabled',false);
});

p2p.on('stream-added',function(e){  // A remote stream is available.
  if(e.stream.isScreen()){
    $('#screen video').show();
    attachMediaStream($('#screen video').get(0),e.stream.mediaStream);  // Show remote screen stream.
  } else if(e.stream.hasVideo()) {
    $('#remote video').show();
    attachMediaStream($('#remote video').get(0),e.stream.mediaStream);  // Show remote video stream.
  }
  isVideo++;
});

p2p.on('stream-removed',function(e){  // A remote stream is available.
  console.log('Stream removed. Stream ID: '+e.stream.mediaStream.id);
});

p2p.on('chat-stopped',function(e){  // Chat stopped.
  console.log('chat stopped.');
  $('#data-send').prop('disabled',true);
  $('#remote video').hide();
  console.log('Chat stopped. Sender ID: '+e.senderId+', peer ID: '+e.peerId);
});

p2p.on('data-received',function(e){  // Received data from datachannel.
  $('#dataReceived').val(e.senderId+': '+e.data);
});
</script>
~~~~~~

## 5.2 Customize signaling channel {#section5_2}

Signaling channel is an implementation to transmit signaling data for creating a WebRTC session. Signaling channel for P2P sessions can be customized by writing your own `sc.*.js`. The default Socket.IO signaling channel has been provided in the release package with name `sc.websocket.js`.

In the customized signaling channel, you need to implement `connect`, `disconnect` and `sendMessage`, invoke `onMessage` when a new message arrives, and invoke `onServerDisconnected` when the connection is lost. Then include your customized `sc.*.js` into the HTML page.

# 6 Conference mode {#section6}
Conference mode is designed for applications with multiple participants. The JavaScript SDK includes a demo application for this.

## 6.1 Create a room from the server side {#section6_1}

Server-side APIs are run on Node.js, and act as a Node.js module:
~~~~~~{.js}
var Woogeen = require('nuve');
~~~~~~
The following sample code shows how to create a room and generate tokens so that clients can join the room.
~~~~~~
var Woogeen = require('nuve');
Woogeen.API.init(SERVICEID, SERVICEKEY, SERVICEHOST);
var room = {name: 'Demo Room'}; // set p2p = true for p2p room
Woogeen.API.createRoom (room.name, function (resp) {
  console.log (resp);
  var myRoom = resp;
  setTimeout (function () {
    Woogeen.API.createToken(myRoom._id, 'Bob', 'User', function (token) {
      console.log ('Token:', token);
    });
  }, 100);
}, function (err) {
  console.log ('Error:', err);
}, room);
~~~~~~

## 6.2 Join a conference from the client side {#section6_2}
To initialize your HTML code, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/javascript" src="socket.io.js"></script>
<script type="text/javascript" src="woogeen.sdk.js"></script>
<script type="text/javascript" src="woogeen.sdk.ui.js"></script>
~~~~~~
After a room and token are created, the token can then be sent to a client to join the conference using client-side APIs:
~~~~~~{.js}
<script type="text/JavaScript">
L.Logger.setLogLevel(L.Logger.INFO);
var conference = Woogeen.ConferenceClient.create({});
conference.on('stream-added', function (event) {
  var stream = event.stream;
  L.Logger.info('stream added:', stream.id());

  // ...
  if ((subscribeMix === "true" && (stream.isMixed() || stream.isScreen())) ||
    (subscribeMix !== "true" && !stream.isMixed())) {
    L.Logger.info('subscribing:', stream.id());
    conference.subscribe(stream, function () {
      L.Logger.info('subscribed:', stream.id());
      displayStream(stream);
    }, function (err) {
      L.Logger.error(stream.id(), 'subscribe failed:', err);
    });
  }
});

conference.on('stream-removed', function (event) {
  // Stream removed
});

conference.onMessage(function (event) {
  L.Logger.info('Message Received:', event.msg);
});

conference.on('server-disconnected', function () {
  L.Logger.info('Server disconnected');
});

conference.on('user-joined', function (event) {
  L.Logger.info('user joined:', event.user);
});

conference.on('user-left', function (event) {
  L.Logger.info('user left:', event.user);
});

createToken(roomId, 'user', 'presenter', function (response) {
  var token = response;
  conference.join(token, function (resp) {
    Woogeen.LocalStream.create({
      video: {
        device: 'camera',
        resolution: myResolution
      },
      audio: true
      }, function (err, stream) {
        if (err) {
          return L.Logger.error('create LocalStream failed:', err);
        }
        localStream = stream;
        localStream.show('myVideo');
        conference.publish(localStream, {maxVideoBW: 300}, function (st) {
        L.Logger.info('stream published:', st.id());
      }, function (err) {
        L.Logger.error('publish failed:', err);
      });
    });
    //…
  }, function (err) {
    L.Logger.error('server connection failed:', err);
  });
});
</script>
~~~~~~
# 7 JavaScript API quick start guide {#section7}
This discussion describes how to quickly grasp the API usages of Intel CS for WebRTC Client SDK for JavaScript. Unless mentioned elsewhere, all APIs are under namespace `Woogeen`.

## 7.1 Objects {#section7_1}
The following table describes the key objects provided in the JavaScript SDK.
@htmlonly
<table class="doxtable">
<caption><b>Table 3 : JavaScript objects </b></caption>
    <tbody>
    <thead>
        <tr>
            <th><b>JavaScript  object</b></th>
            <th><b>Description</b></th>
        </tr>
    </thead>
        <tr>
            <td>PeerClient</td>
            <td>Sets up one-to-one video chat for two clients. It provides methods to initialize or stop a video call or to join a P2P chat room. This object can start a chat when another client joins the same chat room.</td>
        </tr>
         <tr>
            <td>ConferenceClient</td>
            <td>Provides connection, local stream publication, and remote stream subscription for a video conference. The conference client is created by the server side API. The conference client is retrieved by the client API with the access token for the connection.</td>
        </tr>
         <tr>
            <td>SipClient</td>
            <td>Provides to initiate, accept, reject, hangup a SIP call. And also local stream publication, and remote stream subscription for a video or audio call.</td>
        </tr>
         <tr>
            <td>Stream</td>
            <td>Handles the WebRTC (audio, video) stream, identifies the stream, and identifies the location where the stream should be displayed. There are two stream classes: LocalStream and RemoteStream.</td>
        </tr>
    </tbody>
</table>
@endhtmlonly
## 7.2 Example: Get PeerClient {#section7_2}
~~~~~~{.js}
<script type="text/JavaScript">
  var peer = new Woogeen.PeerClient({
    iceServers : [{
      urls : "stun: 61.152.239.60"
     } , {
      urls : ["turn:61.152.239.60:4478?transport=udp", "turn:61.152.239.60:443?transport=tcp"],
      username : "woogeen",
      credential : "master"
     }
    ]
  });
</script>
~~~~~~
## 7.3 Example: Get ConferenceClient {#section7_3}

~~~~~~{.js}
<script type="text/JavaScript">
 var conference = Woogeen.ConferenceClient.create({});
</script>
~~~~~~

## 7.4 Example: Create LocalStream and receive RemoteStream {#section7_4}

~~~~~~{.js}
<script type="text/javascript">
    // LocalStream
    var localStream;
    Woogeen.LocalStream.create({
          video: {
              device: 'camera',
              resolution: 'vga',
          },
          audio: true
      }, function (err, stream) {
          if (err) {
              return console.log('create LocalStream failed:', err);
          }
          localStream = stream;
    });
    // RemoteStream
    conference.on('stream-added', function (event) {
          var remoteStream = event.stream;
            console.log('stream added:', stream.id());
    });
</script>
~~~~~~

# 8 Events {#Events}

The JavaScript objects (described earlier in this section) throw events using EventDispatchers, inlucluding {@link Woogeen.PeerClient PeerClient}, {@link Woogeen.ConferenceClient ConferenceClient}, {@link Woogeen.SipClient SipClient}, {@link Woogeen.RemoteStream RemoteStream}, etc.

Detailed events please refer to the specific class description page.

## 8.1 Example for conference:{#section8_1}

~~~~~~{.js}
<script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create({});
  conference.on('stream-added', function (event) {
var stream = event.stream;
L.Logger.info('stream added:', stream.id());
var fromMe = false;
for (var i in conference.localStreams) {
   if (conference.localStreams.hasOwnProperty(i)) {
     if (conference.localStreams[i].id() === stream.id()) {
       fromMe = true;
       break;
     }
   }
}
L.Logger.info('subscribing:', stream.id());
conference.subscribe(stream, function () {
  L.Logger.info('subscribed:', stream.id());
  displayStream(stream);
}, function (err) {
  L.Logger.error(stream.id(), 'subscribe failed:', err);
});
});
</script>
~~~~~~

## 8.2 Example for p2p:{#section8_2}

~~~~~~{.js}
<script type="text/JavaScript">
  var startTime;
  var p2p = new Woogeen.PeerClient();
  p2p.addEventListener('chat-stopped',function (e) {  // Chat stopped
    $('#remote video').hide();
    console.log('duration: '+(Date.now()-startTime).seconds());
  });

  p2p.addEventListener('chat-started',function (e) {  // Chat started
    console.log('duration: '+(Date.now()-startTime)+'ms');  // Duration of the chat.
  });
</script>
~~~~~~

> **Note**: \* Other names and brands may be claimed as the property of others.

