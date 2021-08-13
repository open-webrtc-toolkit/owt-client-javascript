// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable require-jsdoc */

'use strict';

let quicChannel = null;
let bidirectionalStream = null;
let writeTask, mediaStream, mediaWorker, conferenceId, myId;

const conference = new Owt.Conference.ConferenceClient({
  webTransportConfiguration: {
    serverCertificateFingerprints: [{
      value:
          'DD:A8:11:FD:A1:08:17:41:36:CD:1A:33:1E:CF:AE:0D:46:3D:15:16:2C:67:C5:A2:06:35:C2:0E:88:A1:9E:C6',
      algorithm: 'sha-256',
    }]
  }
});
conference.addEventListener('streamadded', async (event) => {
  console.log(event.stream);
  if (event.stream.origin == myId) {
    mixStream(
        conferenceId, event.stream.id, 'common',
        'http://jianjunz-nuc-ubuntu.sh.intel.com:3001');
  }
  if (event.stream.source.data || event.stream.source.video) {
    const subscription = await conference.subscribe(
        event.stream,
        {audio: false, video: {codecs: ['h264']}, transport: {type: 'quic'}});
    const reader = subscription.stream.readable.getReader();
    while (true) {
      const {value, done} = await reader.read();
      if (done) {
        console.log('Subscription ends.');
        break;
      }
      console.log('Received data: ' + value);
    }
  }
});

function updateConferenceStatus(message) {
  document.getElementById('conference-status').innerHTML +=
      ('<p>' + message + '</p>');
}


function joinConference() {
  return new Promise((resolve, reject) => {
    createToken(undefined, 'user', 'presenter', token => {
      conference.join(token).then((info) => {
        conferenceId = info.id;
        myId = info.self.id;
        updateConferenceStatus('Connected to conference server.');
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
  const localStream = new Owt.Base.LocalStream(
      bidirectionalStream,
      new Owt.Base.StreamSourceInfo(undefined, 'camera', undefined));
  attachReader(bidirectionalStream);
  const publication = await conference.publish(
      localStream, {video: {codec: 'h264'}, transport: {type: 'quic'}});
  // const localStream = new Owt.Base.LocalStream(
  //     bidirectionalStream,
  //     new Owt.Base.StreamSourceInfo(undefined, undefined, true));
  // const publication = await conference.publish(
  //     localStream, {transport: {type: 'quic'}});
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
  mediaWorker = new Worker('./scripts/media-worker.js');
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
  await writer.write(new ArrayBuffer(2));
  writer.releaseLock();
  return;
}

window.addEventListener('load', () => {
  windowOnLoad();
});

document.getElementById('start-sending').addEventListener('click', async () => {
  if (!bidirectionalStream) {
    updateConferenceStatus('Stream is not created.');
    return;
  }
  writeVideoData();
  // writeTask = setInterval(writeData, 2000);
  updateConferenceStatus('Started sending.');
});

document.getElementById('stop-sending').addEventListener('click', () => {
  clearInterval(writeTask);
  updateConferenceStatus('Stopped sending.');
});
