// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */

'use strict';

let quicChannel = null;
let bidirectionalStream = null;
let writeTask, mediaStream, mediaWorker, conferenceId, myId, mixedStream, generatorWriter;

window.Module={};

const conference = new Owt.Conference.ConferenceClient({
  webTransportConfiguration: {
    serverCertificateFingerprints: [{
      value:
          '59:74:C6:C5:2C:D8:E8:18:A9:D2:14:77:ED:94:89:87:DF:83:BA:B3:96:4C:4C:0B:B8:D3:22:58:11:55:67:1A',
      algorithm: 'sha-256',
    }],
    serverCertificateHashes: [{
      value: new Uint8Array([
        0x59, 0x74, 0xC6, 0xC5, 0x2C, 0xD8, 0xE8, 0x18, 0xA9, 0xD2, 0x14,
        0x77, 0xED, 0x94, 0x89, 0x87, 0xDF, 0x83, 0xBA, 0xB3, 0x96, 0x4C,
        0x4C, 0x0B, 0xB8, 0xD3, 0x22, 0x58, 0x11, 0x55, 0x67, 0x1A
      ]),
      algorithm: 'sha-256',
    }],
  }
});
conference.addEventListener('streamadded', async (event) => {
  console.log(event.stream);
  if (event.stream.origin == myId) {
    mixStream(
        conferenceId, event.stream.id, 'common',
        'http://jianjunz-nuc-ubuntu.sh.intel.com:3001');
  }
  // if (event.stream.source.data) {
  //   const subscription = await conference.subscribe(
  //       event.stream,
  //       // {transport:{type: 'quic'}});
  //       {audio: false, video: {codecs: ['h264']}, transport: {type: 'quic'}});
  //   const reader = subscription.stream.readable.getReader();
  //   while (true) {
  //     const {value, done} = await reader.read();
  //     if (done) {
  //       console.log('Subscription ends.');
  //       break;
  //     }
  //     //console.log('Received data: ' + value);
  //   }
  // }
});

function updateConferenceStatus(message) {
  document.getElementById('conference-status').innerHTML +=
      ('<p>' + message + '</p>');
}

function initWorker() {
  mediaWorker = new Worker('./scripts/media-worker.js');
  mediaWorker.onmessage=((e) => {
    if (e.data[0] === 'video-frame') {
      generatorWriter.write(e.data[1]);
      //console.log(e.data[1]);
    }
  });
}

function joinConference() {
  return new Promise((resolve, reject) => {
    createToken(undefined, 'user', 'presenter', token => {
      conference.join(token).then((info) => {
        conferenceId = info.id;
        myId = info.self.id;
        for (const stream of info.remoteStreams) {
          if (stream.source.video === 'mixed') {
            mixedStream = stream;
          }
        }
        updateConferenceStatus('Connected to conference server.');
        initWorker();
        resolve();
      });
    }, 'http://jianjunz-nuc-ubuntu.sh.intel.com:3001');
  });
};

function createQuicTransport() {
  quicChannel = conference.createQuicConnection();
  return;
}

function createRandomContentSessionId() {
  const length = 16;
  const id = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    id[i] = Math.random() * 255;
  }
  return id;
}

async function attachReader(stream) {
  const reader = stream.readable.getReader();
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      console.log('Ends.');
      break;
    }
    console.log('Received data: ' + value);
  }
}

async function createSendChannel() {
  bidirectionalStream = await conference.createSendStream();
  // const localStream = new Owt.Base.LocalStream(
  //     bidirectionalStream,
  //     new Owt.Base.StreamSourceInfo(undefined, 'camera', undefined));
  // attachReader(bidirectionalStream);
  // const publication = await conference.publish(
  //     localStream, {video: {codec: 'h264'}, transport: {type: 'quic'}});
  const localStream = new Owt.Base.LocalStream(
      bidirectionalStream,
      new Owt.Base.StreamSourceInfo(undefined, undefined, true));
  const publication = await conference.publish(
      localStream, {transport: {type: 'quic'}});
  console.log(publication);
  updateConferenceStatus('Created send channel.');
}

async function windowOnLoad() {
  await joinConference();
  await createSendChannel();
}

async function writeUuid() {
  const uuid = createRandomContentSessionId();
  const encoder = new TextEncoder();
  const encoded = encoder.encode(uuid, {stream: true});
  const writer = bidirectionalStream.writable.getWriter();
  await writer.ready;
  writer.write(uuid);
  writer.releaseLock();
  return;
}

async function writeVideoData() {
  mediaStream = await navigator.mediaDevices.getUserMedia({video: true});
  const track = new MediaStreamTrackProcessor(mediaStream.getVideoTracks()[0]);
  mediaWorker.postMessage(['video-source', track.readable], [track.readable]);
  mediaWorker.postMessage(
      ['send-stream', bidirectionalStream.writable],
      [bidirectionalStream.writable]);
}

async function writeData() {
  const encoder = new TextEncoder();
  const encoded = encoder.encode('message', {stream: true});
  const writer = bidirectionalStream.writable.getWriter();
  await writer.ready;
  const ab=new Uint8Array(10000);
  ab.fill(1, 0);
  await writer.write(ab);
  writer.releaseLock();
  return;
}

window.addEventListener('load', () => {
  windowOnLoad();
  fetchWasm();
});

document.getElementById('start-sending').addEventListener('click', async () => {
  if (!bidirectionalStream) {
    updateConferenceStatus('Stream is not created.');
    return;
  }
  //writeVideoData();
  writeTask = setInterval(writeData, 200);
  updateConferenceStatus('Started sending.');
});

document.getElementById('stop-sending').addEventListener('click', () => {
  clearInterval(writeTask);
  updateConferenceStatus('Stopped sending.');
});

document.getElementById('start-receiving')
    .addEventListener('click', async () => {
      const video=document.getElementById('remote-video');
      const generator = new MediaStreamTrackGenerator({kind: 'video'});
      generatorWriter=generator.writable.getWriter();
      video.srcObject = new MediaStream([generator]);
      const reader = conference.datagramReader();
      const ms = new Module.MediaSession();
      const receiver = ms.createRtpVideoReceiver();
      receiver.setCompleteFrameCallback((frame) => {
        const copiedFrame = frame.slice(0);
        mediaWorker.postMessage(
            ['encoded-video-frame', copiedFrame], [copiedFrame.buffer]);
      });
      subscribeMixedStream();
      while (true) {
        const received = await reader.read();
        const buffer = Module._malloc(received.value.byteLength);
        Module.writeArrayToMemory(received.value, buffer);
        receiver.onRtpPacket(buffer, received.value.byteLength);
      }
    });

async function fetchWasm() {
  Module['instantiateWasm'] = async (imports, successCallback) => {
    const response = await fetch('scripts/owt.wasm');
    const buffer = await response.arrayBuffer();
    const module=await WebAssembly.compile(buffer);
    const instance = await WebAssembly.instantiate(module, imports);
    successCallback(instance, module);
    return {};
  };
  const scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    document.body.appendChild(script);
    script.onload = resolve;
    script.onerror = reject;
    script.async = true;
    script.src = 'scripts/owt.js';
  });
  await scriptPromise;
}

async function subscribeMixedStream() {
  const subscription = await conference.subscribe(
      mixedStream,
      {audio: false, video: {codecs: ['h264']}, transport: {type: 'quic'}});
  const reader = subscription.stream.readable.getReader();
  while (true) {
    const {value, done} = await reader.read();
    if (done) {
      console.log('Subscription ends.');
      break;
    }
    // console.log('Received data: ' + value);
  }
}
