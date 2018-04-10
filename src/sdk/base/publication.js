// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

import * as Utils from './utils.js'
import * as MediaFormat from './mediaformat.js'
import { EventDispatcher} from '../base/event.js'

/**
 * @class AudioPublicationSettings
 * @memberOf Ics.Base
 * @classDesc The audio settings of a publication.
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
 * @classDesc The video settings of a publication.
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
 * @classDesc Publication represents a sender for publishing a stream. It handles the actions on a LocalStream published to a conference.
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | ended           | Event            | Publication is ended. |
 * | mute            | MuteEvent        | Publication is muted. Client stopped sending audio and/or video data to remote endpoint. |
 * | unmute          | MuteEvent        | Publication is unmuted. Client continued sending audio and/or video data to remote endpoint. |
 *
 * @hideconstructor
 */
export class Publication extends EventDispatcher {
  constructor(id, stop, getStats, mute, unmute) {
    super();
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
  /**
   * @function getStats
   * @instance
   * @desc Get stats of underlying PeerConnection.
   * @memberof Ics.Base.Publication
   * @returns {Promise<RTCStatsReport, Error>}
   */
    this.getStats = getStats;
  /**
   * @function mute
   * @instance
   * @desc Stop sending data to remote endpoint.
   * @memberof Ics.Base.Publication
   * @returns {Promise<undefined, Error>}
   */
    this.mute=mute;
  /**
   * @function unmute
   * @instance
   * @desc Continue sending data to remote endpoint.
   * @memberof Ics.Base.Publication
   * @returns {Promise<undefined, Error>}
   */
    this.unmute=unmute;
  }
}

/**
 * @class PublishOptions
 * @memberOf Ics.Base
 * @classDesc PublishOptions defines options for publishing a Ics.Base.LocalStream.
 */
export class PublishOptions {
  constructor(audio, video) {
    /**
     * @member {?Array<Ics.Base.AudioEncodingParameters>} audio
     * @instance
     * @memberof Ics.Base.PublishOptions
     */
    this.audio = audio;
    /**
     * @member {?Array<Ics.Base.VideoEncodingParameters>} video
     * @instance
     * @memberof Ics.Base.PublishOptions
     */
    this.video = video;
  }
}
