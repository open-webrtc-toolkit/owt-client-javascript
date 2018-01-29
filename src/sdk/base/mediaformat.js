'use strict';

export const AudioSourceInfo = {
  MIC: 'mic',
  SCREENCAST: 'screen-cast',
  FILE: 'file',
  MIXED: 'mixed'
};

export const VideoSourceInfo = {
  CAMERA: 'camera',
  SCREENCAST: 'screen-cast',
  FILE: 'file',
  MIXED: 'mixed'
};

export const TrackKind = {
  AUDIO: 'audio',
  VIDEO: 'video',
  AUDIO_AND_VIDEO: 'av'
};

/**
 * @class Resolution
 * @memberOf Ics.Base
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
     * @memberof Ics.Base.Resolution
     */
    this.width = width;
    /**
     * @member {number} height
     * @instance
     * @memberof Ics.Base.Resolution
     */
    this.height = height;
  }
}
