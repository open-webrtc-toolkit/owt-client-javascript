var MediaStreamTest = function() {
  this.client = new TestClient();
}

MediaStreamTest.prototype = {
  debug: function(title, msg) {
    console.log("MediaStreamTest DEBUG MESSAGE: ");
    console.log(title, msg);
  },
  getCameraDefault: function() {
    this.client.createLocalStream();
  },
  setCameraResulotion: function(resulotion) {
    this.client.createLocalStream({
      video: {
        resulotion: resulotion
      },
      audio: true
    });
  },
  setCameraFps: function(fps) {
    this.client.createLocalStream({
      video: {
        frameRate: fps
      },
      audio: true
    });
  },
  defaultCameraParametes: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableVideo return true", this.client.disableVideo());
    this.debug("enableVideo return true", this.client.enableVideo());
    this.debug("disableAudio return true", this.client.disableAudio());
    this.debug("enableAudio return true", this.client.enableAudio());
  },
  audioOnlyCameraParametes: function () {
    this.debug("hasVideo return false", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableVideo return false", this.client.disableVideo());
    this.debug("enableVideo return false", this.client.enableVideo());
    this.debug("disableAudio return true", this.client.disableAudio());
    this.debug("enableAudio return true", this.client.enableAudio());
  },
  videoOnlyCameraParametes: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return false", this.client.hasAudio());
    this.debug("disableVideo return true", this.client.disableVideo());
    this.debug("enableVideo return true", this.client.enableVideo());
    this.debug("disableAudio return false", this.client.disableAudio());
    this.debug("enableAudio return false", this.client.enableAudio());
  },
  noVideoAndAudioParametes: function  () {
    this.debug("hasVideo return false", this.client.hasVideo());
    this.debug("hasAudio return false", this.client.hasAudio());
    this.debug("disableVideo return false", this.client.disableVideo());
    this.debug("enableVideo return true", this.client.enableVideo());
    this.debug("disableAudio return false", this.client.disableAudio());
    this.debug("enableAudio return true", this.client.enableAudio());
  },
  cameraEnableVideoTwice: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableVideo return true", this.client.disableVideo());
    this.debug("enableVideo return true", this.client.enableVideo());
    this.debug("enableVideo twice return false", this.client.enableVideo());
  },
  cameraEnableAudioTwice: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableAudio return true", this.client.disableAudio());
    this.debug("enableAudio return true", this.client.enableAudio());
    this.debug("enableAudio twice return false", this.client.enableAudio());
  },
  cameraDisableVideoTwice: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableVideo return true", this.client.disableVideo());
    this.debug("disableVideo return false", this.client.disableVideo());
    this.debug("enableVideo twice return false", this.client.enableVideo());
  },
  cameraDisableAudioTwice: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableAudio return true", this.client.disableAudio());
    this.debug("disableAudio return false", this.client.disableAudio());
    this.debug("enableAudio twice return false", this.client.enableAudio());
  },
  cameraDisableAudioAndVideo: function () {
    this.debug("hasVideo return true", this.client.hasVideo());
    this.debug("hasAudio return true", this.client.hasAudio());
    this.debug("disableAudio return true", this.client.disableVideo());
    this.debug("disableAudio return true", this.client.disableAudio());
  },
  cameraClose: function () {
    this.client.close();
  }
}