// Copyright (C) <2020> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

//const conference = new Owt.Conference.ConferenceClient();
let quicTransport=null;
let bidirectionalStream = null;
let writeTask;

function updateConferenceStatus(message) {
  document.getElementById('conference-status').innerHTML +=
      ('<p>' + message + '</p>');
}


function joinConference() {
  const host = 'http://' + document.location.hostname + ':3001';
  return new Promise((resolve, reject) => {
    createToken(undefined, 'user', 'presenter', resp => {
      conference.join(resp).then(() => {
        updateConferenceStatus('Connected to conference server.');
        resolve();
      });
    }, host);
  });
};

function createQuicTransport(){
  quicTransport= new QuicTransport('quic-transport://jianjunz-nuc-ubuntu.sh.intel.com:7700/echo');
  quicTransport.onstatechange=()=>{
    console.log('QuicTransport state changed.');
  };
  return quicTransport.ready;
}

async function createSendChannel() {
  bidirectionalStream = await quicTransport.createSendStream();
  updateConferenceStatus('Created send channel.');
}

async function windowOnLoad() {
  //await joinConference();
  await createQuicTransport();
  await createSendChannel();
}

async function writeData() {
  const encoder = new TextEncoder();
  const encoded = encoder.encode('message', {stream: true});
  const writer = bidirectionalStream.writable.getWriter();
  await writer.ready;
  await writer.write(new ArrayBuffer(90000000));
  writer.releaseLock();
  return;
}

window.addEventListener('load', () => {
  windowOnLoad();
});

document.getElementById('start-sending').addEventListener('click', () => {
  if (!bidirectionalStream) {
    updateConferenceStatus('Stream is not created.');
    return;
  }
  writeTask = setInterval(writeData, 500);
  updateConferenceStatus('Started sending.');
});

document.getElementById('stop-sending').addEventListener('click', () => {
  clearInterval(writeTask);
  updateConferenceStatus('Stopped sending.');
});
