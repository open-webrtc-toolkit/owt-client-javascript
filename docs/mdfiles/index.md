Intel CS for WebRTC Client SDK for JavaScript
------------------

# 1 Introduction
The Intel CS for WebRTC Client SDK for JavaScript provides tools to help you develop Web applications. The SDK is distributed in the `CS_WebRTC_Client_SDK_JavaScript.<ver>.zip`  release package.

Refer to the SDK release notes for the latest information on the SDK release package, including features, supported browsers, bug fixes, and known issues.

Please include `adaper.js` before `ics.js` in HTML files. `adapter.js` is an open source project hosted on [Github](https://github.com/webrtc/adapter). The revision we depend on is `d6e8b1a45add33f382fed872f32908ea225a1996`.

If you want to use conference SDK, please also include `socket.io.js` before `ics.js`.

# 2 Browser requirement

The Intel CS for WebRTC Client SDK for JavaScript has been tested on the following browsers and operating systems:

Conference Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 62                      | √        | √       | √      |
| Firefox* 56                     | √        | √       | √      |
| Safari* 11                      |          |         | √      |
| Microsoft Edge* 40.15063.674.0  | √        |         |        |    |

*Table 1: Browser requirements for Conference Mode*


P2P Mode:

|                                 | Windows* | Ubuntu* | macOS* |
| ------------------------------- | -------- | ------- |------- |
| Chrome* 62                      | √        | √       | √      |
| Firefox* 56                     | √        | √       | √      |
| Safari* 11                      |          |         | √      |

*Table 2: Browser requirements for P2P Mode*


Different browsers may have different supported codec list.
Currently, Edge browser only supports H.264 and OPUS, and there is some video codec capability limitation, such as no FIR support in Edge.

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
~~~~~~{.js}
<script type="text/javascript">
// TODO: Samples need to be updated.
</script>
~~~~~~

## 5.2 Customize signaling channel

Signaling channel is an implementation to transmit signaling data for creating a WebRTC session. Signaling channel for P2P sessions can be customized. You can pass your customized signaling channel to `P2PClient`'s constructor. The default Socket.IO signaling channel has been provided in the release package with a file named `sc.websocket.js`.

In the customized signaling channel, you need to implement `connect`, `disconnect` and `send`, invoke `onMessage` when a new message arrives, and invoke `onServerDisconnected` when the connection is lost. Then include your customized `sc.*.js` into the HTML page.

# 6 Conference mode
Conference mode is designed for applications with multiple participants. The JavaScript SDK includes a demo application for this.

## 6.1 Create a room from the server side

Server-side APIs are run on Node.js, and act as a Node.js module:
~~~~~~{.js}
// TODO: Samples need to be updated.
~~~~~~

## 6.2 Join a conference from the client side
To initialize your HTML code, copy and paste the following code into the head section of your HTML document:
~~~~~~{.js}
<script type="text/javascript" src="socket.io.js"></script>
<script type="text/javascript" src="adapter.js"></script>
<script type="text/javascript" src="woogeen.sdk.js"></script>
<script type="text/javascript" src="woogeen.sdk.ui.js"></script>
~~~~~~
After a room and token are created, the token can then be sent to a client to join the conference using client-side APIs:
~~~~~~{.js}
// TODO: Samples need to be updated.
~~~~~~
# 7 JavaScript API quick start guide
This section includes some examples for using the APIs provided in the SDK.

## 7.1 Objects
The following table describes the key objects provided in the JavaScript SDK.

| JavaScript Object                | Description |
| ---------------------------------| -------- | ------- |------- |
| Ics.Base.Stream                  | Handles the WebRTC (audio, video) stream, identifies the stream. There are two kinds of streams: LocalStream and RemoteStream. |
| Ics.Conference.ConferenceClient  | Provides connection, local stream publication, and remote stream subscription for a audio/video conference. |
| Ics.P2P.P2PClient                | Sets up a one-to-one WebRTC session for two endpoints. It provides methods to publish streams and send text messages to remote endpoint. |

## 7.2 Example: Get PeerClient
~~~~~~{.js}
<script type="text/JavaScript">
// TODO: Samples need to be updated.
</script>
~~~~~~
## 7.3 Example: Get ConferenceClient

~~~~~~{.js}
<script type="text/JavaScript">
// TODO: Samples need to be updated.
</script>
~~~~~~

## 7.4 Example: Create LocalStream and receive RemoteStream

~~~~~~{.js}
<script type="text/javascript">
// TODO: Samples need to be updated.
</script>
~~~~~~

# 8 Events

The JavaScript objects (described earlier in this section) fires events using `Ics.Base.EventDispatchers`. For more detailed events, please refer to the specific class description page.

## 8.1 Example for conference

~~~~~~{.js}
<script type="text/JavaScript">
// TODO: Samples need to be updated.
</script>
~~~~~~

## 8.2 Example for p2p

~~~~~~{.js}
<script type="text/JavaScript">
// TODO: Samples need to be updated.
</script>
~~~~~~

**Note:** \* Other names and brands may be claimed as the property of others.

