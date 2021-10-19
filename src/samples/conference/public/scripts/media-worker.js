// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global AudioEncoder, EncodedAudioChunk, VideoEncoder, VideoDecoder,
 * EncodedVideoChunk */

let videoBidiStreamWritable, audioEncoder, videoEncoder, frameBuffer,
    audioSendStreamWriter, videoSendStreamWriter, mediaSession,
    datagramReceiver, videoDecoder;
// 4 bytes for frame size before each frame. The 1st byte is reserved, always 0.
const sizePrefix = 4;

onmessage = (e) => {
  if (e.data[0] === 'audio-source') {
    readMediaData(e.data[1], 'audio');
  } else if (e.data[0] === 'video-source') {
    readMediaData(e.data[1], 'video');
  } else if (e.data[0] === 'send-stream-audio') {
    const audioBidiStreamWritable = e.data[1];
    audioSendStreamWriter = audioBidiStreamWritable.getWriter();
    writeTrackId('audio', audioSendStreamWriter);
    initAudioEncoder();
  } else if (e.data[0] === 'send-stream-video') {
    videoBidiStreamWritable = e.data[1];
    videoSendStreamWriter = videoBidiStreamWritable.getWriter();
    writeTrackId('video', videoSendStreamWriter);
    initVideoEncoder();
  } else if (e.data[0] === 'datagram-receiver') {
    datagramReceiver = e.data[1];
  } else if (e.data[0] === 'encoded-video-frame') {
    if (videoDecoder.state === 'closed') {
      return;
    }
    videoDecoder.decode(new EncodedVideoChunk(
        {timestamp: Date.now(), data: e.data[1], type: 'key'}));
  }
};

async function videoOutput(chunk, metadata) {
  return;
  if (videoBidiStreamWritable) {
    if (!frameBuffer ||
        frameBuffer.byteLength < chunk.byteLength + sizePrefix) {
      frameBuffer = new ArrayBuffer(chunk.byteLength + sizePrefix);
    }
    const bufferView = new Uint8Array(frameBuffer, sizePrefix);
    chunk.copyTo(bufferView);
    const dataView =
        new DataView(frameBuffer, 0, chunk.byteLength + sizePrefix);
    dataView.setUint32(0, chunk.byteLength);
    await videoSendStreamWriter.ready;
    await videoSendStreamWriter.write(dataView);
  }
}

function videoError(error) {
  console.log('Video encode error, ' + error.message);
}

async function audioOutput(chunk, metadata) {
  if (audioSendStreamWriter) {
    if (!frameBuffer ||
        frameBuffer.byteLength < chunk.byteLength + sizePrefix) {
      frameBuffer = new ArrayBuffer(chunk.byteLength + sizePrefix);
    }
    const bufferView = new Uint8Array(frameBuffer, sizePrefix);
    chunk.copyTo(bufferView);
    const dataView =
        new DataView(frameBuffer, 0, chunk.byteLength + sizePrefix);
    dataView.setUint32(0, chunk.byteLength);
    await audioSendStreamWriter.ready;
    await audioSendStreamWriter.write(dataView);
    console.log('Wrote an audio frame. '+chunk.byteLength);
  }
}

function audioError(error) {
  console.log(`Audio encode error: ${error.message}`);
}

async function writeTrackId(kind, writer) {
  const id = new Uint8Array(16);
  id[15] = (kind === 'audio' ? 1 : 2);
  await writer.ready;
  writer.write(id);
  console.log('Wrote track ID for '+kind);
}

function initAudioEncoder() {
  audioEncoder = new AudioEncoder({output: audioOutput, error: audioError});
  audioEncoder.configure(
      {codec: 'opus', numberOfChannels: 1, sampleRate: 48000});
}

function initVideoEncoder() {
  videoEncoder = new VideoEncoder({output: videoOutput, error: videoError});
  videoEncoder.configure({
    codec: 'avc1.4d002a',
    width: 640,
    height: 480,
    framerate: 30,
    latencyMode: 'realtime',
    avc: {format: 'annexb'},
  });
}

function initVideoDecoder() {
  videoDecoder = new VideoDecoder({
    output: videoFrameOutputCallback,
    error: webCodecsErrorCallback,
  });
  videoDecoder.configure({codec: 'avc1.42400a', optimizeForLatency: true});
}

function videoFrameOutputCallback(frame) {
  postMessage(['video-frame', frame], [frame]);
}

function webCodecsErrorCallback(error) {
  console.log('error: ' + error.message);
}

// Read data from media track.
async function readMediaData(readable, kind) {
  const reader = readable.getReader();
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      console.log('MediaStream ends.');
      break;
    }
    if (kind === 'audio') {
      audioEncoder.encode(value);
    } else if (kind === 'video') {
      videoEncoder.encode(value);
    }
    value.close();
  }
}

async function fetchWasm() {
  const Module={};
  Module['instantiateWasm'] = async (imports, successCallback) => {
    const response = await fetch('./owt.wasm');
    const buffer = await response.arrayBuffer();
    const module=new WebAssembly.Module(buffer);
    const instance = await WebAssembly.instantiate(module, imports);
    successCallback(instance, module);
    return {};
  };
  // Module['wasmModule']=new WebAssembly.Module(buffer);
  importScripts('./owt.js');
  console.log('Got wasm binary.');
}

initVideoDecoder();
