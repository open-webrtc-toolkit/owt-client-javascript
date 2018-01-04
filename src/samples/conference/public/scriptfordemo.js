var runSocketIOSample = function() {
  'use strict';
  var localStream;
  let showedRemoteStreams = [];
  let me;
  let showSmall = true;

  function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(
      /\+/g, ' '));
  }

  var subscribeMix = true;

  function createToken(room, userName, role, callback) {
    var req = new XMLHttpRequest();
    var url = '/createToken/';
    var body = {
      room: room,
      username: userName,
      role: role
    };
    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        callback(req.responseText);
      }
    };
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
  }

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

    document.getElementById('remote').srcObject=stream.mediaStream;
    //stream.show('test' + streamId);
    showedRemoteStreams.push(stream);
  }

  function removeStreamFromShowedStreams(stream) {
    let index = showedRemoteStreams.indexOf(stream);
    if (index >= 0) {
      showedRemoteStreams.slice(index, 1);
    }
  }

  function trySubscribeStream(stream) {
    if(stream.attr('4k')){
      conference.subscribe(stream, (stream)=>{
        L.Logger.info('subscribed:', stream.id());
        document.getElementById('remote').srcObject=stream.mediaStream;
      }, (err)=>{
        L.Logger.error(stream.id(), 'subscribe failed:', err);
      });
    } else if(stream.from!==me) {
      conference.subscribe(stream, (stream)=>{
        L.Logger.info('subscribed:', stream.id());
        document.getElementById('small').srcObject=stream.mediaStream;
      }, (err)=>{
        L.Logger.error(stream.id(), 'subscribe failed:', err);
      });
    } else {
      L.Logger.info('Skip '+stream.id());
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
    var fromMe = false;
    for (var i in conference.localStreams) {
      if (conference.localStreams.hasOwnProperty(i)) {
        if (conference.localStreams[i].id() === stream.id()) {
          fromMe = true;
          break;
        }
      }
    }
    if (fromMe) {
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
    createToken(myRoom, 'user', 'presenter', function(response) {
      var token = response;

      conference.join(token, function(resp) {
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
              stream.attr('4k', true);
              document.getElementById('local').srcObject= stream.mediaStream;

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
        me=resp.self.id;
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
              //selectResolution.appendChild(button);
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

  var fullScreenButton = document.getElementById('full-screen');
  var videoContainer=document.getElementById('video-container');

  var toggleSmallVideo = function(){
    if(showSmall){
      document.getElementById('local').style.display = 'none';
      document.getElementById('small').style.display = 'none';
      showSmall=false;
    } else {
      document.getElementById('local').style.display = 'block';
      document.getElementById('small').style.display = 'block';
      showSmall=true;
    }
  }

  document.addEventListener('keydown', (event) => {
    const keyName = event.key;
    if(keyName==='f'){
      videoContainer.webkitRequestFullscreen();
    } else if(keyName==='h'){
      toggleSmallVideo();
    }
  });

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
