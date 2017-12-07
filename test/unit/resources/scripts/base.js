// Copyright © 2017 Intel Corporation. All Rights Reserved.
import * as MediaStreamFactoryModule from '../../../../src/sdk/base/mediastream-factory.js';

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
      new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
        false, false))).to.be.rejected;
    expect(MediaStreamFactoryModule.MediaStreamFactory.createMediaStream(
        new MediaStreamFactoryModule.MediaStreamDeviceConstraints())).to
      .be.rejected.and.notify(done);
  });
  it('Create a MediaStream with audio and/or video should be resolved.', (
    done) => {
    const audioConstraintsForMic = new MediaStreamFactoryModule.MediaStreamTrackDeviceConstraintsForAudio();
    const videoConstraintsForCamera = new MediaStreamFactoryModule.MediaStreamTrackDeviceConstraintsForVideo();
    expect(Promise.all([createMediaStream(new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
        audioConstraintsForMic), 1, 0),
      createMediaStream(new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
        audioConstraintsForMic, false), 1, 0),
      createMediaStream(new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
        undefined, videoConstraintsForCamera), 0, 1),
      createMediaStream(new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
        false, videoConstraintsForCamera), 0, 1),
      createMediaStream(new MediaStreamFactoryModule.MediaStreamDeviceConstraints(
          audioConstraintsForMic, videoConstraintsForCamera), 1,
        1),
    ])).to.be.fulfilled.and.notify(done);
  });
  xit(
    'Create a MediaStream for screen sharing with audio and/or video should be resolved.',
    (done) => {
      const audioConstraintsForScreenCast = new MediaStreamFactoryModule.MediaStreamTrackScreenCastConstraintsForAudio();
      const videoConstraintsForScreenCast = new MediaStreamFactoryModule.MediaStreamTrackScreenCastConstraintsForVideo();
      const screenCastConstraints = new MediaStreamFactoryModule.MediaStreamScreenCastConstraints(
        audioConstraintsForScreenCast, videoConstraintsForScreenCast);
      screenCastConstraints.extensionId = screenSharingExtensionId;
      const screenCastConstraintsVideoOnly = new MediaStreamFactoryModule
        .MediaStreamScreenCastConstraints(false,
          videoConstraintsForScreenCast);
      screenCastConstraintsVideoOnly.extensionId =
        screenSharingExtensionId;
      expect(createMediaStream(screenCastConstraints, 1, 1)).to.be.fulfilled
        .and.notify(done);
    });
});


