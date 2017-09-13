Change Log
==========
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
