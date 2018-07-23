var securedServerAddress = 'https://webrtc.sh.intel.com:3004';
var unsecuredServerAddress = 'http://webrtc.sh.intel.com:3001';
var serverAddress = unsecuredServerAddress;
var isSecuredConnection = false;
var nodeAddress = 'http://webrtc.sh.intel.com:1235';
var localStream = null;
var localScreen = null;
var room = null;
var roomId = null;
var serviceKey = null;
var localName = 'Anonymous';
var localId = null;
var localScreenId = null;
var users = [];
var progressTimeOut = null;
var smallRadius = 60;
var largeRadius = 120;
var isMouseDown = false;
var mouseX = null;
var mouseY = null;
var MODES = {
  GALAXY: 'galaxy',
  MONITOR: 'monitor',
  LECTURE: 'lecture'
};
var mode = MODES.GALAXY;
var SUBSCRIBETYPES = {
  FORWARD: 'forward',
  MIX: 'mix'
};
var subscribeType = SUBSCRIBETYPES.FORWARD;
var isScreenSharing = false;
var isLocalScreenSharing = false;
var remoteScreen = null;
var remoteScreenName = null;
var curTime = 0;
var totalTime = 0;
var isMobile = false;
var streamObj = {};
var streamIndices = {};
var hasMixed = false;
var isSmall = false;
var singleMute = true;
var isPauseAudio = true;
var isPauseVideo = false;
var isOriginal = true;
var isAudioOnly = false;
var showInfo = null;
var showLevel = null;
var scaleLevel = 3 / 4;
var currentRegions = null;
var localPublication = null;
var localScreenPubliction = null;
var joinResponse = null;
var localResolution = null;
var remoteMixedSub = null;
var subList = {};
var screenSub = null;

function login() {
  setTimeout(function () {
    var inputName = $('#login-input').val();
    if (inputName !== '') {
      localName = htmlEncode(inputName);
      $('#login-panel').addClass('pulse');
      $('#login-panel').hide();
      $('#container').show();
      if (navigator.webkitGetUserMedia) {
        $('#codec').parent().css('display', 'block');
        $('#bandwidth').parent().css('display', 'block');
      }
      initConference();
    }
  }, 400);
  if (isMobile && typeof document.body.webkitRequestFullScreen === 'function') {
    document.body.webkitRequestFullScreen();
  }
}

