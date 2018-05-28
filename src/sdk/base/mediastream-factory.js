// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';
import * as utils from './utils.js'
import Logger from './logger.js'
import { Resolution } from './mediaformat.js'
import * as MediaFormatModule from './mediaformat.js'

/**
 * @class AudioTrackConstraints
 * @classDesc Constraints for creating an audio MediaStreamTrack.
 * @memberof Ics.Base
 * @constructor
 * @param {Ics.Base.AudioSourceInfo} source Source info of this audio track.
 */
export class AudioTrackConstraints {
  constructor(source) {
    if (!Object.values(MediaFormatModule.AudioSourceInfo)
             .some(v => v === source)) {
      throw new TypeError('Invalid source.');
    }
    /**
     * @member {string} source
     * @memberof Ics.Base.AudioTrackConstraints
     * @desc Values could be "mic", "screen-cast", "file" or "mixed".
     * @instance
     */
    this.source = source;
    /**
     * @member {string} deviceId
     * @memberof Ics.Base.AudioTrackConstraints
     * @desc Do not provide deviceId if source is not "mic".
     * @instance
     * @see https://w3c.github.io/mediacapture-main/#def-constraint-deviceId
     */
     this.deviceId = undefined;
  }
}

/**
 * @class VideoTrackConstraints
 * @classDesc Constraints for creating a video MediaStreamTrack.
 * @memberof Ics.Base
 * @constructor
 * @param {Ics.Base.VideoSourceInfo} source Source info of this video track.
 */
export class VideoTrackConstraints {
  constructor(source) {
    if (!Object.values(MediaFormatModule.VideoSourceInfo)
             .some(v => v === source)) {
      throw new TypeError('Invalid source.');
    }
    /**
     * @member {string} source
     * @memberof Ics.Base.VideoTrackConstraints
     * @desc Values could be "camera", "screen-cast", "file" or "mixed".
     * @instance
     */
    this.source = source;
    /**
     * @member {string} deviceId
     * @memberof Ics.Base.VideoTrackConstraints
     * @desc Do not provide deviceId if source is not "camera".
     * @instance
     * @see https://w3c.github.io/mediacapture-main/#def-constraint-deviceId
     */

    this.deviceId = undefined;

    /**
     * @member {Ics.Base.Resolution} resolution
     * @memberof Ics.Base.VideoTrackConstraints
     * @instance
     */
    this.resolution = undefined;

    /**
     * @member {number} frameRate
     * @memberof Ics.Base.VideoTrackConstraints
     * @instance
     */
    this.frameRate = undefined;
  }
}
/**
 * @class StreamConstraints
 * @classDesc Constraints for creating a MediaStream from screen mic and camera.
 * @memberof Ics.Base
 * @constructor
 * @param {?Ics.Base.AudioTrackConstraints} audioConstraints
 * @param {?Ics.Base.VideoTrackConstraints} videoConstraints
 * @param {?string} extensionId The ID of Chrome screen sharing extension.
 */
export class StreamConstraints {
  constructor(audioConstraints = false, videoConstraints = false) {
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
    /**
     * @member {string} extensionId
     * @memberof Ics.Base.MediaStreamDeviceConstraints
     * @desc The ID of Chrome Extension for screen sharing.
     * @instance
     */
  }
}

function isVideoConstrainsForScreenCast(constraints) {
  return (typeof constraints.video === 'object' && constraints.video.source ===
    MediaFormatModule.VideoSourceInfo.SCREENCAST);
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
   * @desc Create a MediaStream with given constraints. If you want to create a MediaStream for screen cast, please make sure both audio and video's source are "screen-cast".
   * @memberof Ics.Base.MediaStreamFactory
   * @returns {Promise<MediaStream, Error>} Return a promise that is resolved when stream is successfully created, or rejected if one of the following error happened:
   * - One or more parameters cannot be satisfied.
   * - Specified device is busy.
   * - Cannot obtain necessary permission or operation is canceled by user.
   * - Video source is screen cast, while audio source is not.
   * - Audio source is screen cast, while video source is disabled.
   * @param {Ics.Base.StreamConstraints} constraints
   */
  static createMediaStream(constraints) {
    if (typeof constraints !== 'object' || (!constraints.audio && !
        constraints.video)) {
      return Promise.reject(new TypeError('Invalid constrains'));
    }
    if (!isVideoConstrainsForScreenCast(constraints) && (typeof constraints.audio ===
        'object') && constraints.audio.source === MediaFormatModule.AudioSourceInfo
      .SCREENCAST) {
      return Promise.reject(new TypeError('Cannot share screen without video.'));
    }
    if (isVideoConstrainsForScreenCast(constraints) && !utils.isChrome() && !utils
      .isFirefox()) {
      return Promise.reject(new TypeError(
        'Screen sharing only supports Chrome and Firefox.'));
    }
    if (isVideoConstrainsForScreenCast(constraints) && typeof constraints.audio ===
      'object' && constraints.audio.source !== MediaFormatModule.AudioSourceInfo
      .SCREENCAST) {
      return Promise.reject(new TypeError(
        'Cannot capture video from screen cast while capture audio from other source.'
      ));
    };
    // Screen sharing on Chrome does not work with the latest constraints format.
    if (isVideoConstrainsForScreenCast(constraints) && utils.isChrome()) {
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
            mediaConstraints.video.mandatory.minFrameRate = constraints.video.frameRate;
            mediaConstraints.video.mandatory.maxFrameRate =
              constraints.video.frameRate;
          }
          resolve(navigator.mediaDevices.getUserMedia(
            mediaConstraints));
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
        if (typeof constraints.video.frameRate === 'number') {
          mediaConstraints.video.frameRate = constraints.video.frameRate;
        }
        if (constraints.video.resolution && constraints.video.resolution.width &&
          constraints.video.resolution.height) {
          mediaConstraints.video.width = Object.create({});
          mediaConstraints.video.width.exact = constraints.video.resolution.width;
          mediaConstraints.video.height = Object.create({});
          mediaConstraints.video.height.exact = constraints.video.resolution.height;
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
