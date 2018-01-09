// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';
import * as utils from './utils.js'
import Logger from './logger.js'
import { Resolution } from './mediaformat.js'
import * as MediaFormatModule from './mediaformat.js'

/**
 * @class MediaStreamTrackAudioConstraints
 * @classDesc Constraints for creating an audio MediaStreamTrack.
 * @memberof Ics.Base
 * @hideconstructor
 */
export class MediaStreamTrackAudioConstraints {}
/**
 * @class MediaStreamTrackDeviceConstraintsForAudio
 * @classDesc Constraints for creating an audio MediaStreamTrack from mic. Currently, only deviceId is supported. please create an MediaStreamTrackDeviceConstraintsForAudio and pass it to createMediaStream function to create a MediaStream with audio captured from mic.
 * @memberof Ics.Base
 * @extends Ics.Base.MediaStreamTrackAudioConstraints
 * @hideconstructor
 */
export class MediaStreamTrackDeviceConstraintsForAudio extends MediaStreamTrackAudioConstraints {
  constructor() {
    super();
  /**
   * @member {string} source
   * @memberof Ics.Base.MediaStreamTrackDeviceConstraintsForAudio
   * @instance
   * @desc "mic"
   */
    this.source = MediaFormatModule.AudioSourceInfo.MIC;
  }
}
/**
 * @class MediaStreamTrackScreenCastConstraintsForAudio
 * @classDesc Constraints for creating an audio MediaStreamTrack from screen cast. Currently, constrains for audio from screen cast are not supported. please create an MediaStreamTrackScreenCastConstraintsForAudio and pass it to createMediaStream function to create a MediaStream with audio captured from screen cast.
 * @memberof Ics.Base
 * @extends Ics.Base.MediaStreamTrackAudioConstraints
 * @hideconstructor
 */
export class MediaStreamTrackScreenCastConstraintsForAudio extends MediaStreamTrackAudioConstraints {
  constructor() {
    super();
  /**
   * @member {string} source
   * @memberof Ics.Base.MediaStreamTrackScreenCastConstraintsForAudio
   * @instance
   * @desc "screen-cast"
   */
    this.source = MediaFormatModule.AudioSourceInfo.SCREENCAST;
  }
}
/**
 * @class MediaStreamTrackVideoConstraints
 * @classDesc Constraints for creating a video MediaStreamTrack.
 * @memberof Ics.Base
 * @hideconstructor
 */
export class MediaStreamTrackVideoConstraints {}
/**
 * @class MediaStreamTrackDeviceConstraintsForVideo
 * @classDesc Constraints for creating a video MediaStreamTrack from camera.
 * @memberof Ics.Base
 * @extends Ics.Base.MediaStreamTrackVideoConstraints
 * @hideconstructor
 */
export class MediaStreamTrackDeviceConstraintsForVideo extends MediaStreamTrackVideoConstraints {
  constructor() {
    super();
  /**
   * @member {string} source
   * @memberof Ics.Base.MediaStreamTrackDeviceConstraintsForVideo
   * @instance
   * @desc "camera"
   */
    this.source = MediaFormatModule.VideoSourceInfo.CAMERA;
  }
}
/**
 * @class MediaStreamTrackScreenCastConstraintsForVideo
 * @classDesc Constraints for creating a video MediaStreamTrack from screen cast.
 * @memberof Ics.Base
 * @extends Ics.Base.MediaStreamTrackVideoConstraints
 * @hideconstructor
 */
export class MediaStreamTrackScreenCastConstraintsForVideo extends MediaStreamTrackVideoConstraints {
  constructor() {
    super();
  /**
   * @member {string} source
   * @memberof Ics.Base.MediaStreamTrackScreenCastConstraintsForVideo
   * @instance
   * @desc "screen-cast"
   */
    this.source = MediaFormatModule.VideoSourceInfo.SCREENCAST;
  }
}
/**
 * @class MediaStreamDeviceConstraints
 * @classDesc Constraints for creating a MediaStream from screen mic and camera.
 * @memberof Ics.Base
 * @hideconstructor
 */