function htmlEncode(str) {
  var s = "";
  if (str.length === 0) return "";
  s = str.replace(/&/g, "&#38;");
  s = s.replace(/</g, "&#60;");
  s = s.replace(/>/g, "&#62;");
  s = s.replace(/ /g, "&#160;");
  s = s.replace(/\'/g, "&#39;");
  s = s.replace(/\"/g, "&#34;");
  return s;
}

function toggleLoginSetting() {
  $('#default-login').slideToggle();
  $('#setting-login').slideToggle();
}

function loginDisableVideo() {
  $('#login-resolution').slideUp();
}

function loginEnableVideo() {
  $('#login-resolution').slideDown();
}

function exit() {
  if (confirm('Are you sure to exit?')) {
    // window.open('', '_self').close();
    userExit();
  }
}

function userExit() {
  room.leave();
  users = [];
  $("#video-panel div[id^=client-]").remove();
  $("#localScreen").remove();
  $("#screen").remove();
  $("#container").hide();
  $("#login-panel").removeClass("pulse").show();
  $("#user-list").html('');
  localStream = undefined;
  isPauseAudio = true;
  singleMute = true;
  clearInterval(showInfo);
  clearInterval(showLevel);
}

function stopAllStream() {
  for (var temp in streamObj) {
    streamObj[temp].close();
  }
}

var isVcLoaded = false;

function startVc() {
  if (isVcLoaded) {
    $('#vc-dialog').show();
  } else {
    // vc events
    $('#vc-enable').change(function () {
      if ($(this).prop('checked')) {
        $('#vc-mode').removeAttr('disabled');
      } else {
        $('#vc-mode').attr('disabled', true).prop('checked', false);
      }
    });

    $.ajax({
      type: 'get',
      dataType: 'jsonp',
      crossDomain: true,
      url: nodeAddress,
      success: function (data) {
        // get images and videos from nodejs server
        data = JSON.parse(data);
        var videos = data.videos;
        for (var i in videos) {
          $('#vc-video-panel').append('<a class="vc-selectable vc-video"' +
            ' href="javascript:;"' + '><video src="' + nodeAddress +
            '/videos/' + videos[i] +
            '" autoplay muted loop></video></a>');
        }
        var images = data.images;
        for (var i in images) {
          $('#vc-image-panel').append('<a class="vc-selectable vc-image"' +
            ' href="javascript:;"' + '><img src="' + nodeAddress +
            '/images/' + images[i] + '" /></a>');
        }

        for (var i = 0; i < 3; ++i) {
          $('#vc-position-panel').append('<a href="javascript:;" ' +
            'class="vc-selectable vc-position"><img ' +
            'src="img/avatar_p' + (i + 1) + '.png" /></a>');
        }

        // default select first image and video
        $('.vc-image').first().addClass('selected');
        $('.vc-position').first().addClass('selected');

        // handle click events
        $('.vc-selectable').click(function () {
          if ($(this).hasClass('vc-video') || $(this).hasClass(
            'vc-image')) {
            $('.vc-video,.vc-image').removeClass('selected');
          } else if ($(this).hasClass('vc-position')) {
            $('.vc-position').removeClass('selected');
          }
          $(this).addClass('selected');
        })

        isVcLoaded = true;
        $('#vc-dialog').show();
      },
      error: function (e) {
        alert('Fail to load virtual camera images and videos!');
        console.error(e);
      }
    });
  }
}

function sendVc() {
  var cx = 1920;
  var cy = 1080;

  // x and y value from position panel
  var $pos = $('#vc-position-panel').children();
  if ($($pos[0]).hasClass('selected')) {
    // center aligned
    var x = 640;
    var y = 720;
  } else if ($($pos[1]).hasClass('selected')) {
    // left aligned
    var x = 0;
    var y = 720;
  } else if ($($pos[2]).hasClass('selected')) {
    // right aligned
    var x = 1280;
    var y = 720;
  }

  // check if image or video selected
  var $selected = $('#vc-image-panel,#vc-video-panel').children('.selected');
  var isImgSelected = $selected.hasClass('vc-image');

  // file path
  var path = $selected.children().attr('src');
  path = path.slice(path.lastIndexOf('/') + 1);

  $.ajax({
    url: nodeAddress + '/upload',
    crossDomain: true,
    dataType: 'jsonp',
    data: {
      image: {
        x: 0,
        y: 0,
        cx: 1920,
        cy: 1080,
        z: 5,
        enable: isImgSelected ? 1 : 0,
        file: 'images/' + path
      },
      video: {
        x: 0,
        y: 0,
        cx: 1920,
        cy: 1080,
        z: 5,
        enable: isImgSelected ? 0 : 1,
        file: 'videos/' + path
      },
      seg: {
        x: x,
        y: y,
        cx: 640,
        cy: 360,
        z: 5,
        enable: $('#vc-enable').prop('checked') ? 1 : 0,
        mode: $('#vc-mode').prop('checked') ? 1 : 0
      }
    },
    success: function () {
      alert('Successfully configured!');
      $('#vc-dialog').hide();
    },
    error: function (xhr, status, error) {
      alert('Error when apply!');
      console.error(xhr, status, error);
    }
  });
}

function initConference() {

  //there's no logger api
  // L.Logger.setLogLevel(L.Logger.ERROR);

  if ($('#subscribe-type').val() === 'mixed') {
    subscribeType = SUBSCRIBETYPES.MIX;
    mode = MODES.LECTURE;
    $("#monitor-btn").addClass("disabled");
    $("#galaxy-btn").addClass("disabled");
  } else {
    subscribeType = SUBSCRIBETYPES.FORWARD;
    mode = MODES.GALAXY;
    $("#monitor-btn").removeClass("disabled");
    $("#galaxy-btn").removeClass("disabled");
  }

  $('#userNameDisplay').html("Logged in as: " + localName);
  hasMixed = !(subscribeType === SUBSCRIBETYPES.MIX);

  var bandWidth = 100,
    localResolution = new Ics.Base.Resolution(320, 240);
  if ($('#login-480').hasClass('selected')) {
    bandWidth = 500;
    localResolution = new Ics.Base.Resolution(640, 480);
  } else if ($('#login-720').hasClass('selected')) {
    bandWidth = 1000;
    localResolution = new Ics.Base.Resolution(1280, 720);
  }

  var avTrackConstraint = {};
  var setStream = null;
  if ($("#login-audio-video").hasClass("selected")) {
    avTrackConstraint = {
      audio: {
        source: "mic"
      },
      video: {
        resolution: localResolution,
        frameRate: 24,
        source: 'camera'
      },
    }
    setStream = true;
    console.log(avTrackConstraint);
  } else {
    avTrackConstraint = {
      audio: {
        source: "mic"
      },
      video: false
    };
    setStream = false;
  }
  isAudioOnly = !setStream;
  var isIce = $(".checkbox")[0].checked;

  function createLocal() {
    if (hasMixed) {
      let mediaStream;
      Ics.Base.MediaStreamFactory.createMediaStream(avTrackConstraint).then(stream => {
        mediaStream = stream;
        console.info('Success to create MediaStream');
        localStream = new Ics.Base.LocalStream(
          mediaStream, new Ics.Base.StreamSourceInfo(
            'mic', 'camera')
        );
        console.log(localStream);
        localId = localStream.id;
        addVideo(localStream, true);
        $('#text-send,#send-btn').show();
        room.publish(localStream).then(publication => {
          localPublication = publication;
          localPublication.mute(Ics.Base.TrackKind.AUDIO).then(
            () => {
              console.info('mute success');
            }, err => {
              console.error('mute failed');
            });
          mixStream(serviceKey, localPublication.id, 'common',serverAddress);
          console.info('publish success');
          streamObj[localStream.id] = localStream;
          publication.addEventListener('error', (err) => {
            console.error('Publication error: ' + err.error.message);
          });
        }, err => {
          console.error('Publish error: ' + err);
        });
      }, err => {
        console.error('Failed to create MediaStream, ' + err);
        if (err.name === "OverconstrainedError") {
          if (confirm("your camrea can't support the resolution constraints, please leave room and select a lower resolution")) {
            userExit();
          }
        }
      });
    } else {
      setTimeout(createLocal, 500);
    }
  }

  createTokens(localName, 'presenter', serviceKey, function (status, response) {
    if (status !== 200) {
      console.error('createTokens failed:', response, status);
      sendIm('Failed to connect to the server, please reload the page to ' +
        'try again.', 'System');
      return;
    }
    if (!room) {
      room = new Ics.Conference.ConferenceClient();
      addRoomEventListener();
    }

    room.join(response).then(resp => {
      joinResponse = resp;
      var getLoginUsers = resp.participants;
      var streams = resp.remoteStreams;
      console.log(resp);
      getLoginUsers.map(function (participant) {
        participant.addEventListener('left', () => {
          setTimeout(() => {
            deleteUser(participant.id);
            $('li').remove(":contains(" + participant.id + ")");
          }, 800);
        });
        users.push({
          id: participant.id,
          userId: participant.userId,
          role: participant.role
        });
      });
      loadUserList();

      createLocal();

      room.send(JSON.stringify({
        type: "ask"
      })).then(() => {
        console.info('ask to update mute icon');
      }, err => {
        console.error('ask failed');
      });

      streamObj = streams;

      for (const stream of streams) {
        if (stream.source.audio === 'mixed' && stream.source.video === 'mixed') {
          console.log("Mix stream id: " + stream.id);
          stream.addEventListener('layoutChanged', function (regions) {
            console.info('stream', stream.id, 'VideoLayoutChanged');
            currentRegions = regions;
          });
        }
        console.info('stream in conference:', stream.id);
        streamObj[stream.id] = stream;
        if (subscribeType === SUBSCRIBETYPES.FORWARD && stream.source.audio === 'mixed' && stream.source.video === 'mixed') {
          continue;
        } else if (subscribeType === SUBSCRIBETYPES.MIX && stream.source.audio !== 'mixed' && stream.source.video !== 'mixed' && stream.source.video !== 'screen-cast') {
          continue;
        }
        console.info('subscribing:', stream.id);
        var videoOption = (stream.source.audio === 'screen-cast' && stream.source.video === 'screen-cast') ? true : !isAudioOnly;
        room.subscribe(stream, {
          video: videoOption
        }).then(subscription => {
          console.info('subscribed: ', subscription.id);
          addVideo(stream, false);
          subList[subscription.id] = subscription;
          console.info("add success");
          streamObj[stream.id] = stream;
          if (stream.source.video === 'mixed') {
            remoteMixedSub = subscription;
          }
          if (stream.source.video === 'screen-cast') {
            screenSub = subscription;
            stream.addEventListener('ended', function (event) {
              changeMode(MODES.LECTURE);
              setTimeout(function () {
                $('#local-screen').remove();
                $('#screen').remove();
                shareScreenChanged(false, false);
                if (subscribeType === SUBSCRIBETYPES.MIX) {
                  changeMode(mode, $("div[isMix=true]"));
                } else {
                  changeMode(mode);
                }
              }, 800);
            });
          } else {
            stream.addEventListener('ended', function (event) {
              console.log(getUserFromId(stream.origin).htmlId);
              $('#client-' + getUserFromId(stream.origin).htmlId).remove();
            });
          }
          setTimeout(function () {
            subscription.getStats().then(report => {
              console.info(report);
              report.forEach(function (item, index) {
                if (item.type === 'ssrc' && item.mediaType === 'video') {
                  scaleLevel = parseInt(item.googFrameHeightReceived) / parseInt(item.googFrameWidthReceived);
                  console.info(scaleLevel);
                }
              });
              resizeStream(mode);
            }, err => {
              console.error('stats error: ' + err);
            });
          }, 1000);
          monitor(subscription);
        }, err => {
          console.error('subscribe error: ' + err);
        });
      }

    }, err => {
      console.error("server connect failed: " + err);
    });
  });
}

function monitor(subscription) {
  var bad = 0, lost = 0, rcvd = 0, lostRate = 0, bits = 0, bitRate = 0;
  var current = 0, level = 0;
  showInfo = setInterval(function () {
    subscription.getStats().then((report) => {
      var packetsLost = 0;
      var packetsRcvd = 0;
      var bitsRcvd = 0;
      report.forEach(function (item, index) {
        if (item.type === 'ssrc' && item.mediaType === 'video') {
          packetsLost = parseInt(item.packetsLost);
          packetsRcvd = parseInt(item.packetsReceived);
          bitsRcvd = parseInt(item.bytesReceived);
          bitRate = ((bitsRcvd - bits) * 8 / 1000 / 1000).toFixed(3);
          $('#rcvd').html(packetsRcvd);
          $('#lost').html(packetsLost);
          $('#bitRate').html(bitRate);
          $('#codec').html(item.googCodecName);
          lostRate = (packetsLost - lost) / (packetsRcvd - rcvd);
          lost = packetsLost;
          rcvd = packetsRcvd;
          bits = bitsRcvd;
          level = parseInt(bitRate / 0.2);
        }
        if (item.type === 'VideoBwe') {
          $('#bandwidth').html((parseInt(item.googAvailableReceiveBandwidth) / 1024 / 1024).toFixed(3));
        }
      });
    }, err => {
      console.error(err);
    })
  }, 1000);
  showLevel = setInterval(function () {
    level = level > 4 ? 4 : level;
    if (current < level) {
      current++;
      $('#wifi' + current).css('display', 'block').siblings().css('display', 'none');
    } else if (current > level) {
      current--;
      $('#wifi' + current).css('display', 'block').siblings().css('display', 'none');
    }
    if ((lostRate >= 0.12 || level < 2) && !isPauseVideo) {
      if (bad < 8) {
        bad++;
      }
    } else if (bad > 0) {
      bad--;
    }
    if (bad >= 8 && $('#promt').css('opacity') == '0') {
      $('#promt').css('opacity', '1');
    } else if (bad == 0 && $('#promt').css('opacity') == '1') {
      $('#promt').css('opacity', '0');
    }
  }, 1000);
}

function stopMonitor() {
  clearInterval(showInfo);
  clearInterval(showLevel);
}

function loadUserList() {
  for (var u in users) {
    addUserListItem(users[u], true);
  }
}

function addUserListItem(user, muted) {
  var muteBtn =
    '<img src="img/mute_white.png" class="muteShow" isMuted="true"/>';
  var unmuteBtn =
    '<img src="img/unmute_white.png" class="muteShow" isMuted="false"/>';
  var muteStatus = muted ? muteBtn : unmuteBtn;
  $('#user-list').append('<li><div class="userID">' + user.id +
    '</div><img src="img/avatar.png" class="picture"/><div class="name">' +
    user.userId + '</div>' + muteStatus + '</li>');
}

function chgMutePic(id, muted) {
  var line = $('li:contains(' + id + ')').children('.muteShow');
  if (muted) {
    line.attr('src', "img/mute_white.png");
    line.attr('isMuted', true);
  } else {
    line.attr('src', "img/unmute_white.png");
    line.attr('isMuted', false);
  }
}

function generateId() {
  return Math.floor((1 + Math.random()) * 0x10000 * 0x10000)
    .toString(16).substring(1);
}

function createTokens(userName, role, room, callback) {
  var req = new XMLHttpRequest();
  var url = serverAddress + '/tokens';
  var body = {
    user: userName,
    role: role,
    room: room
  };

  req.onreadystatechange = function () {
    if (req.readyState === 4 && typeof callback === 'function') {
      callback(req.status, req.responseText);
    }
  };

  req.open('POST', url, true);
  req.setRequestHeader('Content-Type', 'application/json');
  req.send(JSON.stringify(body));
}

function addRoomEventListener() {
  room.addEventListener('streamadded', (streamEvent) => {
    var stream = streamEvent.stream;
    console.log("a new stream added:", stream.id);
    if (subscribeType === SUBSCRIBETYPES.FORWARD && (stream.source.audio === 'mixed' && stream.source.video === 'mixed')) {
      return;
    } else if (subscribeType === SUBSCRIBETYPES.MIX && (!(stream.source.audio === 'mixed' && stream.source.video === 'mixed')
      && !(stream.source.video === 'screen-cast'))) {
      return;
    } else if (stream.source.video === 'screen-cast' && isLocalScreenSharing) {
      return;
    }
    if (localStream != null && stream.id == localStream.id) {
      return;
    }

    var thatId = stream.id;
    if (stream.source.audio === 'mixed' && stream.source.video === 'mixed') {
      thatName = "MIX Stream";
    } else if (stream.source.video === 'screen-cast') {
      thatName = "Screen Sharing";
    }

    // add video of non-local streams
    if (localId !== thatId && localScreenId !== thatId && localName !== getUserFromId(stream.origin).userId) {
      var videoOption = (stream.source.video === 'screen-cast') ? true : !isAudioOnly;
      room.subscribe(stream).then(subscription => {
        console.info('a new subscribed: ', subscription.id);
        if (stream.source.video === 'screen-cast') {
          screenSub = subscription;
          stream.addEventListener('ended', function (event) {
            changeMode(MODES.LECTURE);
            setTimeout(function () {
              $('#local-screen').remove();
              $('#screen').remove();
              shareScreenChanged(false, false);
              if (subscribeType === SUBSCRIBETYPES.MIX) {
                changeMode(mode, $("div[isMix=true]"));
              } else {
                changeMode(mode);
              }
            }, 800);
          });
        } else {
          stream.addEventListener('ended', function (event) {
            console.log(getUserFromId(stream.origin).htmlId);
            $('#client-' + getUserFromId(stream.origin).htmlId).remove();
          });
        }
        addVideo(stream, false);
        subList[subscription.id] = subscription;
        streamObj[stream.id] = stream;
      }, err => {
        console.error('subscribe error: ' + err);
      });
    }
  });

  room.addEventListener('participantjoined', (event) => {
    console.log(event);
    if (event.participant.userId !== 'user' && getUserFromId(event.participant.id) === null) {
      //new user
      users.push({
        id: event.participant.id,
        userId: event.participant.userId,
        role: event.participant.role
      });
      event.participant.addEventListener('left', () => {
        setTimeout(function () {
          if (event.participant.id !== null && event.participant.userId !== undefined) {
            sendIm(event.participant.userId + ' has left the room ', 'System');
            deleteUser(event.participant.id);
            $('li').remove(":contains(" + event.participant.id + ")");
          } else {
            sendIm('Anonymous has left the room.', 'System');
          }
        }, 800);
      });
      console.log("join user: " + event.participant.userId);
      addUserListItem(event.participant, true);
    }

  });

  room.addEventListener('messagereceived', (event) => {
    console.log(event);
    var user = getUserFromId(event.origin);
    if (!user) return;
    var receivedMsg = JSON.parse(event.message);
    if (receivedMsg.type == 'action') {
      if (receivedMsg.muted !== undefined) {
        chgMutePic(event.origin, receivedMsg.muted);
      }
    } else if (receivedMsg.type == 'msg') {
      if (receivedMsg.data != undefined) {
        var time = new Date();
        var hour = time.getHours();
        hour = hour > 9 ? hour.toString() : '0' + hour.toString();
        var mini = time.getMinutes();
        mini = mini > 9 ? mini.toString() : '0' + mini.toString();
        var sec = time.getSeconds();
        sec = sec > 9 ? sec.toString() : '0' + sec.toString();
        var timeStr = hour + ':' + mini + ':' + sec;
        var color = getColor(user.userId);
        $('<p class="' + color + '">').html(timeStr + ' ' + user.userId + '<br />')
          .append(document.createTextNode(receivedMsg.data)).appendTo('#text-content');
        $('#text-content').scrollTop($('#text-content').prop('scrollHeight'));
      }
    } else if (receivedMsg.type == 'ask') {
      room.send(JSON.stringify({
        type: "action",
        muted: isPauseAudio
      })).then(() => {
        console.info('response to ask success');
      }, err => {
        console.err('reponse to ask failed')
      });
    } else if (receivedMsg.type == 'force') {
      //be forced to mute/unmute self
      room.send(JSON.stringify({
        type: "action",
        muted: isPauseAudio
      })).then(() => {
        console.info('response to force success');
      }, err => {
        console.err('reponse to force failed')
      });
      pauseAudio();
    }
  });
}

function shareScreen() {
  if ($('#screen-btn').hasClass('disabled')) {
    return;
  }
  sendIm('You are sharing screen now.');
  $('#video-panel .largest').removeClass("largest");
  $('#video-panel').append(
    '<div id="local-screen" class="client clt-0 largest"' +
    '>Screen Sharing</div>').addClass('screen');
  changeMode(MODES.LECTURE, $('#local-screen'));
  var width = screen.width,
    height = screen.height;

  var screenSharingConfig = {
    audio: {
      source: "screen-cast"
    },
    video: {
      resolution: {
        "width": 1920,
        "height": 1080
      },
      frameRate: 20,
      source: 'screen-cast'
    },
    extensionId: 'pndohhifhheefbpeljcmnhnkphepimhe'
  }
  Ics.Base.MediaStreamFactory.createMediaStream(screenSharingConfig).then(stream => {
    localScreen = new Ics.Base.LocalStream(stream, new Ics.Base.StreamSourceInfo('screen-cast', 'screen-cast'));
    console.info(localScreen);
    localScreenId = localScreen.id;
    var screenVideoTracks = localScreen.mediaStream.getVideoTracks();
    for (const screenVideoTrack of screenVideoTracks) {
      screenVideoTrack.addEventListener('ended', function (e) {
        changeMode(MODES.LECTURE);
        console.log('unpublish');
        setTimeout(function () {
          $('#local-screen').remove();
          $('#screen').remove();
          shareScreenChanged(false, false);
          if (subscribeType === SUBSCRIBETYPES.MIX) {
            changeMode(mode, $("div[isMix=true]"));
          } else {
            changeMode(mode);
          }
        }, 800);
        localScreenPubliction.stop();
      });
    }
    changeMode(MODES.LECTURE, $('#local-screen'));
    room.publish(localScreen).then(publication => {
      console.info('publish success');
      localScreenPubliction = publication;
    }, err => {
      console.error('localsreen publish failed');
    });
  }, err => {
    console.error('create localscreen failed');
    changeMode(MODES.LECTURE);
    $('#local-screen').remove();
    $('#screen').remove();
    shareScreenChanged(false, false);
    if (window.location.protocol === "https:" && subscribeType ===
      SUBSCRIBETYPES.MIX) {
      changeMode(mode, $("div[isMix=true]"));
    }
  });

  shareScreenChanged(true, true);
}

// update screen btn when sharing
function shareScreenChanged(ifToShare, ifToLocalShare) {
  isScreenSharing = ifToShare;
  isLocalScreenSharing = ifToLocalShare;
  $('#screen-btn').removeClass('disabled selected');
  if (ifToShare) {
    if (ifToLocalShare) {
      $('#screen-btn').addClass('selected disabled');
    } else {
      $('#screen-btn').addClass('disabled');
    }
    $('#galaxy-btn,#monitor-btn').addClass('disabled');
  } else {
    if (subscribeType === SUBSCRIBETYPES.FORWARD) {
      $('#galaxy-btn,#monitor-btn').removeClass('disabled');
    }
    $('#video-panel').removeClass('screen');
  }
}

// decide next size according to previous sizes and window w and h
function getNextSize() {
  var lSum = $('#video-panel .small').length * smallRadius * smallRadius * 5;
  var sSum = $('#video-panel .large').length * largeRadius * largeRadius * 10;
  var largeP = 1 / ((lSum + sSum) / $('#video-panel').width() / $(
    '#video-panel').height() + 1) - 0.5;
  if (Math.random() < largeP) {
    return 'large';
  } else {
    return 'small';
  }
}

function addVideo(stream, isLocal) {
  // compute next html id
  var id = $('#video-panel').children('.client').length;
  while ($('#client-' + id).length > 0) {
    ++id;
  }
  var uid = stream.origin;
  if (isLocal) {
    console.log("localStream addVideo1");
  }
  else if (stream.source.audio === 'mixed' && stream.source.video === 'mixed') {
    hasMixed = true;
    console.info('hasmixed true');
  }

  // check if is screen sharing
  if (stream.source.video === 'screen-cast') {
    $('#video-panel').addClass('screen')
      .append('<div class="client" id="screen"></div>');
    $('#screen').append('<video id="remoteScreen" playsinline autoplay controls class="palyer" style="width:100%;height:100%"></video>');
    $('#remoteScreen').get(0).srcObject = stream.mediaStream;
    // stream.show('screen');
    $('#screen').addClass('clt-' + getColorId(uid))
      .children().children('div').remove();
    $('#video-panel .largest').removeClass("largest");
    $('#screen').addClass("largest");
    $('#screen').append(
      '<div class="ctrl" id="original"><a href="#" class="ctrl-btn original"></a><a href="#" class="ctrl-btn enlarge"></a><a href="#" class="ctrl-btn ' +
      'fullscreen"></a></div>').append('<div class="ctrl-name">' +
        'Screen Sharing from ' + getUserFromId(stream.origin)["userId"] + '</div>');
    $('#local-screen').remove();
    changeMode(MODES.LECTURE, !isLocalScreenSharing);
    streamObj["screen"] = stream;

  } else {
    // append to global users
    var thisUser = getUserFromId(uid) || {};
    var htmlClass = isLocal ? 0 : (id - 1) % 5 + 1;
    thisUser.htmlId = id;
    thisUser.htmlClass = thisUser.htmlClass || htmlClass;
    thisUser.id = uid;

    // append new video to video panel
    var size = getNextSize();
    $('#video-panel').append('<div class="' + size + ' clt-' + htmlClass +
      ' client pulse" ' + 'id="client-' + id + '"></div>');
    if (isLocal) {
      $('#client-' + id).append('<div class="self-arrow"></div>');
      $('#client-' + id).append('<video id="localVideo" playsinline muted autoplay controls style="position:relative"></video>')
      $('#localVideo').get(0).srcObject = stream.mediaStream;
    } else {
      $('#client-' + id).append('<video id="remoteVideo" playsinline autoplay controls style="position:relative"></video>')
      $('#remoteVideo').get(0).srcObject = stream.mediaStream;
    }

    var hasLeft = mode === MODES.GALAXY,
      element = $("#client-" + id),
      width = element.width(),
      height = element.height();
    element.find("video").css({
      width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) + "px)" : "100%",
      height: "100%",
      top: "0px",
      left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
    });
    var player = $('#client-' + id).children(':not(.self-arrow)');
    player.attr('id', 'player-' + id).addClass('player')
      .css('background-color', 'inherit');
    player.children('div').remove();
    player.attr('id', 'player-' + id).addClass('video');

    // add avatar for no video users
    if (stream.mediaStream === false) {
      player.parent().addClass('novideo');
      player.append('<img src="img/avatar.png" class="img-novideo" />');
    }

    // control buttons and user name panel
    var resize = size === 'large' ? 'shrink' : 'enlarge';
    if (stream.source.video === 'mixed') {
      var name = "Mix Stream"
    } else {
      var name = (stream === localStream) ? localName : getUserFromId(stream.origin).userId || {};
    }
    var muteBtn = "";

    if (stream.source.audio === 'mixed' && stream.source.video === 'mixed') {
      name = "MIX Stream";
      stream.hide = null;
      $("#client-" + id).attr("isMix", "true");
      document.getElementById("player-" + id).ondblclick = null;
      $("#client-" + id).find("video").attr("stream", "mix");
      $("#client-" + id).find("video").dblclick(function (e) {
        if ($('#video-' + id).attr("stream") === "mix") {
          var width = $('#video-' + id).width();
          var height = width * scaleLevel;
          var offset = ($('#video-' + id).height() - height) / 2;
          var left = (e.offsetX / width).toFixed(3);
          var top = ((e.offsetY - offset) / height).toFixed(3);
          var streamId = getStreamId(left, top);
          if (streamId && streamObj[streamId]) {
            room.subscribe(streamObj[streamId], function () {
              console.info('subscribed:', streamId);
              $('#video-' + id).attr("src", streamObj[streamId].createObjectURL());
              $('#video-' + id).attr("stream", streamId);
              stopMonitor();
              monitor(streamObj[streamId]);
            }, function (err) {
              console.error(streamId, 'subscribe failed:', err);
            });
            stream.signalOnPauseAudio();
            stream.signalOnPauseVideo();
          }
        } else {
          var forward = streamObj[$('#video-' + id).attr("stream")];
          if (forward) {
            stream.signalOnPlayVideo();
            stream.signalOnPlayAudio();
            $('#video-' + id).attr("src", stream.createObjectURL());
            $('#video-' + id).attr("stream", "mix");
            stopMonitor();
            monitor(stream);
            room.unsubscribe(forward, function (et) {
              console.info(forward.id(), 'unsubscribe stream');
            }, function (err) {
              console.error(stream.id(), 'unsubscribe failed:', err);
            });
          }
        }
      });
      muteBtn = '<a href="#" class="ctrl-btn unmute"></a>';
      player.parent().append('<div id="pause-' + id +
        '" class="pause" style="display: none; width: 100%; height: auto; position: absolute; text-align: center; font: bold 30px Arial;">Paused</canvas>'
      );
    }
    streamIndices['client-' + id] = stream.id;

    $('#client-' + id).append('<div class="ctrl">' +
      '<a href="#" class="ctrl-btn ' + resize + '"></a>' +
      '<a href="#" class="ctrl-btn fullscreen"></a>' + muteBtn + '</div>')
      .append('<div class="ctrl-name">' + name + '</div>').append(
        "<div class='noCamera'></div>");
    relocate($('#client-' + id));
    changeMode(mode);
  }

  function mouseout(e) {
    isMouseDown = false;
    mouseX = null;
    mouseY = null;
    $(this).css('transition', '0.5s');
  }
  // no animation when dragging
  $('.client').mousedown(function (e) {
    isMouseDown = true;
    mouseX = e.clientX;
    mouseY = e.clientY;
    $(this).css('transition', '0s');
  }).mouseup(mouseout).mouseout(mouseout)
    .mousemove(function (e) {
      e.preventDefault();
      if (!isMouseDown || mouseX === null || mouseY === null || mode !==
        MODES.GALAXY) {
        return;
      }
      // update position to prevent from moving outside of video-panel
      var left = parseInt($(this).css('left')) + e.clientX - mouseX;
      var border = parseInt($(this).css('border-width')) * 2;
      var maxLeft = $('#video-panel').width() - $(this).width() - border;
      if (left < 0) {
        left = 0;
      } else if (left > maxLeft) {
        left = maxLeft;
      }
      $(this).css('left', left);

      var top = parseInt($(this).css('top')) + e.clientY - mouseY;
      var maxTop = $('#video-panel').height() - $(this).height() - border;
      if (top < 0) {
        top = 0;
      } else if (top > maxTop) {
        top = maxTop;
      }
      $(this).css('top', top);

      // update data for later calculation position
      $(this).data({
        left: left,
        top: top
      });
      mouseX = e.clientX;
      mouseY = e.clientY;
    });

  // stop pulse when animation completes
  setTimeout(function () {
    $('#client-' + id).removeClass('pulse');
  }, 800);
}

function getStreamId(left, top) {
  for (var i in currentRegions) {
    if (left > currentRegions[i].left && left < (currentRegions[i].left + currentRegions[i].relativeSize) && top > currentRegions[i].top && top < (currentRegions[i].top + currentRegions[i].relativeSize)) {
      return currentRegions[i].streamID;
    }
  }
  return null;
}

function toggleIm(isToShow) {
  if (isToShow || $('#text-panel').is(":visible")) {
    $('#video-panel').css('left', 0);
  } else {
    $('#video-panel').css('left', $('#text-panel').width());
  }
  $('#text-panel').toggle();
  if ($('#im-btn').hasClass('selected')) {
    $('#im-btn').removeClass('selected');
  } else {
    $('#im-btn').addClass('selected');
  }
  changeMode(mode);
}

function relocate(element) {
  var max_loop = 1000;
  var margin = 20;
  for (var loop = 0; loop < max_loop; ++loop) {
    var r = element.hasClass('large') ? largeRadius : smallRadius;
    var w = $('#video-panel').width() - 2 * r - 2 * margin;
    var y = $('#video-panel').height() - 2 * r - 2 * margin;
    var x = Math.ceil(Math.random() * w + r + margin);
    var y = Math.ceil(Math.random() * y + r + margin);
    var others = $('.client');
    var len = others.length;
    var isFeasible = x + r < $('#video-panel').width() && y + r < $(
      '#video-panel').height();
    for (var i = 0; i < len && isFeasible; ++i) {
      var o_r = $(others[i]).hasClass('large') ? largeRadius : smallRadius;
      var o_x = parseInt($(others[i]).data('left')) + o_r;
      var o_y = parseInt($(others[i]).data('top')) + o_r;
      if ((o_x - x) * (o_x - x) + (o_y - y) * (o_y - y) <
        (o_r + r + margin) * (o_r + r + margin)) {
        // conflict
        isFeasible = false;
        break;
      }
    }
    if (isFeasible) {
      var pos = {
        'left': x - r,
        'top': y - r
      };
      element.css(pos).data('left', x - r).data('top', y - r);
      return true;
    }
  }
  // no solution
  var pos = {
    'left': x - r,
    'top': y - r
  };
  element.css(pos).data('left', x - r).data('top', y - r);
  return false;
}

function sendIm(msg, sender) {
  var time = new Date();
  var hour = time.getHours();
  hour = hour > 9 ? hour.toString() : '0' + hour.toString();
  var mini = time.getMinutes();
  mini = mini > 9 ? mini.toString() : '0' + mini.toString();
  var sec = time.getSeconds();
  sec = sec > 9 ? sec.toString() : '0' + sec.toString();
  var timeStr = hour + ':' + mini + ':' + sec;
  if (msg === undefined) {
    // send local msg
    if ($('#text-send').val()) {
      msg = $('#text-send').val();
      var sendMsgInfo = JSON.stringify({
        type: "msg",
        data: msg
      })
      $('#text-send').val('').height('18px');
      $('#text-content').css('bottom', '30px');
      sender = localId;
      console.info('ready to send message');
      // send to server
      if (localName !== null) {
        room.send(sendMsgInfo).then(() => {
          console.info('begin to send message');
          console.info(localName + 'send message: ' + msg);
        }, err => {
          console.error(localName + 'sned failed: ' + err);
        });
      }
    } else {
      return;
    }
  }

  var color = getColor(sender);
  var user = getUserFromId(sender);
  var name = user ? user['userId'] : 'System';
  if (name !== 'System') {
    $('<p class="' + color + '">').html(timeStr + ' ' + name + '<br />')
      .append(document.createTextNode(msg)).appendTo('#text-content');
    // scroll to bottom of text content
    $('#text-content').scrollTop($('#text-content').prop('scrollHeight'));
  }
}

function updateProgress() {
  if (totalTime === 0) {
    return;
  }
  var width = parseInt(curTime / totalTime * 100);
  if (width >= 100) {
    clearTimeout(progressTimeOut);
    width = 100;
  } else {
    progressTimeOut = setTimeout(updateProgress, 1000);
  }
  curTime += 1;
  $('#progress').animate({
    'width': width + '%'
  }, 500);
}

function getColorId(id) {
  var user = getUserFromId(id);
  if (user) {
    return user.htmlClass;
  } else {
    // screen stream comes earlier than video stream
    var htmlClass = users.length % 5 + 1;
    users.push({
      name: name,
      htmlClass: htmlClass
    });
    return htmlClass;
  }
}

function getColor(id) {
  var user = getUserFromId(id);
  if (user) {
    return 'clr-clt-' + user.htmlClass;
  } else {
    return 'clr-sys';
  }
}

function getUserFromName(name) {
  for (var i = 0; i < users.length; ++i) {
    if (users[i] && users[i].userId === name) {
      return users[i];
    }
  }
  return null;
}

function getUserFromId(id) {
  for (var i = 0; i < users.length; ++i) {
    if (users[i] && users[i].id === id) {
      return users[i];
    }
  }
  return null;
}

function deleteUser(id) {
  var index = 0;
  for (var i = 0; i < users.length; ++i) {
    if (users[i] && users[i].id === id) {
      index = i;
      break;
    }
  }
  users.splice(index, 1);
}

function toggleMute(id, toMute) {
  if (streamObj[streamIndices["client-" + id]]) {
    if (toMute) {
      streamObj[streamIndices["client-" + id]].disableAudio();
    } else {
      streamObj[streamIndices["client-" + id]].enableAudio();
    }
  }
}

function getColumns() {
  var col = 1;
  var cnt = $('#video-panel video').length;
  if (mode === MODES.LECTURE && !isScreenSharing) {
    --cnt;
  }
  if (cnt === 0) {
    return 0;
  }
  while (true) {
    var width = mode === MODES.MONITOR ?
      Math.floor($('#video-panel').width() / col) :
      Math.floor($('#text-panel').width() / col);
    var height = Math.floor(width * 3 / 4);
    var row = Math.floor($('#video-panel').height() / height);
    if (row * col >= cnt) {
      return col;
    }
    ++col;
  }
}

function changeMode(newMode, enlargeElement) {
  if (localStream) {
    console.log("localStream changeMode" + newMode);
  }
  switch (newMode) {
    case MODES.GALAXY:
      if ($('#galaxy-btn').hasClass('disabled')) {
        return;
      }
      mode = MODES.GALAXY;
      if (subscribeType === SUBSCRIBETYPES.FORWARD) {
        $('#galaxy-btn,#monitor-btn').removeClass('selected');
      } else {
        $('#galaxy-btn,#monitor-btn').addClass('disabled');
      }
      $('#galaxy-btn').addClass('selected');
      $('#video-panel').removeClass('monitor lecture')
        .addClass('galaxy');
      $.each($('.client'), function (key, value) {
        var d = smallRadius * 2;
        if ($(this).hasClass('large')) {
          d = largeRadius * 2;
          $(this).find('.enlarge')
            .removeClass('enlarge').addClass('shrink');
        } else {
          $(this).find('.shrink')
            .removeClass('shrink').addClass('enlarge');
        }
        var left = parseInt($(this).data('left'));
        if (left < 0) {
          left = 0;
        } else if (left > $('#video-panel').width() - d) {
          left = $('#video-panel') - d;
        }
        var top = parseInt($(this).data('top'));
        if (top < 0) {
          top = 0;
        } else if (top > $('#video-panel').height() - d) {
          top = $('#video-panel').height() - d;
        }
        $(this).css({
          left: left,
          top: top,
          width: d + 'px',
          height: d + 'px'
        }).data({
          left: left,
          top: top
        });
      });
      setTimeout(function () {
        $('.client').css("position", "absolute");
      }, 500);
      break;

    case MODES.MONITOR:
      if ($('#monitor-btn').hasClass('disabled')) {
        return;
      }
      mode = MODES.MONITOR;
      if (subscribeType === SUBSCRIBETYPES.FORWARD) {
        $('#galaxy-btn,#monitor-btn').removeClass('selected');
      } else {
        $('#galaxy-btn,#monitor-btn').addClass('disabled');
      }
      $('#monitor-btn').addClass('selected');
      $('#video-panel').removeClass('galaxy lecture')
        .addClass('monitor');
      $('.shrink').removeClass('shrink').addClass('enlarge');
      updateMonitor();
      break;

    case MODES.LECTURE:
      if ($('#lecture-btn').hasClass('disabled')) {
        return;
      }
      mode = MODES.LECTURE;
      if (subscribeType === SUBSCRIBETYPES.FORWARD) {
        $('#galaxy-btn,#monitor-btn').removeClass('selected');
      } else {
        $('#galaxy-btn,#monitor-btn').addClass('disabled');
      }
      $('#lecture-btn').addClass('selected');
      $('#video-panel').removeClass('galaxy monitor')
        .addClass('lecture');
      $('.shrink').removeClass('shrink').addClass('enlarge');
      if (typeof enlargeElement !== 'boolean') {
        var largest = enlargeElement || ($('#screen').length > 0 ? $('#screen') :
          ($('.largest').length > 0 ? $('.largest').first() : ($('.large').length >
            0 ? $('.large').first() : $('.client').first())));
        $('.client').removeClass('largest');
        largest.addClass('largest')
          .find('.enlarge').removeClass('enlarge').addClass('shrink');
      }
      updateLecture(enlargeElement);
      break;

    default:
      console.error('Illegal mode name');
  }
  if (window.location.protocol !== "https:") {
    $("#screen-btn").addClass("disabled");
  }

  // update canvas size in all video panels
  $('.player').trigger('resizeVideo');
  setTimeout(resizeStream, 500, newMode);
}

function resizeStream(newMode) {
  if (!localStream) return;
  var hasLeft = newMode === MODES.GALAXY;
  for (var temp in streamObj) {
    console.info(temp);
    var stream = streamObj[temp].id === localStream.id ? localStream :
      streamObj[temp],
      element = $("#client-" + temp),
      width = element.width(),
      height = element.height();
    console.log(element);
    if (stream.source.audio === 'screen-cast' && stream.source.video === 'screen-cast') {
      element.find("video").css({
        width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) + "px)" :
          "" + stream.width,
        height: "" + stream.height,
        top: "0px",
        left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
      });
    } else {
      element.find("video").css({
        width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) + "px)" :
          "100%",
        height: "100%",
        top: "0px",
        left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
      });
      if (element.find('.pause').length > 0) {
        element.find('.pause').css({
          width: hasLeft ? "calc(100% + " + (4 / 3 * height - width) +
            "px)" : "100%",
          height: "auto",
          top: height / 2.2 + "px",
          left: hasLeft ? -(4 / 3 * height / 2 - width / 2) + "px" : "0px"
        });
      }
      if (element.attr('ismix') === 'true') {
        $('#wifi').css('bottom', (height + scaleLevel * width) / 2 < height ? (height + scaleLevel * width) / 2 + 58 + 'px' : height + 58 + 'px');
      }
    }
  }
}

