var runRestSample = function() {
  'use strict';
  var localStream;

  function getParameterByName(name) {
    name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
      results = regex.exec(location.search);
    return results === null ? '' : decodeURIComponent(results[1].replace(
      /\+/g, ' '));
  }

  var subscribeMix = getParameterByName('mix') || 'true';
  var portal = '';
  var participant_id;
  var query_period = 1000,
    query_interval;
  var published = {};
  var subscribed = {};
  var mixed_stream;

  function send(method, url, body, on_ok, on_error) {
    var req = new XMLHttpRequest({
      rejectUnauthorized: false
    });

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        if (req.status === 200) {
          if (req.responseText.length > 0) {
            on_ok(JSON.parse(req.responseText));
          } else {
            on_ok();
          }
        } else {
          on_error(req.responseText);
        }
      }
    };

    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
  }

  function createToken(room, userName, role, callback) {
    var req = new XMLHttpRequest({
      rejectUnauthorized: false
    });
    var url = '/tokens/rest';
    var body = {
      room: room,
      username: userName,
      role: role
    };

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        var token = JSON.parse(L.Base64.decodeBase64(req.responseText));
        portal = 'http' + (token.secure ? 's' : '') + '://' + token.host;
        callback(token);
      }
    };
    req.open('POST', url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    req.send(JSON.stringify(body));
  }

  function join(token, on_ok, on_error) {
    var url = portal + '/clients';
    var body = {
      token: token,
      queryInterval: query_period
    };

    L.Logger.info('To join, token:', token);

    send('POST', url, body, function(result) {
      participant_id = result.id;
      startQuery();
      L.Logger.info('Join ok, participant_id:', participant_id);
      on_ok(result);
    }, on_error);
  }

  function query(clientId) {
    var url = portal + '/clients/' + clientId;

    L.Logger.info('To query, clientId:', clientId);

    send('GET', url, undefined, onQueryResult, function(err) {
      L.Logger.info('query failed:', err);
    });
  }

  function leave(clientId) {
    var url = portal + '/clients/' + clientId;

    send('DELETE', url, undefined, function() {
      L.Logger.info('Leave!!');
    }, function(err) {
      L.Logger.info('query failed:', err);
    });
    stopQuery();
  }

  function publish(clientId, type, options, on_ok, on_error) {
    var url = portal + '/pub/' + clientId;
    var body = {
      type: type,
      options: options
    };

    L.Logger.info('To publish, type:', type, 'options:', options);

    send('POST', url, body, on_ok, on_error);
  }

  function unpublish(streamId, on_ok, on_error) {
    var url = portal + '/pub/' + clientId + '/' + streamId;

    L.Logger.info('To unpublish:', streamId);

    send('DELETE', url, undefined, on_ok, on_error);
  }

  function subscribe(clientId, type, options, on_ok, on_error) {
    var url = portal + '/sub/' + clientId;
    var body = {
      type: type,
      options: options
    };

    L.Logger.info('To subscribe, type:', type, 'options:', options);

    send('POST', url, body, on_ok, on_error);
  }

  function unsubscribe(subscriptionId, on_ok, on_error) {
    var url = portal + '/sub/' + clientId + '/' + subscriptionId;

    L.Logger.info('To unsubscribe:', subscriptionId);

    send('DELETE', url, undefined, on_ok, on_error);
  }

  var startQuery = function() {
    if (query_interval) {
      clearInterval(query_interval);
      query_interval = undefined;
    }
    query_interval = setInterval(function() {
      query(participant_id);
    }, query_period);
  };

  var stopQuery = function() {
    if (query_interval) {
      clearInterval(query_interval);
      query_interval = undefined;
    }
  };

  var onQueryResult = function(result) {
    L.Logger.info('Query result:', result);
    for (var stream_id in result.published) {
      result.published[stream_id].map(function(signaling) {
        handlePubSignaling(stream_id, signaling);
      });
    }

    for (var subscription_id in result.subscribed) {
      result.subscribed[subscription_id].map(function(signaling) {
        handleSubSignaling(subscription_id, signaling);
      });
    }

    result.notifications.map(function(evt) {
      handleNotification(evt);
    });
  };

  var handlePubSignaling = function(streamId, signaling) {
    switch (signaling.type) {
      case 'initializing':
      case 'offer':
      case 'answer':
      case 'candidate':
      default:
        L.Logger.debug('stream:', streamId, 'signaling:', signaling);
    }
  };

  var handleSubSignaling = function(subscriptionId, signaling) {
    switch (signaling.type) {
      case 'initializing':
      case 'offer':
      case 'answer':
      case 'candidate':
      default:
        L.Logger.debug('subscription:', subscriptionId, 'signaling:',
          signaling);
    }
  };

  var handleNotification = function(evt) {
    switch (evt.event) {
      case 'user_join':
      case 'user_leave':
      case 'add_stream':
      case 'update_stream':
      case 'remove_stream':
      case 'custom_message':
      default:
        L.Logger.debug('notification:', evt);
    }
  };

  function displayStream(stream, resolution) {
    var div = document.createElement('div');
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
    if (!resolution.width || !resolution.height || resolution.width > 640) {
      resolution = {
        width: 640,
        height: 480
      };
    }
    div.setAttribute('style', 'width: ' + resolution.width + 'px; height: ' +
      resolution.height + 'px;');
    div.setAttribute('id', 'test' + streamId);
    div.setAttribute('title', 'Stream#' + streamId);
    document.body.appendChild(div);
    if (window.navigator.appVersion.indexOf('Trident') < 0) {
      stream.show('test' + streamId);
    } else {
      L.Logger.info('displayStream:', stream.id());
      var canvas = document.createElement('canvas');
      canvas.width = resolution.width;
      canvas.height = resolution.height;
      canvas.setAttribute('autoplay', 'autoplay::autoplay');
      div.appendChild(canvas);
      var ieStream = new Woogeen.ieplugin.ieMediaStream(stream.mediaStream.label);
      attachRemoteMediaStream(canvas, ieStream, stream.pcid);
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
        var resolution;
        if (resolutions.length > 1) {
          resolution = resolutions[Math.floor(Math.random() * 10) % 2];
          L.Logger.info('subscribe stream with option:', resolution);
        }
        subscribe(participant_id, 'webrtc', {
          audio: {
            from: stream.id
          },
          video: {
            from: stream.id,
            resolution: resolution
          }
        }, function(sub) {
          L.Logger.info('subscribed:', stream.id,
            'and subscription id is:', sub.id);
          //displayStream(stream, resolution);
        }, function(err) {
          L.Logger.error(stream.id, 'subscribe failed:', err);
        });
      } else {
        L.Logger.info('won`t subscribe', stream.id);
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
        subscribe(participant_id, 'webrtc', {
          audio: {
            from: stream.id
          },
          video: {
            from: stream.id
          }
        }, function(sub) {
          L.Logger.info('subscribed:', stream.id,
            'and subscription id is:', sub.id);
          //displayStream(stream);
        }, function(err) {
          L.Logger.error(stream.id, 'subscribe failed:', err);
        });
      } else {
        L.Logger.info('won`t subscribe', stream.id);
      }
    }
  }


  window.onload = function() {
    L.Logger.setLogLevel(L.Logger.INFO);
    var myResolution = getParameterByName('resolution') || 'vga';
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
          publish(participant_id, 'webrtc', {
            audio: false,
            video: {
              device: 'screen',
              resolution: myResolution
            }
          }, function(st) {
            published[st.id] = { /*screen sharing video stream object*/ };
            document.getElementById('myScreen').setAttribute(
              'style', 'width:320px; height: 240px;');
            //stream.show('myScreen');
          }, function(err) {
            L.Logger.error('share screen failed:', err);
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
          subscribe(participant_id, 'url', {
            url: url.value,
            audio: {
              from: mixed_stream
            },
            video: {
              from: mixed_stream
            }
          }, function(sub) {
            L.Logger.info('started external streaming');
            isOutputing = true;
            externalOutputButton.innerHTML = stopExternalOutput;
          }, function(err) {
            L.Logger.error('start external streaming failed:',
              err);
          });
        } else {
          if (subscribed) {
            unsubscribe(participant_id, subscribed, function() {
              L.Logger.info('stopped external streaming');
              isOutputing = false;
              externalOutputButton.innerHTML =
                startExternalOutput;
            }, function(err) {
              L.Logger.error('stop external streaming failed:',
                err);
            });
          }
        }
      };
    }());

    createToken(myRoom, 'user', 'presenter', function(response) {
      var token = response;

      join(token, function(resp) {
        if (typeof mediaUrl === 'string' && mediaUrl !== '') {
          publish(participant_id, 'url', {
            url: mediaUrl,
            transport: 'udp',
            bufferSize: 2048
          }, function(st) {
            published[st.id] = { /*url stream object*/ };
            L.Logger.info('stream published:', st.id);
          }, function(err) {
            L.Logger.error('publish failed:', err);
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
              if (window.navigator.appVersion.indexOf('Trident') <
                0) {
                localStream.show('myVideo');
              }
              if (window.navigator.appVersion.indexOf('Trident') >
                -1) {
                var canvas = document.createElement('canvas');
                canvas.width = 320;
                canvas.height = 240;
                canvas.setAttribute('autoplay',
                  'autoplay::autoplay');
                document.getElementById('myVideo').appendChild(
                  canvas);
                attachMediaStream(canvas, localStream.mediaStream);
              }
              publish(participant_id, 'webrtc', {
                audio: true,
                video: {
                  device: 'camera',
                  resolution: myResolution
                }
              }, function(st) {
                published[st.id] = stream;
                L.Logger.info('stream published:', st.id);
              }, function(err) {
                L.Logger.error('publish failed:', err);
              });
            });
          }
        } else if (isHttps) {
          publish(participant_id, 'webrtc', {
            audio: false,
            video: {
              device: 'screen',
              resolution: myResolution
            }
          }, function(st) {
            published[st.id] = { /*screen sharing video stream object*/ };
            document.getElementById('myScreen').setAttribute(
              'style', 'width:320px; height: 240px;');
            //stream.show('myScreen');
          }, function(err) {
            L.Logger.error('share screen failed:', err);
          });
        } else {
          L.Logger.error(
            'Share screen must be done in https enviromnent!');
        }
        var streams = resp.streams;
        streams.map(function(stream) {
          L.Logger.info('stream in conference:', stream.id);
          if (stream.video && stream.video.device === 'mcu') {
            mixed_stream = stream.id;
          }
          //trySubscribeStream(stream);
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
    if (participant_id) {
      leave(participant_id);
      participant_id = undefined;
    }
  };

};
