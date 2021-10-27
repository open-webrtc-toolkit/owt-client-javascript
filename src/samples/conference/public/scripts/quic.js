// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */

'use strict';

let quicChannel = null;
let bidirectionalStream = null;
let bidiAudioStream = null;
let writeTask, dataWorker, conferenceId, myId, mixedStream, generatorWriter,
    mediaPublication;
const isMedia = true;

window.Module={};

const conference = new Owt.Conference.ConferenceClient(
    {
      webTransportConfiguration: {
        serverCertificateFingerprints: [{
          value:
              'FD:CD:87:EB:92:97:84:FD:D9:E9:C1:9F:AF:57:12:0E:32:AF:0D:C0:58:5F:33:BB:59:4A:2E:6E:C3:18:7A:93',
          algorithm: 'sha-256',
        }],
        serverCertificateHashes: [{
          value: new Uint8Array([
            0xFD, 0xCD, 0x87, 0xEB, 0x92, 0x97, 0x84, 0xFD, 0xD9, 0xE9, 0xC1,
            0x9F, 0xAF, 0x57, 0x12, 0x0E, 0x32, 0xAF, 0x0D, 0xC0, 0x58, 0x5F,
            0x33, 0xBB, 0x59, 0x4A, 0x2E, 0x6E, 0xC3, 0x18, 0x7A, 0x93
          ]),
          algorithm: 'sha-256',
        }],
      }
    },
    '../../../sdk/conference/webtransport');
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
  dataWorker = new Worker('./scripts/data-worker.js');
  dataWorker.onmessage=((e) => {
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
  updateConferenceStatus('Created send channel.');
}

async function windowOnLoad() {
  await joinConference();
  //await createSendChannel();
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

async function writeData() {
  const encoder = new TextEncoder();
  const encoded = encoder.encode('message', {stream: true});
  const writer = bidirectionalStream.writable.getWriter();
  await writer.ready;
  const ab = new Uint8Array(10000);
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
  if (isMedia) {
    const mediaStream =
        await navigator.mediaDevices.getUserMedia({audio: true, video: true});
    const localStream = new Owt.Base.LocalStream(
        mediaStream, new Owt.Base.StreamSourceInfo('mic', 'camera', undefined));
    mediaPublication = await conference.publish(localStream, {
      audio: {codec: 'opus', numberOfChannels: 2, sampleRate: 48000},
      video: {codec: 'h264'},
      transport: {type: 'quic'},
    });
  } else {
    if (!bidirectionalStream) {
      updateConferenceStatus('Stream is not created.');
      return;
    }
    writeTask = setInterval(writeData, 200);
  }
  updateConferenceStatus('Started sending.');
});

document.getElementById('stop-sending').addEventListener('click', () => {
  if (isMedia) {
    if (mediaPublication) {
      mediaPublication.stop();
    }
  } else {
    clearInterval(writeTask);
  }
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
        dataWorker.postMessage(
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
