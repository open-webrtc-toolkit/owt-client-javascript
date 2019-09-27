// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * @class AudioCodec
 * @memberOf Owt.Base
 * @classDesc Audio codec enumeration.
 * @hideconstructor
 */
export const AudioCodec = {
  PCMU: 'pcmu',
  PCMA: 'pcma',
  OPUS: 'opus',
  G722: 'g722',
  ISAC: 'iSAC',
  ILBC: 'iLBC',
  AAC: 'aac',
  AC3: 'ac3',
  NELLYMOSER: 'nellymoser',
};
/**
 * @class AudioCodecParameters
 * @memberOf Owt.Base
 * @classDesc Codec parameters for an audio track.
 * @hideconstructor
 */
export class AudioCodecParameters {
  // eslint-disable-next-line require-jsdoc
  constructor(name, channelCount, clockRate) {
    /**
     * @member {string} name
     * @memberof Owt.Base.AudioCodecParameters
     * @instance
     * @desc Name of a codec. Please use a value in Owt.Base.AudioCodec. However, some functions do not support all the values in Owt.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?number} channelCount
     * @memberof Owt.Base.AudioCodecParameters
     * @instance
     * @desc Numbers of channels for an audio track.
     */
    this.channelCount = channelCount;
    /**
     * @member {?number} clockRate
     * @memberof Owt.Base.AudioCodecParameters
     * @instance
     * @desc The codec clock rate expressed in Hertz.
     */
    this.clockRate = clockRate;
  }
}

/**
 * @class AudioEncodingParameters
 * @memberOf Owt.Base
 * @classDesc Encoding parameters for sending an audio track.
 * @hideconstructor
 */
export class AudioEncodingParameters {
  // eslint-disable-next-line require-jsdoc
  constructor(codec, maxBitrate) {
    /**
     * @member {?Owt.Base.AudioCodecParameters} codec
     * @instance
     * @memberof Owt.Base.AudioEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Owt.Base.AudioEncodingParameters
     * @desc Max bitrate expressed in kbps.
     */
    this.maxBitrate = maxBitrate;
  }
}

/**
 * @class VideoCodec
 * @memberOf Owt.Base
 * @classDesc Video codec enumeration.
 * @hideconstructor
 */
export const VideoCodec = {
  VP8: 'vp8',
  VP9: 'vp9',
  H264: 'h264',
  H265: 'h265',
};

/**
 * @class VideoCodecParameters
 * @memberOf Owt.Base
 * @classDesc Codec parameters for a video track.
 * @hideconstructor
 */
export class VideoCodecParameters {
  // eslint-disable-next-line require-jsdoc
  constructor(name, profile) {
    /**
     * @member {string} name
     * @memberof Owt.Base.VideoCodecParameters
     * @instance
     * @desc Name of a codec. Please use a value in Owt.Base.VideoCodec. However, some functions do not support all the values in Owt.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?string} profile
     * @memberof Owt.Base.VideoCodecParameters
     * @instance
     * @desc The profile of a codec. Profile may not apply to all codecs.
     */
    this.profile = profile;
  }
}

/**
 * @class VideoEncodingParameters
 * @memberOf Owt.Base
 * @classDesc Encoding parameters for sending a video track.
 * @hideconstructor
 */
export class VideoEncodingParameters {
  // eslint-disable-next-line require-jsdoc
  constructor(codec, maxBitrate) {
    /**
     * @member {?Owt.Base.VideoCodecParameters} codec
     * @instance
     * @memberof Owt.Base.VideoEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Owt.Base.VideoEncodingParameters
     * @desc Max bitrate expressed in kbps.
     */
    this.maxBitrate = maxBitrate;
  }
}
