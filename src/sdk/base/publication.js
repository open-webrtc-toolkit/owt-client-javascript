// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

import * as Utils from './utils.js'
import * as MediaFormat from './mediaformat.js'

/**
 * @class AudioPublicationSettings
 * @memberOf Ics.Base
 * @classDesc The settings of a publication.
 * @hideconstructor
 */
export class AudioPublicationSettings {
  constructor(codec) {
    /**
     * @member {?Ics.Base.AudioCodecParameters} codec
     * @instance
     * @memberof Ics.Base.AudioPublicationSettings
     */
    this.codec = codec;
  }
}

/**
 * @class VideoPublicationSettings
 * @memberOf Ics.Base
 * @classDesc The settings of a publication.
 * @hideconstructor
 */
export class VideoPublicationSettings {
  constructor(codec, resolution, frameRate, bitrate, keyFrameInterval){
    /**
     * @member {?Ics.Base.VideoCodecParameters} codec
     * @instance
     * @memberof Ics.Base.VideoPublicationSettings
     */
    this.codec=codec,
    /**
     * @member {?Ics.Base.Resolution} resolution
     * @instance
     * @memberof Ics.Base.VideoPublicationSettings
     */
    this.resolution=resolution;
    /**
     * @member {?number} frameRates
     * @instance
     * @memberof Ics.Base.VideoPublicationSettings
     */
    this.frameRate=frameRate;
    /**
     * @member {?number} bitrate
     * @instance
     * @memberof Ics.Base.VideoPublicationSettings
     */
    this.bitrate=bitrate;
    /**
     * @member {?number} keyFrameIntervals
     * @instance
     * @memberof Ics.Base.VideoPublicationSettings
     */
    this.keyFrameInterval=keyFrameInterval;
  }
}

/**
 * @class PublicationSettings
 * @memberOf Ics.Base
 * @classDesc The settings of a publication.
 * @hideconstructor
 */
export class PublicationSettings {
  constructor(audio, video){
    /**
     * @member {Ics.Base.AudioPublicationSettings} audio
     * @instance
     * @memberof Ics.Base.PublicationSettings
     */
    this.audio=audio;
    /**
     * @member {Ics.Base.VideoPublicationSettings} video
     * @instance
     * @memberof Ics.Base.PublicationSettings
     */
    this.video=video;
  }
}

/**
 * @class Publication
 * @memberOf Ics.Base
 * @classDesc The settings of a publication.
 * @hideconstructor
 */
export class Publication {
  constructor(id, stop, mute, unmute) {
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Base.Publication
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid()
    });
  /**
   * @function stop
   * @instance
   * @desc Stop certain publication. Once a subscription is stopped, it cannot be recovered.
   * @memberof Ics.Base.Publication
   * @returns {undefined}
   */
    this.stop = stop;
  }
}