function updateMonitor() {
  var col = getColumns();
  if (col > 0) {
    $('.client').css({
      width: Math.floor($('#video-panel').width() / col),
      height: Math.floor($('#video-panel').width() / col * 3 / 4),
      top: 'auto',
      left: 'auto',
      position: "relative",
      right: "auto"
    });
  }
}

function updateLecture(hasChange) {
  if (typeof hasChange !== 'boolean') hasChange = true;
  $('.largest').css({
    width: $('#video-panel').width() - $('#text-panel').width(),
    height: $('#video-panel').height(),
    position: "absolute"
  });

  var col = isScreenSharing ? 1 : getColumns();
  var tempTop = 0;
  var tempRight = 0;
  if (!hasChange) return;
  $('.client').not('.largest').each(function (i) {
    if (i === 0) {
      tempTop = 0;
    } else if (i % col === 0) {
      tempTop += Math.floor($('#text-panel').width() / col * 3 / 4);
      tempRight = 0;
    } else {
      tempRight += Math.floor($('#text-panel').width() / col);
    }

    // if (subscribeType === SUBSCRIBETYPES.FORWARD) {
    $(this).css("position", "absolute");
    // }

    $(this).css({
      width: Math.floor($('#text-panel').width() / col),
      height: Math.floor($('#text-panel').width() / col * 3 / 4),
      right: tempRight,
      top: tempTop,
      left: "auto"
    });
  });
}

