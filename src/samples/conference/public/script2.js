
var send = function (method, entity, body, onRes) {
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
      L.Logger.info('Result:', JSON.parse(result));
    } catch (e) {
      L.Logger.info('Result:', result);
    }
  } else {
    L.Logger.info('Null');
  }
};

var listRooms = function() {
  send('GET', '/rooms/', undefined, onResponse);
};

var getRoom = function(room) {
  send('GET', '/rooms/' + room + '/', undefined, onResponse);
};

var createRoom = function() {
  send('POST', '/rooms/', {name: 'testNewRoom', options: undefined}, onResponse);
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
  send('GET', '/rooms/' + room + '/participants/' + participant + '/', undefined, onResponse);
};

var forbidSub = function(room, participant) {
  var jsonPatch = [{
    op: 'replace',
    path: '/permission/subscribe',
    value: false
  }];
  send('PATCH', '/rooms/' + room + '/participants/' + participant + '/', jsonPatch, onResponse);
};

var forbidPub = function(room, participant) {
  var jsonPatch = [{
    op: 'replace',
    path: '/permission/publish',
    value: false
  }];
  send('PATCH', '/rooms/' + room + '/participants/' + participant + '/', jsonPatch, onResponse);
};

var dropParticipant = function(room, participant) {
  send('DELETE', '/rooms/' + room + '/participants/' + participant + '/', undefined, onResponse);
};

var listStreams = function(room) {
  send('GET', '/rooms/' + room + '/streams/', undefined, onResponse);
};

var getStream = function(room, stream) {
  send('GET', '/rooms/' + room + '/streams/' + stream, undefined, onResponse);
};

var mixStream = function(room, stream, view) {
  var jsonPatch = [{
    op: 'add',
    path: '/info/inViews',
    value: view
  }];
  send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, onResponse);
};

var unmixStream = function(room, stream, view) {
  var jsonPatch = [{
    op: 'remove',
    path: '/info/inViews',
    value: view
  }];
  send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, onResponse);
};

var setRegion = function(room, stream, region, subStream) {
  var jsonPatch = [{
    op: 'replace',
    path: '/info/layout/0/stream',
    value: subStream
  }];
  send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, onResponse);
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
  send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, onResponse);
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
  send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, onResponse);
};

var dropStream = function(room, stream) {
  send('DELETE', '/rooms/' + room + '/streams/' + stream, undefined, onResponse);
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
  send('DELETE', '/rooms/' + room + '/streaming-ins/' + stream, undefined, onResponse);
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
  send('DELETE', '/rooms/' + room + '/recordings/' + id, undefined, onResponse);
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
  send('PATCH', '/rooms/' + room + '/recordings/' + id, jsonPatch, onResponse);
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
  send('DELETE', '/rooms/' + room + '/streaming-outs/' + id, undefined, onResponse);
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
  send('PATCH', '/rooms/' + room + '/streaming-outs/' + id, jsonPatch, onResponse);
};


var createToken = function(room, user, role, callback) {
  var body = {
    room: room,
    user: user,
    role: role
  };
  send('POST', '/tokens/', body, callback);
};

