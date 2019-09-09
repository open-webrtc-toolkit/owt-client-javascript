// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import * as MediaFormatModule from '../base/mediaformat.js';
import * as CodecModule from '../base/codec.js';
import {EventDispatcher} from '../base/event.js';

/**
 * @class AudioSubscriptionCapabilities
 * @memberOf Owt.Conference
 * @classDesc Represents the audio capability for subscription.
 * @hideconstructor
 */
export class AudioSubscriptionCapabilities {
  // eslint-disable-next-line require-jsdoc
  constructor(codecs) {
    /**
     * @member {Array.<Owt.Base.AudioCodecParameters>} codecs
     * @instance
     * @memberof Owt.Conference.AudioSubscriptionCapabilities
     */
    this.codecs = codecs;
  }
}

/**
 * @class VideoSubscriptionCapabilities
 * @memberOf Owt.Conference
 * @classDesc Represents the video capability for subscription.
 * @hideconstructor
 */
export class VideoSubscriptionCapabilities {
  // eslint-disable-next-line require-jsdoc
  constructor(codecs, resolutions, frameRates, bitrateMultipliers,
      keyFrameIntervals) {
    /**
     * @member {Array.<Owt.Base.VideoCodecParameters>} codecs
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionCapabilities
     */
    this.codecs = codecs;
    /**
     * @member {Array.<Owt.Base.Resolution>} resolutions
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionCapabilities
     */
    this.resolutions = resolutions;
    /**
     * @member {Array.<number>} frameRates
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionCapabilities
     */
    this.frameRates = frameRates;
    /**
     * @member {Array.<number>} bitrateMultipliers
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionCapabilities
     */
    this.bitrateMultipliers = bitrateMultipliers;
    /**
     * @member {Array.<number>} keyFrameIntervals
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionCapabilities
     */
    this.keyFrameIntervals = keyFrameIntervals;
  }
}

/**
 * @class SubscriptionCapabilities
 * @memberOf Owt.Conference
 * @classDesc Represents the capability for subscription.
 * @hideconstructor
 */
export class SubscriptionCapabilities {
  // eslint-disable-next-line require-jsdoc
  constructor(audio, video) {
    /**
     * @member {?Owt.Conference.AudioSubscriptionCapabilities} audio
     * @instance
     * @memberof Owt.Conference.SubscriptionCapabilities
     */
    this.audio = audio;
    /**
     * @member {?Owt.Conference.VideoSubscriptionCapabilities} video
     * @instance
     * @memberof Owt.Conference.SubscriptionCapabilities
     */
    this.video = video;
  }
}

/**
 * @class AudioSubscriptionConstraints
 * @memberOf Owt.Conference
 * @classDesc Represents the audio constraints for subscription.
 * @hideconstructor
 */
export class AudioSubscriptionConstraints {
  // eslint-disable-next-line require-jsdoc
  constructor(codecs) {
    /**
     * @member {?Array.<Owt.Base.AudioCodecParameters>} codecs
     * @instance
     * @memberof Owt.Conference.AudioSubscriptionConstraints
     * @desc Codecs accepted. If none of `codecs` supported by both sides, connection fails. Leave it undefined will use all possible codecs.
     */
    this.codecs = codecs;
  }
}

/**
 * @class VideoSubscriptionConstraints
 * @memberOf Owt.Conference
 * @classDesc Represents the video constraints for subscription.
 * @hideconstructor
 */
export class VideoSubscriptionConstraints {
  // eslint-disable-next-line require-jsdoc
  constructor(codecs, resolution, frameRate, bitrateMultiplier,
      keyFrameInterval, rid) {
    /**
     * @member {?Array.<Owt.Base.VideoCodecParameters>} codecs
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Codecs accepted. If none of `codecs` supported by both sides, connection fails. Leave it undefined will use all possible codecs.
     */
    this.codecs = codecs;
    /**
     * @member {?Owt.Base.Resolution} resolution
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Only resolutions listed in Owt.Conference.VideoSubscriptionCapabilities are allowed.
     */
    this.resolution = resolution;
    /**
     * @member {?number} frameRate
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Only frameRates listed in Owt.Conference.VideoSubscriptionCapabilities are allowed.
     */
    this.frameRate = frameRate;
    /**
     * @member {?number} bitrateMultiplier
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Only bitrateMultipliers listed in Owt.Conference.VideoSubscriptionCapabilities are allowed.
     */
    this.bitrateMultiplier = bitrateMultiplier;
    /**
     * @member {?number} keyFrameInterval
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Only keyFrameIntervals listed in Owt.Conference.VideoSubscriptionCapabilities are allowed.
     */
    this.keyFrameInterval = keyFrameInterval;
    /**
     * @member {?number} rid
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionConstraints
     * @desc Restriction identifier to identify the RTP Streams within an RTP session. When rid is specified, other constraints will be ignored.
     */
    this.rid = rid;
  }
}