function fullScreen(isToFullScreen, element) {
  if (isToFullScreen) {
    element.addClass('full-screen');
  } else {
    element.removeClass('full-screen');
  }
}

function exitFullScreen(ctrlElement) {
  if (ctrlElement.parent().hasClass('full-screen')) {
    fullScreen(false, ctrlElement.parent());
    //        ctrlElement.find(".shrink").removeClass('shrink').addClass('enlarge');;
    //        ctrlElement.find(".unmute").before('<a href="#" class="ctrl-btn fullscreen">');
    if ((ctrlElement.parent().hasClass('small') || mode !== MODES.GALAXY) &&
      ctrlElement.parent().attr("id") == "screen") {
      ctrlElement.children('.shrink')
        .removeClass('shrink').addClass('fullscreen');
      if (isSmall) {
        ctrlElement.find(".fullscreen").before(
          '<a href="#" class="ctrl-btn enlarge">');
      }
    } else {
      ctrlElement.find(".shrink").removeClass('shrink').addClass('enlarge');;
      ctrlElement.find(".unmute").before(
        '<a href="#" class="ctrl-btn fullscreen">');
    }
    return;
  }
  switch (mode) {
    case MODES.GALAXY:
      ctrlElement.children('.shrink')
        .addClass('enlarge').removeClass('shrink').parent()
        .parent().removeClass('large').addClass('small');
      break;

    case MODES.MONITOR:
    case MODES.LECTURE:
      changeMode(MODES.LECTURE);
      break;
  }
}