var runSocketIOSample = function() {
  'use strict';
  var localStream;
  let showedRemoteStreams = [];
  let myId;

  function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(
      /\+/g, ' '));
  }

  var subscribeMix = getParameterByName('mix') || 'true';

  var conference = Woogeen.ConferenceClient.create({});

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
        L.Logger.info('stream', stream.id(), 'VideoLayoutChanged');
      });
      if (subscribeMix === 'true') {
        L.Logger.info('subscribing:', stream.id());
        var resolutions = stream.resolutions();
        var videoOpt = true;
        var resolution;
        if (resolutions.length > 1) {
          resolution = resolutions[Math.floor(Math.random() * 10) % 2];
          videoOpt = {
            resolution: resolution
          };
          L.Logger.info('subscribe stream with option:', resolution);
        }
        conference.subscribe(stream, {
          video: videoOpt
        }, function() {
          L.Logger.info('subscribed:', stream.id());
          displayStream(stream, resolution);
        }, function(err) {
          L.Logger.error(stream.id(), 'subscribe failed:', err);
        });
      } else {
        L.Logger.info('won`t subscribe', stream.id());
      }
    } else {
      ['VideoEnabled', 'AudioEnabled', 'VideoDisabled', 'AudioDisabled'].map(
        function(event_name) {
          stream.on(event_name, function() {
            L.Logger.info('stream', stream.id(), event_name);
          });
        });
      if (subscribeMix !== 'true' || stream.isScreen()) {
        L.Logger.info('subscribing:', stream.id());
        conference.subscribe(stream, function() {
          L.Logger.info('subscribed:', stream.id());
          displayStream(stream);
        }, function(err) {
          L.Logger.error(stream.id(), 'subscribe failed:', err);
        });
      } else {
        L.Logger.info('won`t subscribe', stream.id());
      }
    }
  }

  function subscribeDifferentResolution(resolution) {
    for (var i in conference.remoteStreams) {
      if (conference.remoteStreams[i].isMixed()) {
        var stream = conference.remoteStreams[i];
        if (subscribeMix === 'true') {
          conference.unsubscribe(stream, function(et) {
            L.Logger.info(stream.id(), 'unsubscribe stream');
            stream.hide();
            removeStreamFromShowedStreams(stream);
            conference.subscribe(stream, {
              video: {
                resolution: resolution
              }
            }, function() {
              L.Logger.info('subscribed:', stream.id());
              displayStream(stream, resolution);
            }, function(err) {
              L.Logger.error(stream.id(), 'subscribe failed:', err);
            });
          }, function(err) {
            L.Logger.error(stream.id(), 'unsubscribe failed:', err);
          });
        } else {
          conference.subscribe(stream, {
            video: {
              resolution: resolution
            }
          }, function() {
            L.Logger.info('subscribed:', stream.id());
            displayStream(stream, resolution);
            subscribeMix = 'true';
          }, function(err) {
            L.Logger.error(stream.id(), 'subscribe failed:', err);
          });
        }
      }
    }
  }

  conference.onMessage(function(event) {
    L.Logger.info('Message Received:', event.msg);
  });

  conference.on('server-disconnected', function() {
    showedRemoteStreams.forEach((stream) => {
      stream.hide();
      removeStreamFromShowedStreams(stream);
    });
    L.Logger.info('Server disconnected');
  });

  conference.on('stream-added', function(event) {
    var stream = event.stream;
    // if(stream.id() !== localStream.id()) return;
    L.Logger.info('stream added:', stream.id());
    if(event.stream.from === myId) {
      L.Logger.info('stream', stream.id(),
        'is from me; will not be subscribed.');
      return;
    }
    trySubscribeStream(stream);
  });

  conference.on('stream-removed', function(event) {
    var stream = event.stream;
    L.Logger.info('stream removed: ', stream.id());
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
    L.Logger.info('Error occurred for stream ', event.stream.id());
    event.stream.hide();
    removeStreamFromShowedStreams(stream);
  });

  conference.on('user-joined', function(event) {
    L.Logger.info('user joined:', event.user);
  });

  conference.on('user-left', function(event) {
    L.Logger.info('user left:', event.user);
  });

  conference.on('recorder-added', function(event) {
    L.Logger.info('media recorder added:', event.recorderId);
  });

  conference.on('recorder-continued', function(event) {
    L.Logger.info('media recorder continued:', event.recorderId);
  });

  conference.on('recorder-removed', function(event) {
    L.Logger.info('media recorder removed:', event.recorderId);
  });

  window.onload = function() {
    L.Logger.setLogLevel(L.Logger.INFO);
    var myResolution = getParameterByName('resolution') || {width: 1280, height: 720};
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
              L.Logger.info('stream published:', st.id());
            }, function(err) {
              L.Logger.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        });
      }
    }

    var externalOutputButton = document.getElementById('externalOutput');
    externalOutputButton.onclick = (function() {
      var isOutputing;
      var startExternalOutput = 'start external streaming';
      var stopExternalOutput = 'stop external streaming';
      externalOutputButton.innerHTML = startExternalOutput;
      return function() {
        var url = document.getElementById('externalOutputURL');
        if (!url || !url.value) {
          L.Logger.error('invalid url of rtsp server.');
          return;
        }
        if (!isOutputing) {
          conference.addExternalOutput(url.value, function() {
            L.Logger.info('started external streaming');
            isOutputing = true;
            externalOutputButton.innerHTML = stopExternalOutput;
          }, function(err) {
            L.Logger.error('start external streaming failed:',
              err);
          });
        } else {
          conference.removeExternalOutput(url.value, function() {
            L.Logger.info('stopped external streaming');
            isOutputing = false;
            externalOutputButton.innerHTML = startExternalOutput;
          }, function(err) {
            L.Logger.error('stop external streaming failed:', err);
          });
        }
      };
    }());

    createToken(myRoom, 'user', 'presenter', function(response) {
      var token = response;

      conference.join(token, function(resp) {
        myId = resp.self.id;
        if (typeof mediaUrl === 'string' && mediaUrl !== '') {
          Woogeen.ExternalStream.create({
            url: mediaUrl,
            audio: false,
            video: true
          }, function(err, stream) {
            if (err) {
              return L.Logger.error(
                'create ExternalStream failed:', err);
            }
            localStream = stream;
            conference.publish(localStream, {}, function(st) {
              L.Logger.info('stream published:', st.id());
            }, function(err) {
              L.Logger.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        } else if (shareScreen === false) {
          if (isPublish !== 'false') {
            Woogeen.LocalStream.create({
              video: {
                device: 'camera',
                resolution: myResolution
              },
              audio: true
            }, function(err, stream) {
              if (err) {
                return L.Logger.error(
                  'create LocalStream failed:', err);
              }
              localStream = stream;
              localStream.show('myVideo');

              conference.publish(localStream, {}, function(st) {
                L.Logger.info('stream published:', st.id());
              }, function(err) {
                L.Logger.error('publish failed:', err);
              });
              stream.on('Ended', () => {
                stream.hide();
                conference.unpublish(stream);
              });
            });
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
              L.Logger.info('stream published:', st.id());
            }, function(err) {
              L.Logger.error('publish failed:', err);
            });
            stream.on('Ended', () => {
              stream.hide();
              conference.unpublish(stream);
            });
          });
        } else {
          L.Logger.error(
            'Share screen must be done in https enviromnent!');
        }
        var streams = resp.streams;
        streams.map(function(stream) {
          if (stream.resolutions) {
            var selectResolution = document.getElementById(
              'resolutions');
            stream.resolutions().map(function(resolution) {
              var button = document.createElement('button');
              button.innerHTML = resolution.width + 'x' +
                resolution.height;
              button.onclick = function() {
                subscribeDifferentResolution(resolution);
              }
              selectResolution.appendChild(button);
            });
          }
          L.Logger.info('stream in conference:', stream.id());
          trySubscribeStream(stream);
        });
        var users = resp.users;
        if (users instanceof Array) {
          users.map(function(u) {
            L.Logger.info('user in conference:', u);
          });
        }
      }, function(err) {
        L.Logger.error('server connection failed:', err);
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

};
