# OWT SDK with WebRTC APIs
## Introduction
OWT(Open WebRTC Toolkit) Client SDKs provide convenient APIs to create, publish, and subscribe streams. Most of these APIs are wrappers of WebRTC APIs with signaling support. It helps WebRTC beginners easily involve WebRTC technology into their applications without too much knowledge of WebRTC evolution and browser differences. As WebRTC 1.0 was officially made a W3C Recommendation, which means it is stable, we are planning to expose more WebRTC APIs to developers to enable advanced and custom usages with OWT.
## Potential Usages
- Replace a track in the middle of a call.
- Set custom encoding parameters, perhaps for simulcast.
- Set preferred codecs.
- Disable or enable RTX / RED / FEC.
## API Changes
- A new member `rtpTransceivers` will be added to `TransportSettings`. It returns an array `RTCRtpReceiver`s for RTP transport.
- A new member `transport` will be added to `Publication` and `Subscription`. Developers could get `RTPTransceiver`s from its `rtpTransceivers` property.
- A new member `peerConnection` will be added to `ConferenceClient` for developers to get the `PeerConnection`.
- The second parameter of `ConferenceClient.publish` accepts an `RTCRtpTransceiver` created by `RTCPeerConnection.addTransceiver`. `RTCRtpTransceiver`s' direction must be `sendonly`, and its sender's `setStreams` is called with the first parameter's `mediaStream`.
## Server Requirements
- `addTransceiver` and new `publish` needs renegotiation support.
## Remarks
- Every transceiver could be associated with at most one `Publication` or one `Subscription`.
## Examples
### Replace a video track
```
const transceivers = publication.transport.rtpTransceivers;
for (const transceiver of transceivers) {
  if (transceiver.sender.track?.kind === 'video'){
    transceiver.sender.replaceTrack(newTrack);
  }
}
```

### Publish a stream with codec preferences
```
const codecCapabilities = RTCRtpSender.getCapabilities('video').codecs;
// Reorder codecCapabilities or remove some items.
const transceivers = [];
for (const track of mediaStream.getTracks()) {
  const transceiver =
      conference.peerConnection.addTransceiver(track, {
        direction: 'sendonly',
        streams: [stream],
      });
  if (track.kind==='video'){
      transceiver.setCodecPreferences(codecCapabilities);
  }
  transceivers.push(transceiver);
}
const publication = await conference.publish(localStream, transceivers);
```


### Publish with a codec supports SVC.
This example uses some WebRTC APIs may not be supported by all browsers.
```
const transceiver =
    conference.peerConnection.addTransceiver(track, {
      direction: 'sendonly',
      streams: [stream],
      sendEncodings: [
        {
          rid: 'q',
          scaleResolutionDownBy: 4.0,
          scalabilityMode: 'L1T3'
        },
        {
          rid: 'h',
          scaleResolutionDownBy: 2.0,
          scalabilityMode: 'L1T3'
        },
        {rid: 'f', scalabilityMode: 'L1T3'}
      ],
    });
const publication = await conference.publish(localStream, [transceiver]));
```