// no use
function playpause() {
  var el = event.srcElement;
  if (el.getAttribute("isPause") != undefined) {
    el.innerText = "Pause Video";
    for (var tmp in room.remoteStreams) {
      var stream = room.remoteStreams[tmp];
      if (stream.id() !== localStream.id()) {
        stream.playVideo();
      } else {
        localStream.enableVideo();
      }
    }
    $(".noCamera").hide();
    el.removeAttribute("isPause");
  } else {
    el.innerText = "Play Video";
    for (var tmp in room.remoteStreams) {
      var stream = room.remoteStreams[tmp];
      if (stream.id() !== localStream.id()) {
        stream.pauseVideo();
      } else {
        localStream.disableVideo();
      }
    }
    $(".noCamera").show();
    el.setAttribute("isPause", "");
  }
}

function pauseVideo() {
  if (!isPauseVideo && localPublication !== undefined && localPublication !== null) {
    for (var temp in subList) {
      if (subList[temp] === screenSub) {
        continue;
      }
      subList[temp].mute(Ics.Base.TrackKind.VIDEO)
    }
    $('[ismix=true]').children('.video').css('display', 'none');
    $('[ismix=true]').children('.pause').css('display', 'block');
    localStream.mediaStream.getVideoTracks()[0].enabled = false;
    localPublication.mute(Ics.Base.TrackKind.VIDEO).then(
      () => {
        console.info('mute video');
        $('#pauseVideo').text("Play video");
        isPauseVideo = !isPauseVideo;
        $('#promt').css('opacity', '0');
      }, err => {
        console.error('mute video failed');
      }
    );
  } else if (localPublication !== undefined && localPublication !== null){
    $('[ismix=true]').children('.video').css('display', 'block');
    $('[ismix=true]').children('.pause').css('display', 'none');
    for (var temp in subList) {
      if (subList[temp] === screenSub) {
        continue;
      }
      subList[temp].unmute(Ics.Base.TrackKind.VIDEO)
    }
    localStream.mediaStream.getVideoTracks()[0].enabled = true;
    localPublication.unmute(Ics.Base.TrackKind.VIDEO).then(
      () => {
        console.info('unmute video');
        $('#pauseVideo').text("Pause video");
        isPauseVideo = !isPauseVideo;
      }, err => {
        console.error('unmute video failed');
      }
    );
  }
}