export class MediaStreamDeviceConstraints {
  constructor(audioConstraints = false, videoConstraints = false) {
    if (((typeof audioConstraints !== 'boolean') && audioConstraints.source !==
        MediaFormatModule.AudioSourceInfo.MIC) ||
      ((typeof videoConstraints !== 'boolean') && videoConstraints.source !==
        MediaFormatModule.VideoSourceInfo.CAMERA))
      throw new TypeError('Invalid audioConstrains or videoConstraints.');
  /**
   * @member {Ics.Base.MediaStreamTrackDeviceConstraintsForAudio} audio
   * @memberof Ics.Base.MediaStreamDeviceConstraints
   * @instance
   */
    this.audio = audioConstraints;
  /**
   * @member {Ics.Base.MediaStreamTrackDeviceConstraintsForVideo} Video
   * @memberof Ics.Base.MediaStreamDeviceConstraints
   * @instance
   */
    this.video = videoConstraints;
  }
}
/**
 * @class MediaStreamScreenCastConstraints
 * @classDesc Constraints for creating a MediaStream from screen cast.
 * @memberof Ics.Base
 * @hideconstructor
 */
export class MediaStreamScreenCastConstraints {
  constructor(audioConstraints = false, videoConstraints = false) {
    if (((typeof audioConstraints !== 'boolean') && audioConstraints.source !==
        MediaFormatModule.AudioSourceInfo.SCREENCAST) ||
      ((typeof videoConstraints !== 'boolean') && videoConstraints.source !==
        MediaFormatModule.VideoSourceInfo.SCREENCAST))
      throw new TypeError(
        'Invalid type of audioConstrains or videoConstraints.');
  /**
   * @member {Ics.Base.MediaStreamTrackScreenCastConstraintsForAudio} audio
   * @memberof Ics.Base.MediaStreamScreenCastConstraints
   * @instance
   */
    this.audio = audioConstraints;
  /**
   * @member {Ics.Base.MediaStreamTrackScreenCastConstraintsForVideo} video
   * @memberof Ics.Base.MediaStreamScreenCastConstraints
   * @instance
   */
    this.video = videoConstraints;
  }
}

function isConstrainsForScreenCast(constraints) {
  return ((typeof constraints.audio === 'object' && constraints.audio.source ===
    MediaFormatModule.AudioSourceInfo.SCREENCAST) || (typeof constraints.video ===
    'object' && constraints.video.source === MediaFormatModule.VideoSourceInfo
    .SCREENCAST))
}

/**
 * @class MediaStreamFactory
 * @classDesc A factory to create MediaStream. You can also create MediaStream by yourself.
 * @memberof Ics.Base
 */
