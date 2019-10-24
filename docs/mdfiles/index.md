Open WebRTC Toolkit Client SDK for JavaScript Documentation
------------------

# 1 Introduction
Open WebRTC Toolkit Client SDK for JavaScript provides tools to help you develop Web applications. The SDK is distributed in the `CS_WebRTC_Client_SDK_JavaScript.<ver>.zip`  release package.

Refer to the SDK release notes for the latest information on the SDK release package, including features, supported browsers, bug fixes, and known issues.

Please include `adapter.js` before `owt.js` in HTML files. `adapter.js` is an open source project hosted on [Github](https://github.com/webrtc/adapter). The revision we depend on is `7.0.0`.

If you want to use conference SDK, please also include `socket.io.js` before `owt.js`.

# 2 Browser requirement

Open WebRTC Toolkit Client SDK for JavaScript has been tested on the following browsers and operating systems:

Conference Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 78                      | √        | √       | √      |
| Firefox* 70                     | √        | √       | √      |
| Safari* 13                      |          |         | √      |
| Microsoft Edge* 44.18362.387.0    | √        |         |        |    |

*Table 1: Browser requirements for Conference Mode*


P2P Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 78                      | √        | √       | √      |
| Firefox* 70                     | √        | √       | √      |
| Safari* 13                      |          |         | √      |

*Table 2: Browser requirements for P2P Mode*


Different browsers may have different supported codec list.

Microsoft Edge browser supports H.264, VP8 as video codecs and OPUS, PCMA, PCMU as audio codecs. And there is some video codec capability limitation, such as no FIR support in Edge yet.

Safari support is limited. Not all functions work in Safari.

In P2P mode, only one stream per direction can be published between Firefox and other clients.

# 3 NAT and firewall traversal
Open WebRTC Toolkit Client SDK for JavaScript fully supports NAT and firewall traversal with STUN / TURN / ICE. The Coturn TURN server from https://github.com/coturn/coturn can be one choice.

# 4 Peer-to-peer (P2P) mode
To enable P2P chat, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/JavaScript" src="socket.io.js"></script>
<script type="text/JavaScript" src="sc.websocket.js"></script>
<script type="text/JavaScript" src="adapter.js"></script>
<script type="text/JavaScript" src="owt.js"></script>
~~~~~~
If you're using customized signling channel, please replace `socket.io.js` and `sc.websocket.js` with your own signaling channel implementation.

## 4.1 P2P direct call chat

Direct call chat refers to the discovery of another client by chatting with that user's ID. This is a synchronous call and requires that the two clients should be online on the signaling server.

## 4.2 Customize signaling channel

Signaling channel is an implementation to transmit signaling data for creating a WebRTC session. Signaling channel for P2P sessions can be customized. You can pass your customized signaling channel to `P2PClient`'s constructor. The default Socket.IO signaling channel has been provided in the release package with a file named `sc.websocket.js`.

In the customized signaling channel, you need to implement `connect`, `disconnect` and `send`, invoke `onMessage` when a new message arrives, and invoke `onServerDisconnected` when the connection is lost. Then include your customized `sc.*.js` into the HTML page.

# 5 Conference mode

Conference mode is designed for applications with multiple participants through MCU conference server. To enable conference chat, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/javascript" src="socket.io.js"></script>
<script type="text/javascript" src="adapter.js"></script>
<script type="text/javascript" src="owt.js"></script>
~~~~~~

The JavaScript SDK includes a demo application for whole conferencing workflow with operations including join room, publish and subscribe streams, etc. Moreover, the conference server also supports simulcast. This can be enabled through JavaScript SDK.

## 5.1 Publish a simulcast stream
~~~~~~{.js}
// Example of simulcast publication.
conference = new Owt.Conference.ConferenceClient();
// ...
conference.join(token).then(resp => {
    // ...
    Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base.StreamConstraints(
            audioConstraints, videoConstraints)).then(stream => {
        /*
         * Use `RTCRtpEncodingParameters` as publish option
         * (https://w3c.github.io/webrtc-pc/#dom-rtcrtpencodingparameters).
         * The following option would create 3 streams with resolutions if browser supports:
         * OriginResolution, OriginResolution/2.0 and OriginResolution/4.0.
         * For current Firefox, the resolutions should be sorted in descending order(reversed sample's option).
         * For current Safari, legacy simulcast is used and the parameters like `rid` won't take effect.
         * Besides `scaleResolutionDownBy`, other `RTCRtpEncodingParameters` can be set
         * if browser supports.
         * The actual output will be determined by browsers, the outcome may not be exactly same
         * as what is set in publishOption, e.g. For a vga video stream, there may be 2 RTP streams
         * rather than 3.
         */
        const publishOption = {video:[
            {rid: 'q', active: true, scaleResolutionDownBy: 4.0},
            {rid: 'h', active: true, scaleResolutionDownBy: 2.0},
            {rid: 'f', active: true, scaleResolutionDownBy: 1.0}
        ]};
        /*
         * Codec priority list.
         * Here 'vp8' will be used if enabled.
         */
        const codecs = ['vp8', 'h264'];
        localStream = new Owt.Base.LocalStream(
            stream, new Owt.Base.StreamSourceInfo(
                'mic', 'camera'));
        conference.publish(localStream, publishOption, codecs).then(publication => {
            // ...
        });
    });
~~~~~~

## 5.2 Subscribe a simulcast stream
~~~~~~{.js}
// Example of subscription.
conference = new Owt.Conference.ConferenceClient();
// ...
conference.join(token).then(resp => {
    // ...
    /*
     * Subscribe simulcast stream with specified `rid`
     * which can be found in `RemoteStream.settings.video[i].rid`.
     * If `rid` is set when subscribing, other parameters will be ignored.
     */
    const subscribeOption = {
        audio: true,
        video: {rid: 'q'}
    };
    conference.subscribe(remoteStream, subscribeOption).then((subscription) => {
        // ...
    });
~~~~~~

**Note**:
a. The simulcast stream published to conference won't be transcoded.
b. The `rid` attribute may not be present once a 'streamadded' event triggered. Users should listen on stream's `updated` event for new `rid` added.
c. Current browsers support VP8 simulcast well while H.264 simulcast has some limitations.

# 6 Events

The JavaScript objects fires events using `Owt.Base.EventDispatchers`. For more detailed events, please refer to the specific class description page.

# 7 Privacy and security
SDK will send operation system's name and version, browser name, version and abilities, SDK name and version to conference server and P2P endpoints it tries to make connection. SDK does not store this information on disk.

**Note:** \* Other names and brands may be claimed as the property of others.