function pauseAudio() {
  if (!isPauseAudio && localPublication !== undefined && localPublication !== null) {
    $('#pauseAudio').text("Muting...");
    localPublication.mute(Ics.Base.TrackKind.AUDIO).then(
      () => {
        console.info('mute successfully');
        $('#pauseAudio').text("Unmute Me");
        room.send(JSON.stringify({
          type: "action",
          muted: true
        })).then(() => {
          console.info('send message for mute myself');
        }, err => {
          console.error('send message for mute myself failed');
        });
        isPauseAudio = !isPauseAudio;
      }, err => {
        console.error('mute failed');
        $('#pauseAudio').text("Mute Me");
      }
    );
  } else if (localPublication !== undefined && localPublication !== null){
    $('#pauseAudio').text("Unmuting...");
    localPublication.unmute(Ics.Base.TrackKind.AUDIO).then(
      () => {
        console.info('unmute successfully');
        $('#pauseAudio').text("Mute Me");
        room.send(JSON.stringify({
          type: "action",
          muted: false
        })).then(() => {
          console.info('send message for mute myself');
        }, err => {
          console.error('send message for mute myself failed');
        });
        isPauseAudio = !isPauseAudio;
      }, err => {
        console.error('unmute failed');
        $('#pauseAudio').text("Unmute Me");
      }
    );
  }
}

