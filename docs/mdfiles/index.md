Intel CS for WebRTC Client SDK for JavaScript
------------------

# 1 Introduction
The Intel CS for WebRTC Client SDK for JavaScript provides tools to help you develop Web applications. The SDK is distributed in the `CS_WebRTC_Client_SDK_JavaScript.<ver>.zip`  release package.

Refer to the SDK release notes for the latest information on the SDK release package, including features, supported browsers, bug fixes, and known issues.

Please include `adapter.js` before `ics.js` in HTML files. `adapter.js` is an open source project hosted on [Github](https://github.com/webrtc/adapter). The revision we depend on is `4.0.2`.

If you want to use conference SDK, please also include `socket.io.js` before `ics.js`.

# 2 Browser requirement

The Intel CS for WebRTC Client SDK for JavaScript has been tested on the following browsers and operating systems:

Conference Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 69                      | √        | √       | √      |
| Firefox* 62                     | √        | √       | √      |
| Safari* 12                      |          |         | √      |
| Microsoft Edge* 42.17134.1.0    | √        |         |        |    |

*Table 1: Browser requirements for Conference Mode*


P2P Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 69                      | √        | √       | √      |
| Firefox* 62                     | √        | √       | √      |
| Safari* 12                      |          |         | √      |

*Table 2: Browser requirements for P2P Mode*


Different browsers may have different supported codec list.

Microsoft Edge browser supports H.264, VP8 as video codecs and OPUS, PCMA, PCMU as audio codecs. And there is some video codec capability limitation, such as no FIR support in Edge yet.

Safari support is limited. Not all functions work in Safari.

In P2P mode, only one stream per direction can be published between Firefox and other clients.

# 3 Screen sharing

## 3.1 Chrome
We provide source code of a Chrome screen sharing extension sample. Developers should edit manifest.json and publish it to Chrome App Store to make it work for their products. After your extension is published, you will get an extension ID. This ID will be used when creating screen sharing stream.

> **Note:** End users need to install your extension and visit your site with https if they want to use screen sharing.

## 3.2 Firefox
Screen sharing on Firefox requires following in `about:config`.

- `media.getusermedia.screensharing.enabled` is `true`.
- `media.getusermedia.screensharing.allowed_domains` includes your domain name. (only needed before Firefox 52)

Developers can help end users to make these changes by Firefox extension.

> **Note:** End users need to visit your site with https if they want to use screen sharing.

# 4 NAT and firewall traversal
Intel CS for WebRTC Client SDK for JavaScript fully supports NAT and firewall traversal with STUN / TURN / ICE. The Coturn TURN server from https://github.com/coturn/coturn can be one choice.

# 5 Peer-to-peer (P2P) mode
To enable P2P chat, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/JavaScript" src="socket.io.js"></script>
<script type="text/JavaScript" src="sc.websocket.js"></script>
<script type="text/JavaScript" src="adapter.js"></script>
<script type="text/JavaScript" src="ics.js"></script>
~~~~~~
If you're using customized signling channel, please replace `socket.io.js` and `sc.websocket.js` with your own signaling channel implementation.

## 5.1 P2P direct call chat

Direct call chat refers to the discovery of another client by chatting with that user's ID. This is a synchronous call and requires that the two clients should be online on the signaling server.

## 5.2 Customize signaling channel

Signaling channel is an implementation to transmit signaling data for creating a WebRTC session. Signaling channel for P2P sessions can be customized. You can pass your customized signaling channel to `P2PClient`'s constructor. The default Socket.IO signaling channel has been provided in the release package with a file named `sc.websocket.js`.

In the customized signaling channel, you need to implement `connect`, `disconnect` and `send`, invoke `onMessage` when a new message arrives, and invoke `onServerDisconnected` when the connection is lost. Then include your customized `sc.*.js` into the HTML page.

# 6 Events

The JavaScript objects fires events using `Ics.Base.EventDispatchers`. For more detailed events, please refer to the specific class description page.

# 7 Migrating from 3.x

There are significant API changes since 3.x.
- Client SDKs focuses on WebRTC connections. Please refer to REST API guide for other conference features, e.g. external input/output and recording.
- Publication was introduced for both conference and P2P mode. You'll get a publication after publishing a stream successfully.
- Subscription was introduced for conference mode. You'll get a subscription after subscribing a stream successfully. P2P mode does not have subscription at this time since remote stream will be added to PeerConnection automatically.
- Callbacks were changed to promises.

**Note:** \* Other names and brands may be claimed as the property of others.

