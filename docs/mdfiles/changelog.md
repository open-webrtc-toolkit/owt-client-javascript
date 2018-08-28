Change Log
==========
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
