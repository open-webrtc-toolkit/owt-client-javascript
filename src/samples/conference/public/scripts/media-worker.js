// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global VideoEncoder, VideoDecoder, EncodedVideoChunk */

let bidirectionalStreamWritable, videoEncoder, frameBuffer, sendStreamWriter,
    mediaSession, datagramReceiver, videoDecoder;
// 4 bytes for frame size before each frame. The 1st byte is reserved, always 0.
const sizePrefix = 4;

onmessage = (e) => {
  if (e.data[0] === 'video-source') {
    readVideoData(e.data[1]);
  } else if (e.data[0] === 'send-stream') {
    bidirectionalStreamWritable = e.data[1];
    sendStreamWriter = bidirectionalStreamWritable.getWriter();
    writeTrackId();
    // initVideoEncoder();
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
  if (bidirectionalStreamWritable) {
    if (!frameBuffer ||
        frameBuffer.byteLength < chunk.byteLength + sizePrefix) {
      frameBuffer = new ArrayBuffer(chunk.byteLength + sizePrefix);
    }
    const bufferView = new Uint8Array(frameBuffer, sizePrefix);
    chunk.copyTo(bufferView);
    const dataView =
        new DataView(frameBuffer, 0, chunk.byteLength + sizePrefix);
    dataView.setUint32(0, chunk.byteLength);
    await sendStreamWriter.ready;
    await sendStreamWriter.write(dataView);
    console.log('Write a frame.');
  }
}

function videoError(error) {
  console.log('Encode error, ' + error);
}

async function writeTrackId() {
  const id = new Uint8Array(16);
  id[16] = 2;
  await sendStreamWriter.ready;
  sendStreamWriter.write(id);
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

// Read data from video track.
async function readVideoData(readable) {
  const reader = readable.getReader();
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      console.log('MediaStream ends.');
      break;
    }
    videoEncoder.encode(value);
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
