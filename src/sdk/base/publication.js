// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import * as Utils from './utils.js';
import * as MediaFormat from './mediaformat.js';
import {EventDispatcher} from '../base/event.js';

/**
 * @class AudioPublicationSettings
 * @memberOf Oms.Base
 * @classDesc The audio settings of a publication.
 * @hideconstructor
 */
export class AudioPublicationSettings {
  constructor(codec) {
    /**
     * @member {?Oms.Base.AudioCodecParameters} codec
     * @instance
     * @memberof Oms.Base.AudioPublicationSettings
     */
    this.codec = codec;
  }
}

/**
 * @class VideoPublicationSettings
 * @memberOf Oms.Base
 * @classDesc The video settings of a publication.
 * @hideconstructor
 */
export class VideoPublicationSettings {
  constructor(codec, resolution, frameRate, bitrate, keyFrameInterval) {
    /**
     * @member {?Oms.Base.VideoCodecParameters} codec
     * @instance
     * @memberof Oms.Base.VideoPublicationSettings
     */
    this.codec=codec,
    /**
     * @member {?Oms.Base.Resolution} resolution
     * @instance
     * @memberof Oms.Base.VideoPublicationSettings
     */
    this.resolution=resolution;
    /**
     * @member {?number} frameRates
     * @instance
     * @memberof Oms.Base.VideoPublicationSettings
     */
    this.frameRate=frameRate;
    /**
     * @member {?number} bitrate
     * @instance
     * @memberof Oms.Base.VideoPublicationSettings
     */
    this.bitrate=bitrate;
    /**
     * @member {?number} keyFrameIntervals
     * @instance
     * @memberof Oms.Base.VideoPublicationSettings
     */
    this.keyFrameInterval=keyFrameInterval;
  }
}

/**
 * @class PublicationSettings
 * @memberOf Oms.Base
 * @classDesc The settings of a publication.
 * @hideconstructor
 */
export class PublicationSettings {
  constructor(audio, video) {
    /**
     * @member {Oms.Base.AudioPublicationSettings} audio
     * @instance
     * @memberof Oms.Base.PublicationSettings
     */
    this.audio=audio;
    /**
     * @member {Oms.Base.VideoPublicationSettings} video
     * @instance
     * @memberof Oms.Base.PublicationSettings
     */
    this.video=video;
  }
}

/**
 * @class Publication
 * @memberOf Oms.Base
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
     * @memberof Oms.Base.Publication
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid(),
    });
    /**
     * @function stop
     * @instance
     * @desc Stop certain publication. Once a subscription is stopped, it cannot be recovered.
     * @memberof Oms.Base.Publication
     * @returns {undefined}
     */
    this.stop = stop;
    /**
     * @function getStats
     * @instance
     * @desc Get stats of underlying PeerConnection.
     * @memberof Oms.Base.Publication
     * @returns {Promise<RTCStatsReport, Error>}
     */
    this.getStats = getStats;
    /**
     * @function mute
     * @instance
     * @desc Stop sending data to remote endpoint.
     * @memberof Oms.Base.Publication
     * @param {Oms.Base.TrackKind } kind Kind of tracks to be muted.
     * @returns {Promise<undefined, Error>}
     */
    this.mute = mute;
    /**
     * @function unmute
     * @instance
     * @desc Continue sending data to remote endpoint.
     * @memberof Oms.Base.Publication
     * @param {Oms.Base.TrackKind } kind Kind of tracks to be unmuted.
     * @returns {Promise<undefined, Error>}
     */
    this.unmute = unmute;
  }
}

/**
 * @class PublishOptions
 * @memberOf Oms.Base
 * @classDesc PublishOptions defines options for publishing a Oms.Base.LocalStream.
 */
export class PublishOptions {
  constructor(audio, video) {
    /**
     * @member {?Array<Oms.Base.AudioEncodingParameters>} audio
     * @instance
     * @memberof Oms.Base.PublishOptions
     */
    this.audio = audio;
    /**
     * @member {?Array<Oms.Base.VideoEncodingParameters>} video
     * @instance
     * @memberof Oms.Base.PublishOptions
     */
    this.video = video;
  }
}
