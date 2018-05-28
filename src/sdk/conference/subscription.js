// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

import * as MediaFormatModule from '../base/mediaformat.js'
import * as CodecModule from '../base/codec.js'
import { EventDispatcher} from '../base/event.js'

/**
 * @class AudioSubscriptionCapabilities
 * @memberOf Ics.Conference
 * @classDesc Represents the audio capability for subscription.
 * @hideconstructor
 */
export class AudioSubscriptionCapabilities {
  constructor(codecs) {
    /**
     * @member {Array.<Ics.Base.AudioCodecParameters>} codecs
     * @instance
     * @memberof Ics.Conference.AudioSubscriptionCapabilities
     */
    this.codecs = codecs;
  }
}

/**
 * @class VideoSubscriptionCapabilities
 * @memberOf Ics.Conference
 * @classDesc Represents the video capability for subscription.
 * @hideconstructor
 */
export class VideoSubscriptionCapabilities {
  constructor(codecs, resolutions, frameRates, bitrateMultipliers,
    keyFrameIntervals) {
    /**
     * @member {Array.<Ics.Base.VideoCodecParameters>} codecs
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionCapabilities
     */
    this.codecs = codecs;
    /**
     * @member {Array.<Ics.Base.Resolution>} resolution
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionCapabilities
     */
    this.resolutions = resolutions;
    /**
     * @member {Array.<number>} frameRates
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionCapabilities
     */
    this.frameRates = frameRates;
    /**
     * @member {Array.<number>} bitrateMultipliers
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionCapabilities
     */
    this.bitrateMultipliers = bitrateMultipliers;
    /**
     * @member {Array.<number>} keyFrameIntervals
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionCapabilities
     */
    this.keyFrameIntervals = keyFrameIntervals;
  }
}

/**
 * @class SubscriptionCapabilities
 * @memberOf Ics.Conference
 * @classDesc Represents the capability for subscription.
 * @hideconstructor
 */
export class SubscriptionCapabilities {
  constructor(audio, video) {
    /**
     * @member {?AudioSubscriptionCapabilities} audio
     * @instance
     * @memberof Ics.Conference.SubscriptionCapabilities
     */
    this.audio = audio;
    /**
     * @member {?VideoSubscriptionCapabilities} video
     * @instance
     * @memberof Ics.Conference.SubscriptionCapabilities
     */
    this.video = video;
  }
}

/**
 * @class AudioSubscriptionConstraints
 * @memberOf Ics.Conference
 * @classDesc Represents the audio constraints for subscription.
 * @hideconstructor
 */
export class AudioSubscriptionConstraints {
  constructor(codecs) {
    /**
     * @member {?Array.<Ics.Base.AudioCodecParameters>} codecs
     * @instance
     * @memberof Ics.Conference.AudioSubscriptionConstraints
     * @desc Codecs accepted. If none of `codecs` supported by both sides, connection fails. Leave it undefined will use all possible codecs.
     */
    this.codecs = codecs;
  }
}

/**
 * @class VideoSubscriptionConstraints
 * @memberOf Ics.Conference
 * @classDesc Represents the video constraints for subscription.
 * @hideconstructor
 */
export class VideoSubscriptionConstraints {
  constructor(codecs, resolution, frameRate, bitrateMultiplier,
    keyFrameInterval) {
    /**
     * @member {?Array.<Ics.Base.VideoCodecParameters>} codecs
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionConstraints
     * @desc Codecs accepted. If none of `codecs` supported by both sides, connection fails. Leave it undefined will use all possible codecs.
     */
    this.codecs = codecs;
    /**
     * @member {?Ics.Base.Resolution} resolution
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionConstraints
     * @desc Only resolutions listed in VideoSubscriptionCapabilities are allowed.
     */
    this.resolution = resolution;
    /**
     * @member {?number} frameRate
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionConstraints
     * @desc Only frameRates listed in VideoSubscriptionCapabilities are allowed.
     */
    this.frameRate = frameRate;
    /**
     * @member {?number} bitrateMultiplier
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionConstraints
     * @desc Only bitrateMultipliers listed in VideoSubscriptionCapabilities are allowed.
     */
    this.bitrateMultiplier = bitrateMultiplier;
    /**
     * @member {?number} keyFrameInterval
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionConstraints
     * @desc Only keyFrameIntervals listed in VideoSubscriptionCapabilities are allowed.
     */
    this.keyFrameInterval = keyFrameInterval;
  }
}

