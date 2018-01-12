// Copyright © 2017 Intel Corporation. All Rights Reserved.
import * as MediaStreamFactoryModule from '../../../../src/sdk/base/mediastream-factory.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';
import * as MediaFormatModule from '../../../../src/sdk/base/mediaformat.js'

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
