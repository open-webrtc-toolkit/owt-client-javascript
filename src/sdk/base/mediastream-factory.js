// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* global console, window, Promise, chrome, navigator */

'use strict';
import * as utils from './utils.js';
import Logger from './logger.js';
import * as MediaFormatModule from './mediaformat.js';

/**
 * @class AudioTrackConstraints
 * @classDesc Constraints for creating an audio MediaStreamTrack.
 * @memberof Owt.Base
 * @constructor
 * @param {Owt.Base.AudioSourceInfo} source Source info of this audio track.
 */
export class AudioTrackConstraints {
  // eslint-disable-next-line require-jsdoc
  constructor(source) {
    if (!Object.values(MediaFormatModule.AudioSourceInfo)
        .some((v) => v === source)) {
      throw new TypeError('Invalid source.');
    }
    /**
     * @member {string} source
     * @memberof Owt.Base.AudioTrackConstraints
     * @desc Values could be "mic", "screen-cast", "file" or "mixed".
     * @instance
     */
    this.source = source;
    /**
     * @member {string} deviceId
     * @memberof Owt.Base.AudioTrackConstraints
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
 * @memberof Owt.Base
 * @constructor
 * @param {Owt.Base.VideoSourceInfo} source Source info of this video track.
 */
export class VideoTrackConstraints {
  // eslint-disable-next-line require-jsdoc
  constructor(source) {
    if (!Object.values(MediaFormatModule.VideoSourceInfo)
      .some((v) => v === source)) {
      throw new TypeError('Invalid source.');
    }
    /**
     * @member {string} source
     * @memberof Owt.Base.VideoTrackConstraints
     * @desc Values could be "camera", "screen-cast", "file" or "mixed".
     * @instance
     */
    this.source = source;
    /**
     * @member {string} deviceId
     * @memberof Owt.Base.VideoTrackConstraints
     * @desc Do not provide deviceId if source is not "camera".
     * @instance
     * @see https://w3c.github.io/mediacapture-main/#def-constraint-deviceId
     */

    this.deviceId = undefined;

    /**
     * @member {Owt.Base.Resolution} resolution
     * @memberof Owt.Base.VideoTrackConstraints
     * @instance
     */
    this.resolution = undefined;

    /**
     * @member {number} frameRate
     * @memberof Owt.Base.VideoTrackConstraints
     * @instance
     */
    this.frameRate = undefined;
  }
}
/**
 * @class StreamConstraints
 * @classDesc Constraints for creating a MediaStream from screen mic and camera.
 * @memberof Owt.Base
 * @constructor
 * @param {?Owt.Base.AudioTrackConstraints} audioConstraints
 * @param {?Owt.Base.VideoTrackConstraints} videoConstraints
 */
export class StreamConstraints {
  // eslint-disable-next-line require-jsdoc
  constructor(audioConstraints = false, videoConstraints = false) {
    /**
     * @member {Owt.Base.MediaStreamTrackDeviceConstraintsForAudio} audio
     * @memberof Owt.Base.MediaStreamDeviceConstraints
     * @instance
     */
    this.audio = audioConstraints;
    /**
     * @member {Owt.Base.MediaStreamTrackDeviceConstraintsForVideo} Video
     * @memberof Owt.Base.MediaStreamDeviceConstraints
     * @instance
     */
    this.video = videoConstraints;
  }
}

// eslint-disable-next-line require-jsdoc
function isVideoConstrainsForScreenCast(constraints) {
  return (typeof constraints.video === 'object' && constraints.video.source ===
    MediaFormatModule.VideoSourceInfo.SCREENCAST);
}

/**
 * @class MediaStreamFactory
 * @classDesc A factory to create MediaStream. You can also create MediaStream by yourself.
 * @memberof Owt.Base
 */
export class MediaStreamFactory {
  /**
   * @function createMediaStream
   * @static
   * @desc Create a MediaStream with given constraints. If you want to create a MediaStream for screen cast, please make sure both audio and video's source are "screen-cast".
   * @memberof Owt.Base.MediaStreamFactory
   * @returns {Promise<MediaStream, Error>} Return a promise that is resolved when stream is successfully created, or rejected if one of the following error happened:
   * - One or more parameters cannot be satisfied.
   * - Specified device is busy.
   * - Cannot obtain necessary permission or operation is canceled by user.
   * - Video source is screen cast, while audio source is not.
   * - Audio source is screen cast, while video source is disabled.
   * @param {Owt.Base.StreamConstraints} constraints
   */
  static createMediaStream(constraints) {
    if (typeof constraints !== 'object' ||
        (!constraints.audio && !constraints.video)) {
      return Promise.reject(new TypeError('Invalid constrains'));
    }
    if (!isVideoConstrainsForScreenCast(constraints) &&
        (typeof constraints.audio === 'object') &&
        constraints.audio.source ===
            MediaFormatModule.AudioSourceInfo.SCREENCAST) {
      return Promise.reject(
          new TypeError('Cannot share screen without video.'));
    }
    if (isVideoConstrainsForScreenCast(constraints) && !utils.isChrome() &&
        !utils.isFirefox()) {
      return Promise.reject(
          new TypeError('Screen sharing only supports Chrome and Firefox.'));
    }
    if (isVideoConstrainsForScreenCast(constraints) &&
        typeof constraints.audio === 'object' &&
        constraints.audio.source !==
            MediaFormatModule.AudioSourceInfo.SCREENCAST) {
      return Promise.reject(new TypeError(
          'Cannot capture video from screen cast while capture audio from'
          + ' other source.'));
    }

    // Check and convert constraints.
    if (!constraints.audio && !constraints.video) {
      return Promise.reject(new TypeError(
        'At least one of audio and video must be requested.'));
    }
    const mediaConstraints = Object.create({});
    if (typeof constraints.audio === 'object' &&
        constraints.audio.source === MediaFormatModule.AudioSourceInfo.MIC) {
      mediaConstraints.audio = Object.create({});
      if (utils.isEdge()) {
        mediaConstraints.audio.deviceId = constraints.audio.deviceId;
      } else {
        mediaConstraints.audio.deviceId = {
          exact: constraints.audio.deviceId,
        };
      }
    } else {
      if (constraints.audio.source === MediaFormatModule.AudioSourceInfo.SCREENCAST) {
        mediaConstraints.audio = true;
      } else {
        mediaConstraints.audio = constraints.audio;
      }
    }
    if (typeof constraints.video === 'object') {
      mediaConstraints.video = Object.create({});
      if (typeof constraints.video.frameRate === 'number') {
        mediaConstraints.video.frameRate = constraints.video.frameRate;
      }
      if (constraints.video.resolution &&
          constraints.video.resolution.width &&
          constraints.video.resolution.height) {
            if (constraints.video.source ===
              MediaFormatModule.VideoSourceInfo.SCREENCAST) {
              mediaConstraints.video.width =
                constraints.video.resolution.width;
              mediaConstraints.video.height =
                constraints.video.resolution.height;
            } else {
              mediaConstraints.video.width = Object.create({});
              mediaConstraints.video.width.exact =
                  constraints.video.resolution.width;
              mediaConstraints.video.height = Object.create({});
              mediaConstraints.video.height.exact =
                  constraints.video.resolution.height;

            }
      }
      if (typeof constraints.video.deviceId === 'string') {
        mediaConstraints.video.deviceId = { exact: constraints.video.deviceId };
      }
      if (utils.isFirefox() &&
          constraints.video.source ===
              MediaFormatModule.VideoSourceInfo.SCREENCAST) {
        mediaConstraints.video.mediaSource = 'screen';
      }
    } else {
      mediaConstraints.video = constraints.video;
    }

    if (isVideoConstrainsForScreenCast(constraints)) {
      return navigator.mediaDevices.getDisplayMedia(mediaConstraints);
    } else {
      return navigator.mediaDevices.getUserMedia(mediaConstraints);
    }
  }
}