/**
 * @class SubscribeOptions
 * @memberOf Ics.Conference
 * @classDesc SubscribeOptions defines options for subscribing a Ics.Base.RemoteStream.
 */
export class SubscribeOptions {
  constructor(audio, video) {
    /**
     * @member {?AudioSubscriptionConstraints} audio
     * @instance
     * @memberof Ics.Conference.SubscribeOptions
     */
    this.audio = audio;
    /**
     * @member {?VideoSubscriptionConstraints} video
     * @instance
     * @memberof Ics.Conference.SubscribeOptions
     */
    this.video = video;
  }
}

/**
 * @class VideoSubscriptionUpdateOptions
 * @memberOf Ics.Conference
 * @classDesc VideoSubscriptionUpdateOptions defines options for updating a subscription's video part.
 * @hideconstructor
 */
export class VideoSubscriptionUpdateOptions {
  constructor() {
    /**
     * @member {?Ics.Base.Resolution} resolution
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionUpdateOptions
     * @desc Only resolutions listed in VideoSubscriptionCapabilities are allowed.
     */
    this.resolution = undefined;
    /**
     * @member {?number} frameRates
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionUpdateOptions
     * @desc Only frameRates listed in VideoSubscriptionCapabilities are allowed.
     */
    this.frameRate = undefined;
    /**
     * @member {?number} bitrateMultipliers
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionUpdateOptions
     * @desc Only bitrateMultipliers listed in VideoSubscriptionCapabilities are allowed.
     */
    this.bitrateMultipliers = undefined;
    /**
     * @member {?number} keyFrameIntervals
     * @instance
     * @memberof Ics.Conference.VideoSubscriptionUpdateOptions
     * @desc Only keyFrameIntervals listed in VideoSubscriptionCapabilities are allowed.
     */
    this.keyFrameInterval = undefined;
  }
}

/**
 * @class SubscriptionUpdateOptions
 * @memberOf Ics.Conference
 * @classDesc SubscriptionUpdateOptions defines options for updating a subscription.
 * @hideconstructor
 */
export class SubscriptionUpdateOptions {
  constructor() {
    /**
     * @member {?VideoSubscriptionUpdateOptions} video
     * @instance
     * @memberof Ics.Conference.SubscriptionUpdateOptions
     */
    this.video = undefined;
  }
}

/**
 * @class Subscription
 * @memberof Ics.Conference
 * @classDesc Subscription is a receiver for receiving a stream.
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | ended           | Event            | Subscription is ended. |
 * | mute            | MuteEvent        | Publication is muted. Remote side stopped sending audio and/or video data. |
 * | unmute          | MuteEvent        | Publication is unmuted. Remote side continued sending audio and/or video data. |
 *
 * @extends Ics.Base.EventDispatcher
 * @hideconstructor
 */
export class Subscription extends EventDispatcher {
  constructor(id, stop, getStats, mute, unmute, applyOptions) {
    super();
    if (!id) {
      throw new TypeError('ID cannot be null or undefined.');
    }
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Conference.Subscription
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id
    });
    /**
     * @function stop
     * @instance
     * @desc Stop certain subscription. Once a subscription is stopped, it cannot be recovered.
     * @memberof Ics.Conference.Subscription
     * @returns {undefined}
     */
    this.stop = stop;
    /**
     * @function getStats
     * @instance
     * @desc Get stats of underlying PeerConnection.
     * @memberof Ics.Conference.Subscription
     * @returns {Promise<RTCStatsReport, Error>}
     */
    this.getStats = getStats;
    /**
     * @function mute
     * @instance
     * @desc Stop reeving data from remote endpoint.
     * @memberof Ics.Conference.Subscription
     * @param {Ics.Base.TrackKind } kind Kind of tracks to be muted.
     * @returns {Promise<undefined, Error>}
     */
    this.mute = mute;
    /**
     * @function unmute
     * @instance
     * @desc Continue reeving data from remote endpoint.
     * @memberof Ics.Conference.Subscription
     * @param {Ics.Base.TrackKind } kind Kind of tracks to be unmuted.
     * @returns {Promise<undefined, Error>}
     */
    this.unmute = unmute;
    /**
     * @function applyOptions
     * @instance
     * @desc Update subscription with given options.
     * @memberof Ics.Conference.Subscription
     * @param {Ics.Conference.SubscriptionUpdateOptions } options Subscription update options.
     * @returns {Promise<undefined, Error>}
     */
    this.applyOptions = applyOptions;
  }
}
