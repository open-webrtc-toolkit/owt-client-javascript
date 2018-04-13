'use strict';

export const AudioCodec = {
  PCMU: 'pcmu',
  PCMA: 'pcma',
  OPUS: 'opus',
  G722: 'g722',
  ISAC: 'iSAC',
  ILBC: 'iLBC',
  AAC: 'aac',
  AC3: 'ac3',
  NELLYMOSER: 'nellymoser'
};
/**
 * @class AudioCodecParameters
 * @memberOf Ics.Base
 * @classDesc Codec parameters for an audio track.
 * @hideconstructor
 */
export class AudioCodecParameters {
  constructor(name, channelCount, clockRate) {
    /**
     * @member {string} name
     * @memberof Ics.Base.AudioCodecParameters
     * @instance
     * @desc Name of a codec. Please a value in Ics.Base.AudioCodec. However, some functions do not support all the values in Ics.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?number} channelCount
     * @memberof Ics.Base.AudioCodecParameters
     * @instance
     * @desc Numbers of channels for an audio track.
     */
    this.channelCount = channelCount;
    /**
     * @member {?number} clockRate
     * @memberof Ics.Base.AudioCodecParameters
     * @instance
     * @desc The codec clock rate expressed in Hertz.
     */
    this.clockRate = clockRate;
  }
}

/**
 * @class AudioEncodingParameters
 * @memberOf Ics.Base
 * @classDesc Encoding parameters for sending an audio track.
 * @hideconstructor
 */
export class AudioEncodingParameters {
  constructor(codec, maxBitrate) {
    /**
     * @member {?Ics.Base.AudioCodecParameters} codec
     * @instance
     * @memberof Ics.Base.AudioEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Ics.Base.AudioEncodingParameters
     * @desc Max bitrate expressed in kbps.
     */
    this.maxBitrate = maxBitrate;
  }
}

export const VideoCodec = {
  VP8: 'vp8',
  VP9: 'vp9',
  H264: 'h264',
  H265: 'h265'
};

/**
 * @class VideoCodecParameters
 * @memberOf Ics.Base
 * @classDesc Codec parameters for a video track.
 * @hideconstructor
 */
export class VideoCodecParameters {
  constructor(name, profile) {
    /**
     * @member {string} name
     * @memberof Ics.Base.VideoCodecParameters
     * @instance
     * @desc Name of a codec. Please a value in Ics.Base.AudioCodec. However, some functions do not support all the values in Ics.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?string} profile
     * @memberof Ics.Base.VideoCodecParameters
     * @instance
     * @desc The profile of a codec. Profile may not apply to all codecs.
     */
    this.profile = profile;
  }
}

/**
 * @class VideoEncodingParameters
 * @memberOf Ics.Base
 * @classDesc Encoding parameters for sending a video track.
 * @hideconstructor
 */
export class VideoEncodingParameters {
  constructor(codec, maxBitrate) {
    /**
     * @member {?Ics.Base.VideoCodecParameters} codec
     * @instance
     * @memberof Ics.Base.VideoEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Ics.Base.VideoEncodingParameters
     * @desc Max bitrate expressed in bps.
     */
    this.maxBitrate = maxBitrate;
  }
}
