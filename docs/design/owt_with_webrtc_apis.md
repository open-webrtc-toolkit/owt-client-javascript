# OWT SDK with WebRTC APIs
## Introduction
OWT(Open WebRTC Toolkit) Client SDKs provide convenient APIs to create, publish, and subscribe streams. Most of these APIs are wrappers of WebRTC APIs with signaling support. It helps WebRTC beginners easily involve WebRTC technology into their applications without too much knowledge of WebRTC evolution and browser differences. As WebRTC 1.0 is moving to PR, which means it is quite stable, we are planning to expose more WebRTC APIs to developers to enable advanced and custom usages with OWT.
## WebRTC APIs
### RTCRtpTransceiver, RTCRtpSender, RTCRtpReceiver
#### Potential Usages
- Replace a track in the middle of a call.
- Set custom encoding parameters, perhaps for simulcast.
- Set preferred codecs.
- Disable or enable RTX / RED / FEC.
#### API Changes
- A new method `getSender` will be added to `Publication`. It returns an `RTCRtpSender` for certain `Publication`.
- A new method `getReceiver` will be added to `Subscription`. It returns an `RTCRtpReceiver` for certain `Subscription`.
- A new method `addTransceiver(DOMString trackKind, sequence<RTCRtpEncodingParameters> sendEncodings)` will be added to `ConferenceClient`. It invokes `RTCPeerConnection.addTransceiver(trackKind, {direction:inactive, sendEncodings:sendEncodings})`, returns an `RTCRtpTransceiver`. Please note that direction is `inactive` until a `publish` with return transceiver is called.
- The second parameter of `ConferenceClient.publish` accepts an `RTCRtpTransceiver` created by `RTCPeerConnection.addTransceiver`. When this method is called, certain `RTCRtpTransceiver`'s direction is changed to `sendonly`, and its sender's `setStreams` is called with the first parameter's `mediaStream`.
#### Server Requirements
- `addTransceiver` and new `publish` needs renegotiation support.
#### Remarks
- Every transceiver could be associated with at most one `Publication` or one `Subscription`.