// Copyright (C) <2021> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */
/* global VideoEncoder */

let bidirectionalStreamWritable, videoEncoder, frameBuffer, sendStreamWriter;
// 4 bytes for frame size before each frame. The 1st byte is reserved, always 0.
const sizePrefix = 4;

onmessage = (e) => {
  if (e.data[0] === 'video-source') {
    readVideoData(e.data[1]);
  } else if (e.data[0] === 'send-stream') {
    bidirectionalStreamWritable = e.data[1];
    sendStreamWriter = bidirectionalStreamWritable.getWriter();
    writeTrackId();
    initVideoEncoder();
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