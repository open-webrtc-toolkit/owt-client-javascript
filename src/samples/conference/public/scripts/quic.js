// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

let quicChannel = null;
let bidirectionalStream = null;
let writeTask;
const conference=new Owt.Conference.ConferenceClient();
conference.addEventListener('streamadded', async (event) => {
  console.log(event.stream);
  if (event.stream.source.data) {
    const subscription = await conference.subscribe(event.stream);
    const reader = subscription.stream.readable.getReader();
    while (true) {
      const {value, done} = await reader.read();
      if (done) {
        console.log('Subscription ends.');
        break;
      }
      console.log('Received data: '+value);
    }
  }
});

function updateConferenceStatus(message) {
  document.getElementById('conference-status').innerHTML +=
    ('<p>' + message + '</p>');
}


function joinConference() {
  return new Promise((resolve, reject) => {
    createToken(undefined, 'user', 'presenter', resp => {
      conference.join(resp).then(() => {
        updateConferenceStatus('Connected to conference server.');
        resolve();
      });
    });
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

async function createSendChannel() {
  bidirectionalStream = await conference.createSendStream();
  const localStream=new Owt.Base.LocalStream(bidirectionalStream, new Owt.Base.StreamSourceInfo(undefined, undefined,true));
  const publication = await conference.publish(localStream);
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
  await writeUuid();
  writeTask = setInterval(writeData, 2000);
  updateConferenceStatus('Started sending.');
});

document.getElementById('stop-sending').addEventListener('click', () => {
  clearInterval(writeTask);
  updateConferenceStatus('Stopped sending.');
});