$(document).ready(function () {
  $('.buttonset>.button').click(function () {
    $(this).siblings('.button').removeClass('selected');
    $(this).addClass('selected');
  })

  // name
  if (window.location.search.slice(0, 6) === '?room=') {
    roomId = window.location.search.slice(6);
  }

  if (window.location.protocol === "https:") {
    isSecuredConnection = true;
    serverAddress = securedServerAddress;
    $('#screen-btn').removeClass('disabled');
  } else {
    isSecuredConnection = false;
    serverAddress = unsecuredServerAddress;
    $('#screen-btn').addClass('disabled');
  }

  $(document).on('click', '#pauseVideo', function () {
    pauseVideo();
  });

  $(document).on('click', '#pauseAudio', function () {
    pauseAudio();
  });

  $(document).on('click', '.original', function () {
    if (isOriginal) {
      $(this).parent().siblings().children('video').css('width', '100%');
      $(this).parent().siblings().children('video').css('height',
        '100%');
      $(this).parent().siblings().css('overflow', 'auto');
      //$(this).parent().siblings().children('video').parent().css('z-index','100');
      isOriginal = !isOriginal;
    } else {
      $(this).parent().siblings().children('video').css('width', '');
      $(this).parent().siblings().children('video').css('height', '');
      isOriginal = !isOriginal;
    }
  });

  $(document).on('click', '.shrink', function () {
    exitFullScreen($(this).parent());
    $(this).parent().parent().children('.player').trigger('resizeVideo');
    setTimeout(resizeStream, 500, mode);
  });

  $(document).on('click', '.enlarge', function () {
    switch (mode) {
      case MODES.GALAXY:
        $(this).addClass('shrink').removeClass('enlarge').parent()
          .parent().removeClass('small').addClass('large');
        break;

      case MODES.MONITOR:
      case MODES.LECTURE:
        changeMode(MODES.LECTURE, $(this).parent().parent());
        break;
    }
    $(this).parent().parent().children('.player').trigger('resizeVideo');
    setTimeout(resizeStream, 500, mode);
  });

  $(document).on('click', '.mute', function () {
    // unmute
    var id = parseInt($(this).parent().parent().attr('id').slice(7));
    toggleMute(id, false);
    $(this).addClass('unmute').removeClass('mute');
  });

  $(document).on('click', '.unmute', function () {
    // mute
    var id = parseInt($(this).parent().parent().attr('id').slice(7));
    toggleMute(id, true);
    $(this).addClass('mute').removeClass('unmute');
  });

  $(document).on('dblclick', '.muteShow', function () {
    // mute others
    var mutedID = $(this).siblings('.userID').text();
    var msg = {
      type: "force",
    };
    room.send(JSON.stringify(msg), mutedID).then(() => {
      if ($(this).attr('isMuted')) {
        $("#msgText").text("You have unmuted " + getUserFromId(mutedID).userId);
      } else {
        $("#msgText").text("You have muted " + getUserFromId(mutedID).userId);
      }
    }, err => {
      console.error("force to mute " + getUserFromId(mutedID).userId + "failed");
    });
  });

  $(document).on('click', '.fullscreen', function () {
    fullScreen(true, $(this).parent().parent());
    var enlarge = $(this).siblings('.enlarge');
    if (enlarge.length > 0) {
      enlarge.removeClass('enlarge').addClass('shrink');
      isSmall = true;
    } else if ($(this).siblings('.shrink').length === 0) {
      var unmute = $(this).parent().find(".unmute");
      if (unmute.length > 0) {
        unmute.before('<a href="#" class="ctrl-btn shrink"></a>');
      } else {
        $(this).parent().append(
          '<a href="#" class="ctrl-btn shrink"></a>');
      }
      isSmall = false;
    }
    $(this).remove();
  });

  $(document).keyup(function (event) {
    if (event.keyCode === 27 && $('.full-screen').length > 0) {
      console.log('full');
      // exit full screen when escape key pressed
      exitFullScreen($('.full-screen .ctrl'));
    }
  });

  $('#text-send').keypress(function (event) {
    if ($(this)[0].scrollHeight > $(this)[0].clientHeight) {
      $(this).height($(this)[0].scrollHeight);
      $('#text-content').css('bottom', $(this)[0].scrollHeight + 'px');
    }
    if (event.keyCode === 13) {
      event.preventDefault();
      // send msg when press enter
      sendIm();
    }
  });

  $('#login-input').keypress(function (event) {
    if (event.keyCode === 13) {
      event.preventDefault();
      login();
    }
  });

  $('.dialog--close').click(function () {
    $(this).parent().parent().hide();
  });

  $.get('config.json', function (data) {
    if (data['rooms'] === undefined) {
      alert('No room reserved!');
      return;
    }
    for (var i = 0; i < data['rooms'].length; ++i) {
      if (data['rooms'][i]['id'] === roomId) {
        if (data['rooms'][i]['key']) {
          serviceKey = data['rooms'][i]['key'];
        } else {
          serviceKey = 'forward';
        }
        $('#titleText,#login-panel>h3').text(data['rooms'][i]['title']);
        if (data['rooms'][i]['date'] && data['rooms'][i]['start-time'] &&
          data['rooms'][i]['end-time']) {
          $('#titleTime,.time').text(data['rooms'][i]['date'] +
            ' from ' + data['rooms'][i]['start-time'] + ' to ' + data[
            'rooms'][i]['end-time']);
          var s = new Date(data['rooms'][i]['date'] + ' ' + data[
            'rooms'][i]['start-time']);
          var e = new Date(data['rooms'][i]['date'] + ' ' + data[
            'rooms'][i]['end-time']);
          var now = new Date();
          totalTime = e - s <= 0 ? 0 : (e - s) / 1000;
          if (now - s <= 0) {
            curTime = 0;
          } else if (now - e >= 0) {
            curTime = totalTime;
          } else {
            curTime = (now - s) / 1000;
          }
          updateProgress();
        }
        $('#login-panel').fadeIn();
        return;
      }
    }
    // no roomId founded
    alert('Illegal room id!');
  }).fail(function (e) {
    console.log(e);
    alert(
      'Fail to load the JSON file. See press F12 to open console for more information and report to webtrc_support@intel.com.'
    );
  });

  $(window).resize(function () {
    console.log('resized');
    changeMode(mode);
  });

  checkMobile();
});

$(window).unload(function () {
  userExit();
});

function checkMobile() {
  if ((/iphone|ipod|android|ie|blackberry|fennec/).test(navigator.userAgent.toLowerCase())) {
    isMobile = true;
    $("#im-btn").hide();
    toggleIm(true);
    changeMode(MODES.MONITOR);
    $('#galaxy-btn, .button-split, #screen-btn').hide();
  }
}
