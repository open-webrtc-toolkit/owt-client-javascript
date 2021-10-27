// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global AudioEncoder, VideoEncoder, VideoDecoder, Map, ArrayBuffer,
   Uint8Array, DataView */

import Logger from '../../base/logger.js';

// Key is MediaStreamTrack ID, value is AudioEncoder or VideoEncoder.
const encoders = new Map();
// Key is MediaStreamTrack ID, value is WritableStreamDefaultWriter.
const writers = new Map();

let frameBuffer;
let videoDecoder;
// 4 bytes for frame size before each frame. The 1st byte is reserved, always 0.
const sizePrefix = 4;

/* Messages it accepts:
 * media-sender: [MediaStreamTrack, WebTransportStream,
 * AudioEncoderConfig/VideoEncoderConfig]
 */
// eslint-disable-next-line no-undef
onmessage = (e) => {
  if (e.data[0] === 'media-sender') {
    const [trackId, trackKind, trackReadable, sendStreamWritable, config] =
        e.data[1];
    let encoder;
    const writer = sendStreamWritable.getWriter();
    if (trackKind === 'audio') {
      encoder = initAudioEncoder(config, writer);
    } else { // Video.
      encoder = initVideoEncoder(config, writer);
    }
    encoders.set(trackId, encoder);
    writers.set(trackId, writer);
    readMediaData(trackReadable, encoder);
    writeTrackId(trackKind, writer);
  }
};

async function videoOutput(writer, chunk, metadata) {
  // TODO: Combine audio and video output callback.
  if (!frameBuffer || frameBuffer.byteLength < chunk.byteLength + sizePrefix) {
    frameBuffer = new ArrayBuffer(chunk.byteLength + sizePrefix);
  }
  const bufferView = new Uint8Array(frameBuffer, sizePrefix);
  chunk.copyTo(bufferView);
  const dataView = new DataView(frameBuffer, 0, chunk.byteLength + sizePrefix);
  dataView.setUint32(0, chunk.byteLength);
  await writer.ready;
  await writer.write(dataView);
}

function videoError(error) {
  Logger.error('Video encode error: ' + error.message);
}

async function audioOutput(writer, chunk, metadata) {
  if (!frameBuffer || frameBuffer.byteLength < chunk.byteLength + sizePrefix) {
    frameBuffer = new ArrayBuffer(chunk.byteLength + sizePrefix);
  }
  const bufferView = new Uint8Array(frameBuffer, sizePrefix);
  chunk.copyTo(bufferView);
  const dataView = new DataView(frameBuffer, 0, chunk.byteLength + sizePrefix);
  dataView.setUint32(0, chunk.byteLength);
  await writer.ready;
  await writer.write(dataView);
}

function audioError(error) {
  Logger.error(`Audio encode error: ${error.message}`);
}

async function writeTrackId(kind, writer) {
  const id = new Uint8Array(16);
  id[15] = (kind === 'audio' ? 1 : 2);
  await writer.ready;
  writer.write(id);
}

function initAudioEncoder(config, writer) {
  const audioEncoder = new AudioEncoder(
      {output: audioOutput.bind(null, writer), error: audioError});
  // TODO: Respect config.
  audioEncoder.configure(
      {codec: 'opus', numberOfChannels: 1, sampleRate: 48000});
  return audioEncoder;
}

function initVideoEncoder(config, writer) {
  const videoEncoder = new VideoEncoder(
      {output: videoOutput.bind(null, writer), error: videoError});
  // TODO: Respect config.
  videoEncoder.configure({
    codec: 'avc1.4d002a',
    width: 640,
    height: 480,
    framerate: 30,
    latencyMode: 'realtime',
    avc: {format: 'annexb'},
  });
  return videoEncoder;
}

function initVideoDecoder() {
  videoDecoder = new VideoDecoder({
    output: videoFrameOutputCallback,
    error: webCodecsErrorCallback,
  });
  videoDecoder.configure({codec: 'avc1.42400a', optimizeForLatency: true});
}

function videoFrameOutputCallback(frame) {
  // eslint-disable-next-line no-undef
  postMessage(['video-frame', frame], [frame]);
}

function webCodecsErrorCallback(error) {
  Logger.warn('error: ' + error.message);
}

// Read data from media track.
async function readMediaData(trackReadable, encoder) {
  const reader = trackReadable.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      Logger.debug('MediaStream ends.');
      break;
    }
    encoder.encode(value);
    value.close();
  }
}

initVideoDecoder();
