OWT Simulcast Description
---------------------

# {#simulcast}
The conference server supports simulcast. This can be enabled through OWT Client SDK API. <br>

1. Publish a simulcast stream
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
         * For current Firefox, the resolutions must be sorted in descending order.
         * For current Safari, legacy simulcast is used and the parameters like `rid` won't take effect.
         * Besides `scaleResolutionDownBy`, other `RTCRtpEncodingParameters` can be set
         * if browser supports.
         * The actual output will be determined by browsers, the outcome may not be exactly same
         * as what is set in publishOption, e.g. For a vga video stream, there may be 2 RTP streams
         * rather than 3.
         */
        const publishOption = {video:[
            {rid: 'q', active: true, scaleResolutionDownBy: 1.0},
            {rid: 'h', active: true, scaleResolutionDownBy: 2.0},
            {rid: 'f', active: true, scaleResolutionDownBy: 4.0}
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

2. Subscribe a simulcast stream
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

> **Note:**
1. The simulcast stream published to conference won't be transcoded.
2. The `rid` attribute may not be present once a 'streamadded' event triggered. Users should listen on stream's `updated`
event for new `rid` added.
3. Current browsers(Chrome/Firefox/Safari) support VP8 simulcast. Only software encoder in chrome supports H264 simulcast.
