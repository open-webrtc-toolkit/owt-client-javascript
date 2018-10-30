'use strict';
/**
 * Source info about an audio track. Values: 'mic', 'screen-cast', 'file', 'mixed'.
 * @memberOf Oms.Base
 * @readonly
 * @enum {string}
 */
export const AudioSourceInfo = {
  MIC: 'mic',
  SCREENCAST: 'screen-cast',
  FILE: 'file',
  MIXED: 'mixed'
};

/**
 * Source info about a video track. Values: 'camera', 'screen-cast', 'file', 'mixed'.
 * @memberOf Oms.Base
 * @readonly
 * @enum {string}
 */
export const VideoSourceInfo = {
  CAMERA: 'camera',
  SCREENCAST: 'screen-cast',
  FILE: 'file',
  MIXED: 'mixed'
};

/**
 * Kind of a track. Values: 'audio' for audio track, 'video' for video track, 'av' for both audio and video tracks.
 * @memberOf Oms.Base
 * @readonly
 * @enum {string}
 */
export const TrackKind = {
  /**
   * Audio tracks.
   * @type string
   */
  AUDIO: 'audio',
  /**
   * Video tracks.
   * @type string
   */
  VIDEO: 'video',
  /**
   * Both audio and video tracks.
   * @type string
   */
  AUDIO_AND_VIDEO: 'av'
};
/**
 * @class Resolution
 * @memberOf Oms.Base
 * @classDesc The Resolution defines the size of a rectangle.
 * @constructor
 * @param {number} width
 * @param {number} height
 */
export class Resolution {
  constructor(width, height) {
    /**
     * @member {number} width
     * @instance
     * @memberof Oms.Base.Resolution
     */
    this.width = width;
    /**
     * @member {number} height
     * @instance
     * @memberof Oms.Base.Resolution
     */
    this.height = height;
  }
}
