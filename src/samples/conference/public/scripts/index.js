// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

const runSocketIOSample = function() {

  let localStream;
  let showedRemoteStreams = [];
  let myId;
  let subscriptionForMixedStream;

  function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(
      /\+/g, ' '));
  }

  var subscribeMix = getParameterByName('mix') || 'true';

  const conference = new Ics.Conference.ConferenceClient();

  function displayStream(stream, resolution) {
    var streamId = stream.id();
    if (stream instanceof Woogeen.RemoteMixedStream) {
      resolution = resolution || {
        width: 640,
        height: 480
      };
    } else {
      resolution = resolution || {
        width: 320,
        height: 240
      };
    }
    if (!resolution.width || !resolution.height) {
      resolution = {
        width: 640,
        height: 480
      };
    }
    var div = document.getElementById('test' + streamId);
    if (!div) {
      div = document.createElement('div');
      div.setAttribute('id', 'test' + streamId);
      div.setAttribute('title', 'Stream#' + streamId);
      document.body.appendChild(div);
    }
    div.setAttribute('style', 'width: ' + resolution.width + 'px; height: ' +
      resolution.height + 'px;');
    stream.show('test' + streamId);
    showedRemoteStreams.push(stream);
  }

  function removeStreamFromShowedStreams(stream) {
    let index = showedRemoteStreams.indexOf(stream);
    if (index >= 0) {
      showedRemoteStreams.slice(index, 1);
    }
  }

  function trySubscribeStream(stream) {
    if (stream instanceof Woogeen.RemoteMixedStream) {
      stream.on('VideoLayoutChanged', function() {
        console.log('stream', stream.id(), 'VideoLayoutChanged');
      });
      if (subscribeMix === 'true') {
        console.log('subscribing:', stream.id());
        var resolutions = stream.resolutions();
        var videoOpt = true;
        var resolution;
        if (resolutions.length > 1) {
          resolution = resolutions[Math.floor(Math.random() * 10) % 2];
          videoOpt = {
            resolution: resolution
          };
          console.log('subscribe stream with option:', resolution);
        }
        conference.subscribe(stream, {
          video: videoOpt
        }, function() {
          console.log('subscribed:', stream.id());
          displayStream(stream, resolution);
        }, function(err) {
          console.error(stream.id(), 'subscribe failed:', err);
        });
      } else {
        console.log('won`t subscribe', stream.id());
      }
    } else {
      ['VideoEnabled', 'AudioEnabled', 'VideoDisabled', 'AudioDisabled'].map(
        function(event_name) {
          stream.on(event_name, function() {
            console.log('stream', stream.id(), event_name);
          });
        });
      if (subscribeMix !== 'true' || stream.isScreen()) {
        console.log('subscribing:', stream.id());
        conference.subscribe(stream, function() {
          console.log('subscribed:', stream.id());
          displayStream(stream);
        }, function(err) {
          console.error(stream.id(), 'subscribe failed:', err);
        });
      } else {
        console.log('won`t subscribe', stream.id());
      }
    }
  }

  function subscribeDifferentResolution(stream, resolution) {
    subscriptionForMixedStream.stop();
    subscriptionForMixedStream = null;
    const videoOptions={};
    videoOptions.resolution=resolution;
    conference.subscribe(stream, { audio: true, video: videoOptions }).then((
      subscription) => {
      subscriptionForMixedStream = subscription;
      $('.remote video').get(0).srcObject = stream.mediaStream;
    });
  }

  conference.addEventListener('streamadded', (event)=>{
    console.log('A new stream is added ', event.stream.id);
    event.stream.addEventListener('ended',()=>{
      console.log(event.stream.id + ' is ended.');
    });
  });

  /*
    conference.onMessage(function(event) {
      console.log('Message Received:', event.msg);
    });

    conference.on('server-disconnected', function() {
      showedRemoteStreams.forEach((stream) => {
        stream.hide();
        removeStreamFromShowedStreams(stream);
      });
      console.log('Server disconnected');
    });

    conference.on('stream-added', function(event) {
      var stream = event.stream;
      // if(stream.id() !== localStream.id()) return;
      console.log('stream added:', stream.id());
      if(event.stream.from === myId) {
        console.log('stream', stream.id(),
          'is from me; will not be subscribed.');
        return;
      }
      trySubscribeStream(stream);
    });

    conference.on('stream-removed', function(event) {
      var stream = event.stream;
      console.log('stream removed: ', stream.id());
      var id = stream.elementId !== undefined ? stream.elementId : 'test' +
        stream.id();
      if (id !== undefined) {
        var element = document.getElementById(id);
        if (element) {
          document.body.removeChild(element);
        }
      }
    });

    conference.on('stream-failed', function(event) {
      console.log('Error occurred for stream ', event.stream.id());
      event.stream.hide();
      removeStreamFromShowedStreams(stream);
    });

    conference.on('user-joined', function(event) {
      console.log('user joined:', event.user);
    });

    conference.on('user-left', function(event) {
      console.log('user left:', event.user);
    });

    conference.on('recorder-added', function(event) {
      console.log('media recorder added:', event.recorderId);
    });

    conference.on('recorder-continued', function(event) {
      console.log('media recorder continued:', event.recorderId);
    });

    conference.on('recorder-removed', function(event) {
      console.log('media recorder removed:', event.recorderId);
    });*/

  window.onload = function() {
    var myResolution = getParameterByName('resolution') || { width: 1280,
      height: 720 };
    var shareScreen = getParameterByName('screen') || false;
    var myRoom = getParameterByName('room');
    var isHttps = (location.protocol === 'https:');
    var mediaUrl = getParameterByName('url');
    var isPublish = getParameterByName('publish');

    if (isHttps) {
      var shareButton = document.getElementById('shareScreen');
      if (shareButton) {
        shareButton.setAttribute('style', 'display:block');
        shareButton.onclick = (function() {
          Woogeen.LocalStream.create({
            video: {
              device: 'screen',
              resolution: myResolution,
              extensionId: 'pndohhifhheefbpeljcmnhnkphepimhe'
            },
            audio: true
          }, function(err, stream) {
            document.getElementById('myScreen').setAttribute(
              'style', 'width:320px; height: 240px;');
            stream.show('myScreen');
            conference.publish(stream, {}, function(st) {
              console.log('stream published:', st.id());
            }, function(err) {
              console.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        });
      }
    }

    createToken(myRoom, 'user', 'presenter', function(response) {
      var token = response;

      conference.join(token).then(resp => {
        myId = resp.self.id;
        myRoom = resp.id;
        if (typeof mediaUrl === 'string' && mediaUrl !== '') {
          Woogeen.ExternalStream.create({
            url: mediaUrl,
            audio: false,
            video: true
          }, function(err, stream) {
            if (err) {
              return console.error(
                'create ExternalStream failed:', err);
            }
            localStream = stream;
            conference.publish(localStream, {}, function(st) {
              console.log('stream published:', st.id());
            }, function(err) {
              console.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        } else if (shareScreen === false) {
          if (isPublish !== 'false') {
            const audioConstraintsForMic = new Ics.Base.AudioTrackConstraints(Ics.Base.AudioSourceInfo.MIC);
            const videoConstraintsForCamera = new Ics.Base.VideoTrackConstraints(Ics.Base.VideoSourceInfo.CAMERA);
            let mediaStream;
            Ics.Base.MediaStreamFactory.createMediaStream(new Ics.Base.StreamConstraints(
              audioConstraintsForMic, videoConstraintsForCamera)).then(stream => {
              mediaStream = stream;
              localStream = new Ics.Base.LocalStream(
                mediaStream, new Ics.Base.StreamSourceInfo(
                  'mic', 'camera'));
              $('.local video').get(0).srcObject = stream;
              conference.publish(localStream).then(publication => {
                mixStream(myRoom, publication.id, 'common')
                publication.addEventListener('error', (err) => {
                  console.log('Publication error: ' + err.error.message);
                });
              });
            }, err => {
              console.error('Failed to create MediaStream, ' +
                err);
            });
            //TODO:
            /*
              Woogeen.LocalStream.create({
                video: {
                  device: 'camera',
                  resolution: myResolution
                },
                audio: true
              }, function(err, stream) {
                if (err) {
                  return console.error(
                    'create LocalStream failed:', err);
                }
                localStream = stream;
                localStream.show('myVideo');

                conference.publish(localStream, {}, function(st) {
                  console.log('stream published:', st.id());
                }, function(err) {
                  console.error('publish failed:', err);
                });
                stream.on('Ended', () => {
                  stream.hide();
                  conference.unpublish(stream);
                });
              });*/
          }
        } else if (isHttps) {
          Woogeen.LocalStream.create({
            video: {
              device: 'screen',
              resolution: myResolution,
              extensionId: 'pndohhifhheefbpeljcmnhnkphepimhe'
            },
            audio: true
          }, function(err, stream) {
            document.getElementById('myScreen').setAttribute(
              'style', 'width:320px; height: 240px;');
            stream.show('myScreen');
            conference.publish(stream, {}, function(st) {
              console.log('stream published:', st.id());
            }, function(err) {
              console.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        } else {
          console.error(
            'Share screen must be done in https enviromnent!');
        }
        var streams = resp.remoteStreams;
        for (const stream of streams) {
          if (stream.source.audio === 'mixed' || stream.source.video ===
            'mixed') {
            conference.subscribe(stream, { audio: true, video: true }).then((subscription) => {
              subscriptionForMixedStream=subscription;
              $('.remote video').get(0).srcObject = stream.mediaStream;
              subscription.addEventListener('error',(err)=>{
                console.log('Subscription error: ' + err.error.message);
              })
            });
            for (const resolution of stream.capabilities.video.resolutions) {
              const button = $('<button/>', { text: resolution.width + 'x' +
                resolution.height, click: ()=>{
                  subscribeDifferentResolution(stream, resolution);
                }});
              button.appendTo($('#resolutions'));
            };
          }
        }
        console.log('Streams in conference:', streams.length);
        var participants = resp.participants;
        console.log('Participants in conference: '+ participants.length);
      }, function(err) {
        console.error('server connection failed:', err);
      });
    });
  };

  window.onbeforeunload = function() {
    if (localStream) {
      localStream.close();
      if (localStream.channel && typeof localStream.channel.close ===
        'function') {
        localStream.channel.close();
      }
    }
    for (var i in conference.remoteStreams) {
      if (conference.remoteStreams.hasOwnProperty(i)) {
        var stream = conference.remoteStreams[i];
        stream.close();
        if (stream.channel && typeof stream.channel.close === 'function') {
          stream.channel.close();
        }
        delete conference.remoteStreams[i];
      }
    }
  };

  // REST samples. It sends HTTP requests to sample server, and sample server sends requests to conference server.
  // Both this file and sample server are samples.
  var send = function(method, entity, body, onRes) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        onRes(req.responseText);
      }
    };
    req.open(method, entity, true);
    req.setRequestHeader('Content-Type', 'application/json');
    if (body !== undefined) {
      req.send(JSON.stringify(body));
    } else {
      req.send();
    }
  };

  var onResponse = function(result) {
    if (result) {
      try {
        console.info('Result:', JSON.parse(result));
      } catch (e) {
        console.info('Result:', result);
      }
    } else {
      console.info('Null');
    }
  };

  var listRooms = function() {
    send('GET', '/rooms/', undefined, onResponse);
  };

  var getRoom = function(room) {
    send('GET', '/rooms/' + room + '/', undefined, onResponse);
  };

  var createRoom = function() {
    send('POST', '/rooms/', { name: 'testNewRoom', options: undefined },
      onResponse);
  };

  var deleteRoom = function(room) {
    send('DELETE', '/rooms/' + room + '/', undefined, onResponse);
  };

  var updateRoom = function(room, config) {
    send('PUT', '/rooms/' + room + '/', config, onResponse);
  };

  var listParticipants = function(room) {
    send('GET', '/rooms/' + room + '/participants/', undefined, onResponse);
  };

  var getParticipant = function(room, participant) {
    send('GET', '/rooms/' + room + '/participants/' + participant + '/',
      undefined, onResponse);
  };

  var forbidSub = function(room, participant) {
    var jsonPatch = [{
      op: 'replace',
      path: '/permission/subscribe',
      value: {audio: false, video: false}
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/',
      jsonPatch, onResponse);
  };

  var forbidPub = function(room, participant) {
    var jsonPatch = [{
      op: 'replace',
      path: '/permission/publish',
      value: {audio: false, video: false}
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/',
      jsonPatch, onResponse);
  };

  var dropParticipant = function(room, participant) {
    send('DELETE', '/rooms/' + room + '/participants/' + participant + '/',
      undefined, onResponse);
  };

  var listStreams = function(room) {
    send('GET', '/rooms/' + room + '/streams/', undefined, onResponse);
  };

  var getStream = function(room, stream) {
    send('GET', '/rooms/' + room + '/streams/' + stream, undefined,
      onResponse);
  };

  var mixStream = function(room, stream, view) {
    var jsonPatch = [{
      op: 'add',
      path: '/info/inViews',
      value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
      onResponse);
  };

  var unmixStream = function(room, stream, view) {
    var jsonPatch = [{
      op: 'remove',
      path: '/info/inViews',
      value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
      onResponse);
  };

  var setRegion = function(room, stream, region, subStream) {
    send('GET', '/rooms/' + room + '/streams/' + stream, undefined, function (stJSON) {
      var st = JSON.parse(stJSON);

      if (st.type !== 'mixed') {
        return console.info('Invalid stream');
      }

      var index = 0;
      for (index = 0; index <= st.info.layout.length; index++) {
        if (st.info.layout[index].region.id === region) {
          break;
        }
      }

      if (index < st.info.layout.length) {
        var jsonPatch = [{
          op: 'replace',
          path: '/info/layout/0/stream',
          value: subStream
        }];
        send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
          onResponse);
      } else {
        console.info('Invalid region');
      }
    });
  };

  var pauseStream = function(room, stream, track) {
    var jsonPatch = [];
    if (track === 'audio' || track === 'av') {
      jsonPatch.push({
        op: 'replace',
        path: '/media/audio/status',
        value: 'inactive'
      });
    }

    if (track === 'video' || track === 'av') {
      jsonPatch.push({
        op: 'replace',
        path: '/media/video/status',
        value: 'inactive'
      });
    }
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
      onResponse);
  };

  var playStream = function(room, stream, track) {
    var jsonPatch = [];
    if (track === 'audio' || track === 'av') {
      jsonPatch.push({
        op: 'replace',
        path: '/media/audio/status',
        value: 'active'
      });
    }

    if (track === 'video' || track === 'av') {
      jsonPatch.push({
        op: 'replace',
        path: '/media/video/status',
        value: 'active'
      });
    }
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
      onResponse);
  };

  var dropStream = function(room, stream) {
    send('DELETE', '/rooms/' + room + '/streams/' + stream, undefined,
      onResponse);
  };

  var startStreamingIn = function(room, url) {
    var options = {
      url: url,
      media: {
        audio: 'auto',
        video: true
      },
      transport: {
        protocol: 'udp',
        bufferSize: 2048
      }
    };
    send('POST', '/rooms/' + room + '/streaming-ins', options, onResponse);
  };

  var stopStreamingIn = function(room, stream) {
    send('DELETE', '/rooms/' + room + '/streaming-ins/' + stream, undefined,
      onResponse);
  };

  var listRecordings = function(room) {
    send('GET', '/rooms/' + room + '/recordings/', undefined, onResponse);
  };

  var startRecording = function(room, audioFrom, videoFrom, container) {
    var options = {
      media: {
        audio: {
          from: audioFrom
        },
        video: {
          from: videoFrom
        }
      },
      container: (container ? container : 'auto')
    };
    send('POST', '/rooms/' + room + '/recordings', options, onResponse);
  };

  var stopRecording = function(room, id) {
    send('DELETE', '/rooms/' + room + '/recordings/' + id, undefined,
      onResponse);
  };

  var updateRecording = function(room, id, audioFrom, videoFrom) {
    var jsonPatch = [{
      op: 'replace',
      path: '/media/audio/from',
      value: audioFrom
    }, {
      op: 'replace',
      path: '/media/video/from',
      value: videoFrom
    }];
    send('PATCH', '/rooms/' + room + '/recordings/' + id, jsonPatch,
      onResponse);
  };

  var listStreamingOuts = function(room) {
    send('GET', '/rooms/' + room + '/streaming-outs/', undefined, onResponse);
  };

  var startStreamingOut = function(room, url, audioFrom, videoFrom) {
    var options = {
      media: {
        audio: {
          from: audioFrom
        },
        video: {
          from: videoFrom
        }
      },
      url: url
    };
    send('POST', '/rooms/' + room + '/streaming-outs', options, onResponse);
  };

  var stopStreamingOut = function(room, id) {
    send('DELETE', '/rooms/' + room + '/streaming-outs/' + id, undefined,
      onResponse);
  };

  var updateStreamingOut = function(room, id, audioFrom, videoFrom) {
    var jsonPatch = [{
      op: 'replace',
      path: '/media/audio/from',
      value: audioFrom
    }, {
      op: 'replace',
      path: '/media/video/from',
      value: videoFrom
    }];
    send('PATCH', '/rooms/' + room + '/streaming-outs/' + id, jsonPatch,
      onResponse);
  };


  var createToken = function(room, user, role, callback) {
    var body = {
      room: room,
      user: user,
      role: role
    };
    send('POST', '/tokens/', body, callback);
  };

};
