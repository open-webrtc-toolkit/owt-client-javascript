// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// This file doesn't have public APIs.
/* eslint-disable valid-jsdoc */

'use strict';

import * as PublicationModule from '../base/publication.js';
import * as MediaFormatModule from '../base/mediaformat.js';
import * as CodecModule from '../base/codec.js';
import * as SubscriptionModule from './subscription.js';


/**
 * @function extractBitrateMultiplier
 * @desc Extract bitrate multiplier from a string like "x0.2".
 * @return {Promise<Object, Error>} The float number after "x".
 * @private
 */
function extractBitrateMultiplier(input) {
  if (typeof input !== 'string' || !input.startsWith('x')) {
    L.Logger.warning('Invalid bitrate multiplier input.');
    return 0;
  }
  return Number.parseFloat(input.replace(/^x/, ''));
}

// eslint-disable-next-line require-jsdoc
function sortNumbers(x, y) {
  return x - y;
}

// eslint-disable-next-line require-jsdoc
function sortResolutions(x, y) {
  if (x.width !== y.width) {
    return x.width - y.width;
  } else {
    return x.height - y.height;
  }
}

/**
 * @function convertToPublicationSettings
 * @desc Convert mediaInfo received from server to PublicationSettings.
 * @private
 */
export function convertToPublicationSettings(mediaInfo) {
  let audio = [],
    video = [];
  let audioCodec, videoCodec, resolution, framerate, bitrate, keyFrameInterval,
    rid;
  if (mediaInfo.audio) {
    if (mediaInfo.audio.format) {
      audioCodec = new CodecModule.AudioCodecParameters(
        mediaInfo.audio.format.codec, mediaInfo.audio.format.channelNum,
        mediaInfo.audio.format.sampleRate);
    }
    audio.push(new PublicationModule.AudioPublicationSettings(audioCodec));
  }
  if (mediaInfo.video) {
    for (const videoInfo of mediaInfo.video.original) {
      if (videoInfo.format) {
        videoCodec = new CodecModule.VideoCodecParameters(
          videoInfo.format.codec, videoInfo.format.profile);
      }
      if (videoInfo.parameters) {
        if (videoInfo.parameters.resolution) {
          resolution = new MediaFormatModule.Resolution(
            videoInfo.parameters.resolution.width,
            videoInfo.parameters.resolution.height);
        }
        framerate = videoInfo.parameters.framerate;
        bitrate = videoInfo.parameters.bitrate * 1000;
        keyFrameInterval = videoInfo.parameters.keyFrameInterval;
      }
      if (videoInfo.simulcastRid) {
        rid = videoInfo.simulcastRid;
      }
      video.push(new PublicationModule.VideoPublicationSettings(
        videoCodec, resolution, framerate, bitrate, keyFrameInterval, rid));
    }
  }
  return new PublicationModule.PublicationSettings(audio, video);
}

/**
 * @function convertToSubscriptionCapabilities
 * @desc Convert mediaInfo received from server to SubscriptionCapabilities.
 * @private
 */
export function convertToSubscriptionCapabilities(mediaInfo) {
  let audio; let video;
  if (mediaInfo.audio) {
    const audioCodecs = [];
    if (mediaInfo.audio && mediaInfo.audio.optional &&
      mediaInfo.audio.optional.format) {
      for (const audioCodecInfo of mediaInfo.audio.optional.format) {
        const audioCodec = new CodecModule.AudioCodecParameters(
            audioCodecInfo.codec, audioCodecInfo.channelNum,
            audioCodecInfo.sampleRate);
        audioCodecs.push(audioCodec);
      }
    }
    audioCodecs.sort();
    audio = new SubscriptionModule.AudioSubscriptionCapabilities(audioCodecs);
  }
  if (mediaInfo.video) {
    const videoCodecs = [];
    if (mediaInfo.video && mediaInfo.video.optional &&
      mediaInfo.video.optional.format) {
      for (const videoCodecInfo of mediaInfo.video.optional.format) {
        const videoCodec = new CodecModule.VideoCodecParameters(
            videoCodecInfo.codec, videoCodecInfo.profile);
        videoCodecs.push(videoCodec);
      }
    }
    videoCodecs.sort();
    const resolutions = Array.from(
        mediaInfo.video.optional.parameters.resolution,
        (r) => new MediaFormatModule.Resolution(r.width, r.height));
    resolutions.sort(sortResolutions);
    const bitrates = Array.from(
        mediaInfo.video.optional.parameters.bitrate,
        (bitrate) => extractBitrateMultiplier(bitrate));
    bitrates.push(1.0);
    bitrates.sort(sortNumbers);
    const frameRates = JSON.parse(
        JSON.stringify(mediaInfo.video.optional.parameters.framerate));
    frameRates.sort(sortNumbers);
    const keyFrameIntervals = JSON.parse(
        JSON.stringify(mediaInfo.video.optional.parameters.keyFrameInterval));
    keyFrameIntervals.sort(sortNumbers);
    video = new SubscriptionModule.VideoSubscriptionCapabilities(
        videoCodecs, resolutions, frameRates, bitrates, keyFrameIntervals);
  }
  return new SubscriptionModule.SubscriptionCapabilities(audio, video);
}
