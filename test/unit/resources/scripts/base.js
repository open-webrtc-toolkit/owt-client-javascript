// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import * as MediaStreamFactoryModule from '../../../../src/sdk/base/mediastream-factory.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';
import * as MediaFormatModule from '../../../../src/sdk/base/mediaformat.js'
import * as SdpUtils from '../../../../src/sdk/base/sdputils.js'

const expect = chai.expect;
const screenSharingExtensionId = 'jniliohjdiikfjjdlpapmngebedgigjn';
chai.use(chaiAsPromised);
describe('Unit tests for MediaStreamFactory', function() {
  function createMediaStream(constraints, audioTracksExpected,
    videoTracksExpected) {
    return MediaStreamFactoryModule.MediaStreamFactory.createMediaStream(
      constraints).then((stream) => {
      expect(stream).to.be.an.instanceof(MediaStream);
      expect(stream.getAudioTracks().length).to.equal(
        audioTracksExpected);
      expect(stream.getVideoTracks().length).to.equal(
        videoTracksExpected);
      stream.getTracks().map(function(track) {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      });
    });
  }
  it('Create a MediaStream with invalid constraints should be rejected.', (
    done) => {
    expect(MediaStreamFactoryModule.MediaStreamFactory.createMediaStream())
      .to.be.rejected;
    expect(MediaStreamFactoryModule.MediaStreamFactory.createMediaStream(
      new MediaStreamFactoryModule.StreamConstraints(false, false))).to.be.rejected;
    expect(MediaStreamFactoryModule.MediaStreamFactory.createMediaStream(
        new MediaStreamFactoryModule.StreamConstraints())).to
      .be.rejected.and.notify(done);
  });
  it('Create a MediaStream with audio and/or video should be resolved.', (
    done) => {
    const audioConstraintsForMic = new MediaStreamFactoryModule.AudioTrackConstraints(MediaFormatModule.AudioSourceInfo.MIC);
    const videoConstraintsForCamera = new MediaStreamFactoryModule.VideoTrackConstraints(MediaFormatModule.VideoSourceInfo.CAMERA);
    expect(Promise.all([createMediaStream(new MediaStreamFactoryModule.StreamConstraints(
        audioConstraintsForMic), 1, 0),
      createMediaStream(new MediaStreamFactoryModule.StreamConstraints(
        audioConstraintsForMic, false), 1, 0),
      createMediaStream(new MediaStreamFactoryModule.StreamConstraints(
        undefined, videoConstraintsForCamera), 0, 1),
      createMediaStream(new MediaStreamFactoryModule.StreamConstraints(
        false, videoConstraintsForCamera), 0, 1),
      createMediaStream(new MediaStreamFactoryModule.StreamConstraints(
          audioConstraintsForMic, videoConstraintsForCamera), 1,
        1),
    ])).to.be.fulfilled.and.notify(done);
  });
  it(
    'Create a MediaStream for screen sharing with audio and/or video should be resolved.',
    (done) => {
      const audioConstraintsForScreenCast = new MediaStreamFactoryModule.AudioTrackConstraints(MediaFormatModule.AudioSourceInfo.SCREENCAST);
      const videoConstraintsForScreenCast = new MediaStreamFactoryModule.VideoTrackConstraints(MediaFormatModule.VideoSourceInfo.SCREENCAST);
      const screenCastConstraints = new MediaStreamFactoryModule.StreamConstraints(
        audioConstraintsForScreenCast, videoConstraintsForScreenCast);
      screenCastConstraints.extensionId = screenSharingExtensionId;
      const screenCastConstraintsVideoOnly = new MediaStreamFactoryModule
        .StreamConstraints(false, videoConstraintsForScreenCast);
      screenCastConstraintsVideoOnly.extensionId =
        screenSharingExtensionId;
      expect(createMediaStream(screenCastConstraints, 1, 1)).to.be.fulfilled
        .and.notify(done);
    });
});
describe('Unit tests for StreamSourceInfo', function() {
  it('Create StreamSourceInfo with correct enum values should success.', (
    done) => {
    new StreamModule.StreamSourceInfo();
    new StreamModule.StreamSourceInfo('mic');
    new StreamModule.StreamSourceInfo('mic', undefined);
    new StreamModule.StreamSourceInfo(undefined, 'camera');
    new StreamModule.StreamSourceInfo('mic', 'camera');
    done();
  });
  it(
    'Create StreamSourceInfo with incorrect enum values should throw error.',
    (done) => {
      expect(() => {
        new StreamModule.StreamSourceInfo('audio')
      }).to.throw(Error);
      expect(() => {
        new StreamModule.StreamSourceInfo(null, undefined)
      }).to.throw(Error);
      expect(() => {
        new StreamModule.StreamSourceInfo(null, 'camera')
      }).to.throw(Error);
      expect(() => {
        new StreamModule.StreamSourceInfo(undefined, 'video')
      }).to.throw(Error);
      expect(() => {
        new StreamModule.StreamSourceInfo('mic', 'video')
      }).to.throw(Error);
      expect(() => {
        new StreamModule.StreamSourceInfo('mic', null)
      }).to.throw(Error);
      done();
    });
});
describe('Unit tests for Stream', function() {
  let mediaStream;
  const sourceInfo = new StreamModule.StreamSourceInfo('mic');
  before(function(done) {
    navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    }).then(stream => {
      expect(stream).to.be.an.instanceof(MediaStream);
      mediaStream = stream;
      done();
    }).catch(err => {
      done(err);
    });
  });
  after(function(done) {
    mediaStream.getTracks().map(function(track) {
      if (typeof track.stop === 'function') {
        track.stop();
      }
    });
    done();
  });
  it('Create LocalStream with correct arguments should success.', (done) => {
    const stream = new StreamModule.LocalStream(mediaStream, sourceInfo);
    expect(stream).to.have.property('mediaStream', mediaStream);
    expect(stream).to.have.property('source', sourceInfo);
    expect(stream).to.have.property('id').that.is.a('string');
    done();
  });
  it('Create LocalStream with incorrect arguments should throw error.', (
    done) => {
    const wrongSourceInfo = new StreamModule.StreamSourceInfo(undefined, 'camera');
    expect(() => {
      new StreamModule.LocalStream(mediaStream, wrongSourceInfo);
    }).to.throw(TypeError);
    expect(() => {
      new StreamModule.LocalStream('mediaStream', sourceInfo);
    }).to.throw(TypeError);
    done();
  });
  it('Create RemoteStream with correct arguments should success.', (done)=>{
    const streamId = 'streamId';
    const origin="origin";
    let stream=new StreamModule.RemoteStream(streamId, origin, mediaStream, sourceInfo);
    expect(stream).to.have.property('mediaStream', mediaStream);
    expect(stream).to.have.property('id', streamId);
    expect(stream).to.have.property('source', sourceInfo);
    expect(stream).to.have.property('origin', origin);
    stream=new StreamModule.RemoteStream(undefined, origin, mediaStream, sourceInfo);
    expect(stream).to.have.property('id').that.is.a('string');
    done();
  });
});

