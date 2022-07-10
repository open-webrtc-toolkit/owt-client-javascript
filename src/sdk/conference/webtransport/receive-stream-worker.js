// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global AudioDecoder, postMessage */

// TODO: Enable ESLint for this file.
/* eslint-disable */

'use strict';

import Logger from '../../base/logger.js';

let audioDecoder;

onmessage = (e) => {
  // ['init', SubscribeOptions, WebTransportStream, TrackKind].
  if (e.data[0] === 'init') {
    _initWebCodecs(e.data[1], e.data[3]);
    _handleReceiveStream(e.data[2]);
  }
};

const audioDecoderConfig = {
  codec: 'opus',
  sampleRate: 48000,
  numberOfChannels: 2,
};

function audioDecoderOutput(audioFrame) {
  const audioBuffer = {
    numberOfChannels: audioFrame.buffer.numberOfChannels,
    sampleRate: audioFrame.buffer.sampleRate,
    length: audioFrame.buffer.length,
    duration: audioFrame.buffer.duration,
    channelData: [],
  };
  for (let i = 0; i < audioFrame.buffer.numberOfChannels; i++) {
    audioBuffer.channelData.push(audioFrame.buffer.getChannelData(i));
  }
  postMessage(['audio-frame', audioBuffer]);
}

function audioDecoderError(error) {
  Logger.warn('Audio decoder failed to decode. Error: ' + error);
}

async function _initWebCodecs(options, trackKind) {
  if (trackKind !== 'audio') {
    Logger.error(
        'Receiving ' + trackKind + ' over WebTransport is not supported.');
    return;
  }
  if (options.audio) {
    Logger.error('No options for audio.');
    return;
  }
  audioDecoder =
      new AudioDecoder({output: audioDecoderOutput, error: audioDecoderError});
  audioDecoder.configure(audioDecoderConfig);
}

async function _handleReceiveStream(stream) {
  const reader = stream.readable.getReader();
  let readingDone = false;
  while (!readingDone) {
    const {value, done: finished} = await reader.read();
    if (finished) {
      readingDone = true;
    }
    // TODO: Read audio frame header.
    // Implement it when BYOB reader is implemented in Chrome to reduce buffer
    // copy.
  }
}