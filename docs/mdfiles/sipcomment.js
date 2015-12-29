/**
 * @class Woogeen.SipClient
 * @classDesc TODO
 */

/**
   * @function setIceServers
   * @desc This function establishes a connection to server and joins a certain conference.
<br><b>Remarks:</b><br>
This method accepts string, object, or array (multiple ones) type of ice server item as argument. Typical description of each valid value should be as below:<br>
<ul>
<li>For turn: {urls: "url", username: "username", credential: "password"}.</li>
<li>For stun: {urls: "url"}, or simply "url" string.</li>
</ul>
Each time this method is called, previous saved value would be discarded. Specifically, if parameter servers is not provided, the result would be an empty array, meaning any predefined servers are discarded.
   * @instance
   * @memberOf Woogeen.SipClient
   * @param {string/object/array} servers turn or stun server configuration.
   * @return {array} Result of the user-set of ice servers.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
conference.setIceServers([{
    urls: "turn:61.152.239.60:4478?transport=udp",
    username: "woogeen",
    credential: "master"
  }, {
    urls: "turn:61.152.239.60:443?transport=tcp",
    username: "woogeen",
    credential: "master"
  }]);
</script>
   */
/**
   * @function join
   * @instance
   * @desc This function establishes a connection to server and joins a certain　conference.
<br><b>Remarks:</b><br>
On success, successCallback is called (if provided); otherwise, failureCallback is called (if provided).
<br><b>resp:</b><br>
{<br>
 streams:, an array of remote streams that have been published in the conference.<br>
 users:, an array of users that have joined in the conference.<br>
}
   * @memberOf Woogeen.SipClient
   * @param {string} token Token used to join conference room.
   * @param {function} onSuccess(resp) (optional) Success callback function.
   * @param {function} onFailure(err) (optional) Failure callback function.
   * @example
<script type="text/JavaScript">
conference.join(token, function(response) {...}, function(error) {...});
</script>
   */
/**
   * @function leave
   * @instance
   * @desc This function leaves conference and disconnects from server. Once it is done, 'server-disconnected' event would be triggered.
   * @memberOf Woogeen.SipClient
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ......
conference.leave();
</script>
   */

/**
   * @function send
   * @instance
   * @desc This function send message to conference room. The receiver should be a valid clientId, which is carried by 'user-joined' event; or default 0, which means send to all participants in the conference (broadcast) except himself.
   * @memberOf Woogeen.SipClient
   * @param {string/function} data Message/object to send.
   * @param {string/function} receiver Receiver, optional, with default value 0.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.send(message, receiver, function (obj) {
    L.Logger.info('object sent:', obj.id());
  }, function (err) {
    L.Logger.error('send failed:', err);
  }
);
</script>
   */
/**
   * @function publish
   * @instance
   * @desc This function publishes the local stream to the server. The stream should be a valid LocalStream instance. 'stream-added' event would be triggered when the stream is published successfully.
   <br><b>options:</b><br>
   {<br>
maxVideoBW: xxx,<br>
unmix: false/true, // if true, this stream would not be included in mix stream<br>
videoCodec: 'h264'/'vp8' // not applicable for p2p room<br>
transport: 'udp'/'tcp' // rtsp connection transport type, default 'udp'; only for rtsp input<br>
bufferSize: integer number in bytes // udp receiving buffer size, default 2 MB; only for rtsp input (udp transport)<br>
}
   * @memberOf Woogeen.SipClient
   * @param {stream} stream Stream to publish.
   * @param {json} options Publish options.
   * @param {function} onSuccess(stream) (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.publish(localStream, {maxVideoBW: 300}, function (st) {
    L.Logger.info('stream published:', st.id());
  }, function (err) {
    L.Logger.error('publish failed:', err);
  }
);
</script>
   */

/**
   * @function unpublish
   * @instance
   * @desc This function unpublishes the local stream. 'stream-removed' event would be triggered when the stream is removed from server.
   * @memberOf Woogeen.SipClient
   * @param {stream} stream Stream to un-publish.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.unpublish(localStream, function (st) {
    L.Logger.info('stream unpublished:', st.id());
  }, function (err) {
    L.Logger.error('unpublish failed:', err);
  }
);
</script>
   */
