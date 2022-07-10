Change Log
==========
# 5.1
* When subscribe a stream in conference mode, the subscribed MediaStream or BidirectionalStream is associated with a `Owt.Conference.Subscription` instead of a `Owt.Base.RemoteStream`. The `stream` property of a RemoteStream in conference mode is always undefined, while a new property `stream` is added to `Subscription`. It allows a RemoteStream to be subscribed multiple times, as well as subscribing audio and video tracks from different streams.
* Add a new property `transport` to `Publication` for getting `TransportSettings`.
* Add a new property `rtpTransceivers` to `TransportSettings` and `TransportConstraints`.
* Add a new property `peerConnection` to `ConferenceClient`.
* The second argument of `ConferenceClient.publish` could be a list of `RTCRtpTransceiver`s.
* Add support to publish a MediaStream over WebTransport.

# 5.0
* Add WebTransport support for conference mode, see [this design doc](../../design/webtransport.md) for detailed information.
* All publications and subscriptions for the same conference use the same `PeerConnection`.
* `LocalStream`'s property `mediaStream` is renamed to `stream`. It could also be a `SendStream` or `BidirectionalStream`.
* `Publication` has a new property `transport`.
* `StreamSourceInfo` has a new property `data` for source info of non-audio and non-video data.

# 4.3
* The type of `conferenceClient.publish` method's option is changed from `AudioEncodingParameters` and `VideoEncodingParameters` to `RTCRtpSendParameters`.
* `audio` and `video` of `PublicationSettings` is changed from `AudioPublicationSettings` and `VideoPublicationSettings` to `AudioPublicationSettings` array and `VideoPublicationSettings` array.
* Add `rid` to `VideoSubscriptionConstraints`. When `rid` is specified, other constraints will be ignored.

# 4.0.2
* Fix a compatibility issue for Chrome 69 beta.

# 4.0
* Client SDKs focus on WebRTC connections. Please refer to REST API guide for other conference features, e.g. external input/output, recording.
* Publication was introduced for both conference and P2P mode. You'll get a publication on successful publication.
* Subscription was introduced for conference mode. You'll get a subscription on successful subscription. P2P mode does not have subscription at this time since remote stream will be added to PeerConnection automatically.
* Callbacks were changed to promises.

# 3.5
## New Features
* Safari support.

## API Changes
### Removed APIs
* ConferenceClient.setIceServers
  Please setting ICE server during constructing ConferenceClient.

* ConferenceClient.setVideoBitrate

### Changed APIs
* VideoLayoutChanged event's argument was changed so region can have different aspect ratio as its associated viewport's resolution. (This argument is not mentioned in doc.)
* Added more options to ConferenceClient.subscribe.
* Added a new method mediaInfo() for remote streams.
* stopRecorder's success callback does not bring any information.
* play/pause audio/video behavior the same as mute/unmute.
