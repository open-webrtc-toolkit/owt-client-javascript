// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

// Please change example.com to signaling server's address.
const serverAddress = 'https://example.com:8096';

// Please change this STUN and TURN server information.
const rtcConfiguration = {
  iceServers: [{
    urls: 'stun:example.com:3478',
  }, {
    urls: [
      'turn:example.com:3478?transport=udp',
      'turn:example.com:3478?transport=tcp',
    ],
    credential: 'password',
    username: 'username',
  }],
};

const signaling = new SignalingChannel();
let publicationForCamera;
const p2p = new Owt.P2P.P2PClient({
  audioEncodings: true,
  videoEncodings: [{
    codec: {
      name: 'h264',
    },
  }, {
    codec: {
      name: 'vp9',
    },
  }, {
    codec: {
      name: 'vp8',
    },
  }],
  rtcConfiguration,
}, signaling);

let localStream;
let screenStream;

const getTargetId = function() {
  return $('#remote-uid').val();
};

$(document).ready(function() {
  $('#set-remote-uid').click(function() {
    p2p.allowedRemoteIds = [getTargetId()];
  });

  $('#mute-toggle').click(function () {
    document.getElementById('remoteVideo').muted = !document.getElementById('remoteVideo').muted;
    document.getElementById('screenVideo').muted = !document.getElementById('screenVideo').muted;
  });

  $('#target-screen').click(function() {
    const config = {
      audio: {
        source: 'screen-cast',
      },
      video: {
        source: 'screen-cast',
      },
    };
    let mediaStream;
    Owt.Base.MediaStreamFactory.createMediaStream(config).then(
      (stream) => {
        mediaStream = stream;
        screenStream = new Owt.Base.LocalStream(mediaStream, new Owt
          .Base.StreamSourceInfo('screen-cast', 'screen-cast'));
        $('#local').children('video').get(0).srcObject = screenStream
          .mediaStream;
        p2p.publish(getTargetId(), screenStream).then(
          (publication) => {}), (error) => {
          console.log('Failed to share screen.');
        };
      }, (err) => {
        console.error('Failed to create MediaStream, ' + err);
      });
  });

  $('#target-video-unpublish').click(function() {
    $('#target-video-publish').prop('disabled', false);
    $('#target-video-unpublish').prop('disabled', true);
    publicationForCamera.stop();
    for (const track of localStream.mediaStream.getTracks()) {
      track.stop();
    }
    localStream = undefined;
  });

  $('#target-video-publish').click(function() {
    $('#target-video-unpublish').prop('disabled', false);
    $('#target-video-publish').prop('disabled', true);
    if (localStream) {
      p2p.publish(getTargetId(), localStream).then((publication) => {
        publicationForCamera = publication;
      }, (error) => {
        console.log('Failed to share video.');
      }); // Publish local stream to remote client
    } else {
      const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(
        Owt.Base.AudioSourceInfo.MIC);
      const videoConstraintsForCamera = new Owt.Base
        .VideoTrackConstraints(Owt.Base.VideoSourceInfo.CAMERA);
      let mediaStream;
      Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base
        .StreamConstraints(audioConstraintsForMic,
          videoConstraintsForCamera)).then((stream) => {
        mediaStream = stream;
        localStream = new Owt.Base.LocalStream(mediaStream, new Owt
          .Base.StreamSourceInfo('mic', 'camera'));
        $('#local').children('video').get(0).srcObject = localStream
          .mediaStream;
        p2p.publish(getTargetId(), localStream).then(
          (publication) => {
            publicationForCamera = publication;
          }, (error) => {
            console.log('Failed to share video.');
          });
      }, (err) => {
        console.error('Failed to create MediaStream, ' + err);
      });
    }
  });

  $('#target-peerconnection-stop').click(function() {
    p2p.stop($('#remote-uid').val()); // Stop conversation
  });

  $('#login').click(function() {
    p2p.connect({
      host: serverAddress,
      token: $('#uid').val(),
    }).then(() => {
      $('#uid').prop('disabled', true);
    }, (error) => {
      console.log('Failed to connect to the signaling server.');
    }); // Connect to signaling server.
  });

  $('#logoff').click(function() {
    p2p.disconnect();
    $('#uid').prop('disabled', false);
  });

  $('#data-send').click(function() {
    p2p.send(getTargetId(), $('#dataSent')
      .val()); // Send data to remote endpoint.
  });
});

p2p.addEventListener('streamadded',
  function(e) { // A remote stream is available.
    e.stream.addEventListener('ended', () => {
      console.log('Stream is removed.');
    });
    if (e.stream.source.video === 'screen-cast') {
      $('#screen video').show();
      $('#screen video').get(0).srcObject = e.stream.mediaStream;
      $('#screen video').get(0).play();
    } else if (e.stream.source.audio || e.stream.source.video) {
      $('#remote video').show();
      $('#remote video').get(0).srcObject = e.stream.mediaStream;
      $('#remote video').get(0).play();
    }
  });

p2p.addEventListener('messagereceived',
  function(e) { // Received data from datachannel.
    $('#dataReceived').val(e.origin + ': ' + e.message);
  });

window.onbeforeunload = function() {
  p2p.stop($('#remote-uid').val());
};