/**
   * @function subscribe
   * @instance
   * @desc This function subscribes to a remote stream. The stream should be a RemoteStream instance.
   <br><b>options:</b><br>
{<br>
video: true/false, {resolution: {width:xxx, height:xxx}},<br>
audio: true/false,<br>
videoCodec: 'h264'/'vp8' // not for p2p room<br>
}
<br><b>Remarks:</b><br>
Video resolution choice is only valid for subscribing {@link Woogeen.RemoteMixedStream|Woogeen.RemoteMixedStream} when multistreaming output is enabled.　See {@link N.API.createRoom|N.API.createRoom()} for detailed description of multistreaming.<br>
   * @memberOf Woogeen.SipClient
   * @param {stream} stream Stream to subscribe.
   * @param {json} options (optional) Subscribe options.
   * @param {function} onSuccess(stream) (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.subscribe(remoteStream, function (st) {
    L.Logger.info('stream subscribed:', st.id());
  }, function (err) {
    L.Logger.error('subscribe failed:', err);
  }
);
</script>
   */
/**
   * @function unsubscribe
   * @instance
   * @desc This function unsubscribes the remote stream.
   * @memberOf Woogeen.SipClient
   * @param {stream} stream Stream to unsubscribe.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.unsubscribe(remoteStream, function (st) {
    L.Logger.info('stream unsubscribed:', st.id());
  }, function (err) {
    L.Logger.error('unsubscribe failed:', err);
  }
);
</script>
   */

/**
   * @function onMessage
   * @instance
   * @desc This function is the shortcut of on('message-received', callback).
<br><b>Remarks:</b><br>Once the message is received, the callback is invoked.
   * @memberOf Woogeen.SipClient
   * @param {function} callback callback function to the message.
   * @example
<script type="text/JavaScript">
  var conference = Woogeen.ConferenceClient.create();
// ……
  conference.onMessage(function (event) {
    L.Logger.info('Message Received:', event.msg);
  });
</script>
   */
/**
   * @function shareScreen
   * @instance
   * @desc This function creates a LocalStream from screen and publishes it to the　server.
   * @memberOf Woogeen.SipClient
   * @param {string} options (optional) Share screen options, similar to video option that used to create a LocalStream.
   * @param {function} onSuccess(stream) (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback. See details about error definition in {@link Woogeen.LocalStream.create|LocalStream.create}.
   * @example
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
// ……
conference.shareScreen({resolution: 'hd720p'}, function (st) {
    L.Logger.info('screen shared:', st.id());
  }, function (err) {
    L.Logger.error('sharing failed:', err);
  }
);
</script>
   */
/**
   * @function playAudio
   * @desc This function tells server to continue sending/receiving audio data of the RemoteStream/LocalStream.
<br><b>Remarks:</b><br>
The audio track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published.
   * @memberOf Woogeen.SipClient
   * @param {WoogeenStream} stream instance.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @instance
   */

/**
   * @function pauseAudio
   * @desc This function tells server to stop sending/receiving audio data of the subscribed RemoteStream/LocalStream.
<br><b>Remarks:</b><br>
Upon success, the audio of the stream would be hold, and you can call disableAudio() method to disable the audio track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published.
   * @memberOf Woogeen.SipClient
   * @param {WoogeenStream} stream instance.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @instance
   */
/**
   * @function playVideo
   * @desc This function tells server to continue sending/receiving video data of the subscribed RemoteStream/LocalStream.
<br><b>Remarks:</b><br>
The video track of the stream should be enabled to be played correctly. For RemoteStream, it should be subscribed; for LocalStream, it should be published.
   * @memberOf Woogeen.SipClient
   * @param {WoogeenStream} stream instance.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @instance
   */
/**
   * @function pauseVideo
   * @desc This function tells server to stop sending/receiving video data of the subscribed RemoteStream/LocalStream.
<br><b>Remarks:</b><br>
Upon success, the video of the stream would be hold, and you can call disableVideo() method to disable the video track locally to stop playing. For RemoteStream, it should be subscribed; for LocalStream, it should be published.
   * @memberOf Woogeen.SipClient
   * @param {WoogeenStream} stream instance.
   * @param {function} onSuccess() (optional) Success callback.
   * @param {function} onFailure(err) (optional) Failure callback.
   * @instance
   */

/**
   * @function create
   * @desc This factory returns a Woogeen.SipClient instance.
   * @memberOf Woogeen.SipClient
   * @static
   * @return {Woogeen.SipClient} An instance of Woogeen.SipClient.
   * @example
TODO
<script type="text/JavaScript">
var conference = Woogeen.ConferenceClient.create();
</script>
   */