/**
 * @class SubscribeOptions
 * @memberOf Owt.Conference
 * @classDesc SubscribeOptions defines options for subscribing a Owt.Base.RemoteStream.
 */
export class SubscribeOptions {
  // eslint-disable-next-line require-jsdoc
  constructor(audio, video) {
    /**
     * @member {?Owt.Conference.AudioSubscriptionConstraints} audio
     * @instance
     * @memberof Owt.Conference.SubscribeOptions
     */
    this.audio = audio;
    /**
     * @member {?Owt.Conference.VideoSubscriptionConstraints} video
     * @instance
     * @memberof Owt.Conference.SubscribeOptions
     */
    this.video = video;
  }
}

/**
 * @class VideoSubscriptionUpdateOptions
 * @memberOf Owt.Conference
 * @classDesc VideoSubscriptionUpdateOptions defines options for updating a subscription's video part.
 * @hideconstructor
 */
export class VideoSubscriptionUpdateOptions {
  // eslint-disable-next-line require-jsdoc
  constructor() {
    /**
     * @member {?Owt.Base.Resolution} resolution
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionUpdateOptions
     * @desc Only resolutions listed in VideoSubscriptionCapabilities are allowed.
     */
    this.resolution = undefined;
    /**
     * @member {?number} frameRates
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionUpdateOptions
     * @desc Only frameRates listed in VideoSubscriptionCapabilities are allowed.
     */
    this.frameRate = undefined;
    /**
     * @member {?number} bitrateMultipliers
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionUpdateOptions
     * @desc Only bitrateMultipliers listed in VideoSubscriptionCapabilities are allowed.
     */
    this.bitrateMultipliers = undefined;
    /**
     * @member {?number} keyFrameIntervals
     * @instance
     * @memberof Owt.Conference.VideoSubscriptionUpdateOptions
     * @desc Only keyFrameIntervals listed in VideoSubscriptionCapabilities are allowed.
     */
    this.keyFrameInterval = undefined;
  }
}

/**
 * @class SubscriptionUpdateOptions
 * @memberOf Owt.Conference
 * @classDesc SubscriptionUpdateOptions defines options for updating a subscription.
 * @hideconstructor
 */
export class SubscriptionUpdateOptions {
  // eslint-disable-next-line require-jsdoc
  constructor() {
    /**
     * @member {?VideoSubscriptionUpdateOptions} video
     * @instance
     * @memberof Owt.Conference.SubscriptionUpdateOptions
     */
    this.video = undefined;
  }
}

/**
 * @class Subscription
 * @memberof Owt.Conference
 * @classDesc Subscription is a receiver for receiving a stream.
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | ended           | Event            | Subscription is ended. |
 * | error           | ErrorEvent       | An error occurred on the subscription. |
 * | mute            | MuteEvent        | Publication is muted. Remote side stopped sending audio and/or video data. |
 * | unmute          | MuteEvent        | Publication is unmuted. Remote side continued sending audio and/or video data. |
 *
 * @extends Owt.Base.EventDispatcher
 * @hideconstructor
 */
export class Subscription extends EventDispatcher {
  // eslint-disable-next-line require-jsdoc
  constructor(id, stop, getStats, mute, unmute, applyOptions) {
    super();
    if (!id) {
      throw new TypeError('ID cannot be null or undefined.');
    }
    /**
     * @member {string} id
     * @instance
     * @memberof Owt.Conference.Subscription
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id,
    });
    /**
     * @function stop
     * @instance
     * @desc Stop certain subscription. Once a subscription is stopped, it cannot be recovered.
     * @memberof Owt.Conference.Subscription
     * @returns {undefined}
     */
    this.stop = stop;
    /**
     * @function getStats
     * @instance
     * @desc Get stats of underlying PeerConnection.
     * @memberof Owt.Conference.Subscription
     * @returns {Promise<RTCStatsReport, Error>}
     */
    this.getStats = getStats;
    /**
     * @function mute
     * @instance
     * @desc Stop reeving data from remote endpoint.
     * @memberof Owt.Conference.Subscription
     * @param {Owt.Base.TrackKind } kind Kind of tracks to be muted.
     * @returns {Promise<undefined, Error>}
     */
    this.mute = mute;
    /**
     * @function unmute
     * @instance
     * @desc Continue reeving data from remote endpoint.
     * @memberof Owt.Conference.Subscription
     * @param {Owt.Base.TrackKind } kind Kind of tracks to be unmuted.
     * @returns {Promise<undefined, Error>}
     */
    this.unmute = unmute;
    /**
     * @function applyOptions
     * @instance
     * @desc Update subscription with given options.
     * @memberof Owt.Conference.Subscription
     * @param {Owt.Conference.SubscriptionUpdateOptions } options Subscription update options.
     * @returns {Promise<undefined, Error>}
     */
    this.applyOptions = applyOptions;
  }
}