describe('Unit tests for SDP utils.', function() {
  const sdp ='v=0\r\no=- 5886278095422733218 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=group:BUNDLE audio video\r\na=msid-semantic: WMS 1377c02d-907e-4062-a1bb-50cc9aed99a2\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111 103 104 9 0 8 106 105 13 110 112 113 126\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Vgd7\r\na=ice-pwd:/rbK3d8vW8UjSYpEWn1nqe0u\r\na=ice-options:trickle\r\na=fingerprint:sha-256 2F:07:5E:B7:CC:EE:1E:43:83:75:87:F9:07:E5:69:78:C8:68:F5:CD:EB:D5:9A:EC:33:DF:28:01:3A:78:93:93\r\na=setup:actpass\r\na=mid:audio\r\na=extmap:1 urn:ietf:params:rtp-hdrext:ssrc-audio-level\r\na=sendrecv\r\na=rtcp-mux\r\na=rtpmap:111 opus/48000/2\r\na=rtcp-fb:111 transport-cc\r\na=fmtp:111 minptime=10;useinbandfec=1\r\na=rtpmap:103 ISAC/16000\r\na=rtpmap:104 ISAC/32000\r\na=rtpmap:9 G722/8000\r\na=rtpmap:0 PCMU/8000\r\na=rtpmap:8 PCMA/8000\r\na=rtpmap:106 CN/32000\r\na=rtpmap:105 CN/16000\r\na=rtpmap:13 CN/8000\r\na=rtpmap:110 telephone-event/48000\r\na=rtpmap:112 telephone-event/32000\r\na=rtpmap:113 telephone-event/16000\r\na=rtpmap:126 telephone-event/8000\r\na=ssrc:3559208332 cname:r6m9zFE1dvHLyI5I\r\na=ssrc:3559208332 msid:1377c02d-907e-4062-a1bb-50cc9aed99a2 d702e8fd-7567-4240-9096-9172582ef271\r\na=ssrc:3559208332 mslabel:1377c02d-907e-4062-a1bb-50cc9aed99a2\r\na=ssrc:3559208332 label:d702e8fd-7567-4240-9096-9172582ef271\r\nm=video 9 UDP/TLS/RTP/SAVPF 96 97 98 99 100 101 102 124 127 123 125 107 108\r\nc=IN IP4 0.0.0.0\r\na=rtcp:9 IN IP4 0.0.0.0\r\na=ice-ufrag:Vgd7\r\na=ice-pwd:/rbK3d8vW8UjSYpEWn1nqe0u\r\na=ice-options:trickle\r\na=fingerprint:sha-256 2F:07:5E:B7:CC:EE:1E:43:83:75:87:F9:07:E5:69:78:C8:68:F5:CD:EB:D5:9A:EC:33:DF:28:01:3A:78:93:93\r\na=setup:actpass\r\na=mid:video\r\na=extmap:2 urn:ietf:params:rtp-hdrext:toffset\r\na=extmap:3 http://www.webrtc.org/experiments/rtp-hdrext/abs-send-time\r\na=extmap:4 urn:3gpp:video-orientation\r\na=extmap:5 http://www.ietf.org/id/draft-holmer-rmcat-transport-wide-cc-extensions-01\r\na=extmap:6 http://www.webrtc.org/experiments/rtp-hdrext/playout-delay\r\na=extmap:7 http://www.webrtc.org/experiments/rtp-hdrext/video-content-type\r\na=extmap:8 http://www.webrtc.org/experiments/rtp-hdrext/video-timing\r\na=sendrecv\r\na=rtcp-mux\r\na=rtcp-rsize\r\na=rtpmap:96 VP8/90000\r\na=rtcp-fb:96 ccm fir\r\na=rtcp-fb:96 nack\r\na=rtcp-fb:96 nack pli\r\na=rtcp-fb:96 goog-remb\r\na=rtcp-fb:96 transport-cc\r\na=rtpmap:97 rtx/90000\r\na=fmtp:97 apt=96\r\na=rtpmap:98 VP9/90000\r\na=rtcp-fb:98 ccm fir\r\na=rtcp-fb:98 nack\r\na=rtcp-fb:98 nack pli\r\na=rtcp-fb:98 goog-remb\r\na=rtcp-fb:98 transport-cc\r\na=rtpmap:99 rtx/90000\r\na=fmtp:99 apt=98\r\na=rtpmap:100 H264/90000\r\na=rtcp-fb:100 ccm fir\r\na=rtcp-fb:100 nack\r\na=rtcp-fb:100 nack pli\r\na=rtcp-fb:100 goog-remb\r\na=rtcp-fb:100 transport-cc\r\na=fmtp:100 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=64001f\r\na=rtpmap:101 rtx/90000\r\na=fmtp:101 apt=100\r\na=rtpmap:102 H264/90000\r\na=rtcp-fb:102 ccm fir\r\na=rtcp-fb:102 nack\r\na=rtcp-fb:102 nack pli\r\na=rtcp-fb:102 goog-remb\r\na=rtcp-fb:102 transport-cc\r\na=fmtp:102 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42e01f\r\na=rtpmap:124 rtx/90000\r\na=fmtp:124 apt=102\r\na=rtpmap:127 H264/90000\r\na=rtcp-fb:127 ccm fir\r\na=rtcp-fb:127 nack\r\na=rtcp-fb:127 nack pli\r\na=rtcp-fb:127 goog-remb\r\na=rtcp-fb:127 transport-cc\r\na=fmtp:127 level-asymmetry-allowed=1;packetization-mode=1;profile-level-id=42001f\r\na=rtpmap:123 rtx/90000\r\na=fmtp:123 apt=127\r\na=rtpmap:125 red/90000\r\na=rtpmap:107 rtx/90000\r\na=fmtp:107 apt=125\r\na=rtpmap:108 ulpfec/90000\r\na=ssrc-group:FID 1293249066 1810887022\r\na=ssrc:1293249066 cname:r6m9zFE1dvHLyI5I\r\na=ssrc:1293249066 msid:1377c02d-907e-4062-a1bb-50cc9aed99a2 9eec2142-3807-4fbb-ac10-0c93415a3927\r\na=ssrc:1293249066 mslabel:1377c02d-907e-4062-a1bb-50cc9aed99a2\r\na=ssrc:1293249066 label:9eec2142-3807-4fbb-ac10-0c93415a3927\r\na=ssrc:1810887022 cname:r6m9zFE1dvHLyI5I\r\na=ssrc:1810887022 msid:1377c02d-907e-4062-a1bb-50cc9aed99a2 9eec2142-3807-4fbb-ac10-0c93415a3927\r\na=ssrc:1810887022 mslabel:1377c02d-907e-4062-a1bb-50cc9aed99a2\r\na=ssrc:1810887022 label:9eec2142-3807-4fbb-ac10-0c93415a3927\r\n';
  it('Reorder codecs with undefined codec list should leave SDP unchanged.', (done)=>{
    let reorderedSdp = SdpUtils.reorderCodecs(sdp, 'video');
    expect(reorderedSdp).to.equal(sdp);
    done();
  });

  it('Reorder codecs with a preferred codec name should only output spcified codec.', (done)=>{
    let reorderedSdp = SdpUtils.reorderCodecs(sdp, 'video', ['vp9']);
    expect(reorderedSdp.includes('m=video 9 UDP/TLS/RTP/SAVPF 98 125 108 99 107',0)).to.equal(true);
    done();
  });

  it('Reorder codecs with preferred codec names should only output spcified codecs.', (done)=>{
    let reorderedSdp = SdpUtils.reorderCodecs(sdp, 'video', ['vp9', 'h264']);
    expect(reorderedSdp.includes('m=video 9 UDP/TLS/RTP/SAVPF 98 100 102 127 125 108 99 101 124 123 107',0)).to.equal(true);
    done();
  });
});
