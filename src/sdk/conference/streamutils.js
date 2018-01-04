// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import * as PublicationModule from '../base/publication.js'
import * as MediaFormatModule from '../base/mediaformat.js'
import * as CodecModule from '../base/codec.js'
import * as SubscriptionModule from './subscription.js'

function extractBitrateMultiplier(input) {
  if (typeof input !== 'string' || !input.startsWith('x')) {
    L.Logger.warning('Invalid bitrate multiplier input.');
    return 0;
  }
  return Number.parseFloat(input.replace(/^x/, ''));
}

function sortNumbers(x, y) {
  return x - y;
}

function sortResolutions(x, y) {
  if (x.width !== y.width) {
    return x.width - y.width;
  } else {
    return x.height - y.height;
  }
}

export function convertToPublicationSettings(mediaInfo) {
  const audioCodec = new CodecModule.AudioCodecParameters(mediaInfo.audio.format
    .codec, mediaInfo.audio.format.channelNum, mediaInfo.audio.format.sampleRate
  );
  const audio = new PublicationModule.AudioPublicationSettings(audioCodec);
  const videoCodec = new CodecModule.VideoCodecParameters(mediaInfo.video
    .format.codec, mediaInfo.video.format.profile);
  const resolution = new MediaFormatModule.Resolution(mediaInfo.video.parameters
    .resolution.width, mediaInfo.video.parameters.resolution.height);
  const video = new PublicationModule.VideoPublicationSettings(videoCodec,
    resolution, mediaInfo.video.parameters.framerate, mediaInfo.video
    .parameters.bitrate * 1000, mediaInfo.video.parameters.keyFrameInterval
  );
  return new PublicationModule.PublicationSettings(audio, video);
}

export function convertToSubscriptionCapabilities(mediaInfo) {
  const audioCodecs = [new CodecModule.AudioCodecParameters(mediaInfo.audio.format
    .codec, mediaInfo.audio.format.channelNum, mediaInfo.audio.format.sampleRate
  )];
  for (const audioCodecInfo of mediaInfo.audio.optional.format) {
    const audioCodec = new CodecModule.AudioCodecParameters(audioCodecInfo.codec,
      audioCodecInfo.channelNum, audioCodecInfo.sampleRate);
    audioCodecs.push(audioCodec);
  }
  audioCodecs.sort();
  const audio = new SubscriptionModule.AudioSubscriptionCapacities(audioCodecs);
  const videoCodecs = [new CodecModule.VideoCodecParameters(mediaInfo.video
    .format.codec, mediaInfo.video.format.profile)];
  for (const videoCodecInfo of mediaInfo.video.optional.format) {
    const videoCodec = new CodecModule.VideoCodecParameters(videoCodecInfo.codec,
      videoCodecInfo.profile);
    videoCodecs.push(videoCodec);
  }
  videoCodecs.sort();
  const resolutions = Array.from(mediaInfo.video.optional.parameters.resolution,
    r => new MediaFormatModule.Resolution(r.width, r.height));
  resolutions.push(new MediaFormatModule.Resolution(mediaInfo.video.parameters
    .resolution.width, mediaInfo.video.parameters.resolution.height));
  resolutions.sort(sortResolutions);
  const bitrates = Array.from(mediaInfo.video.optional.parameters.bitrate,
    bitrate => extractBitrateMultiplier(bitrate));
  bitrates.push(1.0);
  bitrates.sort(sortNumbers);
  const frameRates = JSON.parse(JSON.stringify(mediaInfo.video.optional.parameters
    .framerate));
  frameRates.push(mediaInfo.video.parameters.framerate);
  frameRates.sort(sortNumbers);
  const keyFrameIntervals = JSON.parse(JSON.stringify(mediaInfo.video.optional.parameters
    .keyFrameInterval));
  keyFrameIntervals.push(mediaInfo.video.parameters.keyFrameInterval);
  keyFrameIntervals.sort(sortNumbers);
  const video = new SubscriptionModule.VideoSubscriptionCapabilities(
    videoCodecs, resolutions, frameRates, bitrates, keyFrameIntervals);
  return new SubscriptionModule.SubscriptionCapabilities(audio, video);
}
