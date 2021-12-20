// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global AudioEncoder, VideoEncoder, VideoDecoder, Map, ArrayBuffer,
   Uint8Array, DataView, console, EncodedVideoChunk */

// TODO: Use relative path instead.
import initModule from '/src/samples/conference/public/scripts/owt.js';

// Key is MediaStreamTrack ID, value is AudioEncoder or VideoEncoder.
const encoders = new Map();
// Key is MediaStreamTrack ID, value is WritableStreamDefaultWriter.
const writers = new Map();
// Key is publication ID, value is bool indicates whether key frame is requested
// for its video track.
const keyFrameRequested = new Map();

let wasmModule;
let mediaSession;
// Key is SSRC, value is an RTP receiver.
const rtpReceivers = new Map();
let frameBuffer;
let videoDecoder;
// 4 bytes for frame size before each frame. The 1st byte is reserved, always 0.
const sizePrefix = 4;

/* Messages it accepts:
 * media-sender: [Publication ID, MediaStreamTrack ID, MediaStreamTrack kind,
 * MediaStreamTrackProcessor readable, WebTransportStream writable,
 * AudioEncoderConfig/VideoEncoderConfig]
 */
// eslint-disable-next-line no-undef
onmessage = async (e) => {
  const [command, args] = e.data;
  switch (command) {
    case 'media-sender':
      initMediaSender(...args);
      break;
    case 'rtcp-feedback':
      await handleFeedback(...args);
      break;
    case 'init-rtp':
      await initRtpModule();
      break;
    case 'rtp-packet':
      await handleRtpPacket(args);
      break;
    case 'add-subscription':
      addNewSubscription(...args);
      break;
    default:
      console.warn('Unrecognized command ' + command);
  }
};

async function initMediaSender(
    publicationId, trackId, trackKind, trackReadable, sendStreamWritable,
    config) {
  let encoder;
  const writer = sendStreamWritable.getWriter();
  if (trackKind === 'audio') {
    encoder = initAudioEncoder(config, writer);
  } else { // Video.
    encoder = initVideoEncoder(config, writer);
    keyFrameRequested[publicationId] = false;
  }
  encoders.set(trackId, encoder);
  writers.set(trackId, writer);
  readMediaData(trackReadable, encoder, publicationId);
  writeTrackId(trackKind, writer);
}

async function initRtpModule() {
  wasmModule = await fetchWasm();
  mediaSession = new wasmModule.MediaSession();
}

async function fetchWasm() {
  const owtWasmModule = {};
  initModule(owtWasmModule);
  await owtWasmModule.ready;
  return owtWasmModule;
}

async function handleFeedback(feedback, publicationId) {
  if (feedback === 'key-frame-request') {
    console.log('Setting key frame request flag.');
    keyFrameRequested[publicationId] = true;
  }
}

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
  console.error('Video encode error: ' + error.message);
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
  console.error(`Audio encode error: ${error.message}`);
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

function initVideoDecoder(subscriptionId) {
  videoDecoder = new VideoDecoder({
    output: videoFrameOutputCallback.bind(null, subscriptionId),
    error: webCodecsErrorCallback,
  });
  videoDecoder.configure({codec: 'avc1.42400a', optimizeForLatency: true});
}

function videoFrameOutputCallback(subscriptionId, frame) {
  // eslint-disable-next-line no-undef
  postMessage(['video-frame', [subscriptionId, frame]], [frame]);
  frame.close();
}

function webCodecsErrorCallback(error) {
  console.warn('error: ' + error.message);
}

// Read data from media track.
async function readMediaData(trackReadable, encoder, publicationId) {
  const reader = trackReadable.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      console.debug('MediaStream ends.');
      break;
    }
    if (keyFrameRequested.get(publicationId)) {
      console.debug(typeof encoder + ' encode a key frame.');
      encoder.encode(value, {keyFrame: true});
      keyFrameRequested[publicationId] = false;
    } else {
      encoder.encode(value);
    }
    value.close();
  }
}

function getSsrc(packet) {
  // SSRC starts from the 65th bit, in network order.
  return new DataView(packet.buffer).getUint32(8, false);
}

async function handleRtpPacket(packet) {
  const ssrc = getSsrc(packet);
  const buffer = wasmModule._malloc(packet.byteLength);
  wasmModule.writeArrayToMemory(packet, buffer);
  rtpReceivers.get(ssrc).onRtpPacket(buffer, packet.byteLength);
}

function addNewSubscription(subscriptionId, subscribeOptions, rtpConfig) {
  // TODO: Audio is not supported yet, ignore the audio part.
  initVideoDecoder(subscriptionId);
  const videoSsrc = rtpConfig.video.ssrc;
  if (rtpReceivers.has(videoSsrc)) {
    console.error(`RTP receiver for SSRC ${videoSsrc} exits.`);
  }
  const rtpReceiver = mediaSession.createRtpVideoReceiver(videoSsrc);
  rtpReceivers.set(videoSsrc, rtpReceiver);
  rtpReceiver.setCompleteFrameCallback((frame) => {
    videoDecoder.decode(new EncodedVideoChunk(
        {timestamp: Date.now(), data: frame, type: 'key'}));
  });
}
