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

export class AudioCodecParameters {
  constructor(name, channelCount, clockRate) {
    this.name = name;
    this.channelCount = channelCount;
    this.clockRate = clockRate;
  }
}

export class AudioEncodingParameters {
  constructor(codec, maxBitrate) {
    this.codec = codec;
    this.maxBitrate = maxBitrate;
  }
}

export const VideoCodec = {
  VP8: 'vp8',
  VP9: 'vp9',
  H264: 'h264',
  H265: 'h265'
};

export class VideoCodecParameters {
  constructor(name, profile) {
    this.name = name;
    this.profile = profile;
  }
}

export class VideoEncodingParameters {
  constructor(codec, maxBitrate) {
    this.codec = codec;
    this.maxBitrate = maxBitrate;
  }
}