export class MediaStreamFactory {
  /**
   * @function createMediaStream
   * @static
   * @desc Create a MediaStream with given constraints.
   * @memberof Ics.Base.MediaStreamFactory
   * @returns {Promise<MediaStream, Error>} Return a promise that is resolved when stream is successfully created, or rejected if one of the following error happened:
   * - One or more parameters cannot be satisfied.
   * - Specified device is busy.
   * - Cannot obtain necessary permission or operation is canceled by user.
   * @param {Ics.Base.MediaStreamDeviceConstraints|Ics.Base.MediaStreamScreenCastConstraints} constraints
   */
  static createMediaStream(constraints) {
    if (typeof constraints !== 'object' || (!constraints.audio && !
        constraints.video)) {
      return Promise.reject(new TypeError('Invalid constrains'));
    }
    if (isConstrainsForScreenCast(constraints) && !utils.isChrome() && !utils
      .isFirefox()) {
      return Promise.reject(new TypeError(
        'Screen sharing only supports Chrome and Firefox.'));
    }
    // Screen sharing on Chrome does not work with the latest constraints format.
    if (isConstrainsForScreenCast(constraints) && utils.isChrome()) {
      if (!constraints.extensionId) {
        return Promise.reject(new TypeError(
          'Extension ID must be specified for screen sharing on Chrome.'));
      }
      const desktopCaptureSources = ['screen', 'window', 'tab'];
      if (constraints.audio) {
        desktopCaptureSources.push('audio');
      }
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(constraints.extensionId, {
          getStream: desktopCaptureSources
        }, function(response) {
          if (response === undefined) {
            return reject(new Error(chrome.runtime.lastError.message));
          }
          if (constraints.audio && typeof response.options !==
            'object') {
            Logger.warning(
              'Desktop sharing with audio requires the latest Chrome extension. Your audio constraints will be ignored.'
            );
          }
          const mediaConstraints = Object.create({});
          if (constraints.audio && (typeof response.options ===
              'object')) {
            if (response.options.canRequestAudioTrack) {
              mediaConstraints.audio = {
                mandatory: {
                  chromeMediaSource: 'desktop',
                  chromeMediaSourceId: response.streamId
                }
              }
            } else {
              Logger.warning(
                'Sharing screen with audio was not selected by user.'
              );
            }
            mediaConstraints.video = Object.create({});
            mediaConstraints.video.mandatory = Object.create({});
            mediaConstraints.video.mandatory.chromeMediaSource =
              'desktop';
            mediaConstraints.video.mandatory.chromeMediaSourceId =
              response.streamId;
            // Transform new constraint format to the old style. Because chromeMediaSource only supported in the old style, and mix new and old style will result type error: "Cannot use both optional/mandatory and specific or advanced constraints.".
            if (constraints.video.resolution) {
              mediaConstraints.video.mandatory.maxHeight =
                mediaConstraints.video.mandatory.minHeight =
                constraints.video.resolution.height;
              mediaConstraints.video.mandatory.maxWidth =
                mediaConstraints.video.mandatory.minWidth =
                constraints.video.resolution.width;
            }
            if (constraints.video.frameRate) {
              mediaConstraints.video.mandatory.minFrameRate =
                constraints.video.frameRate;
              mediaConstraints.video.mandatory.maxFrameRate =
                constraints.video.frameRate;
            }
            resolve(navigator.mediaDevices.getUserMedia(
              mediaConstraints));
          };
        });
      })
    } else {
      if (!constraints.audio && !constraints.video) {
        return Promise.reject(new TypeError(
          'At least one of audio and video must be requested.'));
      }
      const mediaConstraints = Object.create({});
      if (typeof constraints.audio === 'object' && constraints.audio.source ===
        MediaFormatModule.AudioSourceInfo.MIC) {
        mediaConstraints.audio = Object.create({});
        mediaConstraints.audio.deviceId = constraints.audio.deviceId;
      } else {
        mediaConstraints.audio = constraints.audio;
      }
      if (typeof constraints.audio === 'object' && constraints.audio.source ===
        MediaFormatModule.AudioSourceInfo.SCREENCAST) {
        Logger.warning(
          'Screen sharing with audio is not supported in Firefox.');
        mediaConstraints.audio = false;
      }
      if (typeof constraints.video === 'object') {
        mediaConstraints.video = Object.create({});
        if (constraints.video.frameRate instanceof Number) {
          mediaConstraints.video.frameRate = constraints.video.frameRate;
        }
        if (constraints.video.resolution instanceof Resolution) {
          mediaConstraints.video.width = constraints.video.resolution.width;
          mediaConstraints.video.height = constraints.video.resolution.height;
        }
        if (constraints.video.deviceId instanceof String) {
          mediaConstraints.video.deviceId = constraints.video.deviceId;
        }
        if (utils.isFirefox() && constraints.video.source ===
          MediaFormatModule.VideoSourceInfo.SCREENCAST) {
          mediaConstraints.video.mediaSource = 'screen';
        }
      } else {
        mediaConstraints.video = constraints.video;
      }
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    }
  }
}
