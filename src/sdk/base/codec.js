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
 * @memberOf Oms.Base
 * @classDesc Codec parameters for an audio track.
 * @hideconstructor
 */
export class AudioCodecParameters {
  constructor(name, channelCount, clockRate) {
    /**
     * @member {string} name
     * @memberof Oms.Base.AudioCodecParameters
     * @instance
     * @desc Name of a codec. Please a value in Oms.Base.AudioCodec. However, some functions do not support all the values in Oms.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?number} channelCount
     * @memberof Oms.Base.AudioCodecParameters
     * @instance
     * @desc Numbers of channels for an audio track.
     */
    this.channelCount = channelCount;
    /**
     * @member {?number} clockRate
     * @memberof Oms.Base.AudioCodecParameters
     * @instance
     * @desc The codec clock rate expressed in Hertz.
     */
    this.clockRate = clockRate;
  }
}

/**
 * @class AudioEncodingParameters
 * @memberOf Oms.Base
 * @classDesc Encoding parameters for sending an audio track.
 * @hideconstructor
 */
export class AudioEncodingParameters {
  constructor(codec, maxBitrate) {
    /**
     * @member {?Oms.Base.AudioCodecParameters} codec
     * @instance
     * @memberof Oms.Base.AudioEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Oms.Base.AudioEncodingParameters
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
 * @memberOf Oms.Base
 * @classDesc Codec parameters for a video track.
 * @hideconstructor
 */
export class VideoCodecParameters {
  constructor(name, profile) {
    /**
     * @member {string} name
     * @memberof Oms.Base.VideoCodecParameters
     * @instance
     * @desc Name of a codec. Please a value in Oms.Base.AudioCodec. However, some functions do not support all the values in Oms.Base.AudioCodec.
     */
    this.name = name;
    /**
     * @member {?string} profile
     * @memberof Oms.Base.VideoCodecParameters
     * @instance
     * @desc The profile of a codec. Profile may not apply to all codecs.
     */
    this.profile = profile;
  }
}

/**
 * @class VideoEncodingParameters
 * @memberOf Oms.Base
 * @classDesc Encoding parameters for sending a video track.
 * @hideconstructor
 */
export class VideoEncodingParameters {
  constructor(codec, maxBitrate) {
    /**
     * @member {?Oms.Base.VideoCodecParameters} codec
     * @instance
     * @memberof Oms.Base.VideoEncodingParameters
     */
    this.codec = codec;
    /**
     * @member {?number} maxBitrate
     * @instance
     * @memberof Oms.Base.VideoEncodingParameters
     * @desc Max bitrate expressed in kbps.
     */
    this.maxBitrate = maxBitrate;
  }
}
