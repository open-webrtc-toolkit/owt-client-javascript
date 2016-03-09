var localStream, client, resolution;
var allStreams = {};

var publish = function () {};
var unpublish = function () {};
var subscribe = function () {};
var unsubscribe = function () {};
var initLocalStream = function() {};

function makeCall (option) {
  client.makeCall(option, function(msg) {
  });
}

function acceptCall () {
  client.acceptCall(function(msg) {
  });
}

function rejectCall () {
 client.rejectCall(function (msg) {
    resetCallForm();
  });
}

function hangupCall() {
 client.hangupCall(function (msg) {
    $('#hangupCall').hide();
  });
  unpublish();
  unsubscribe();
}

function resetCallForm() {
  $('#call-make').removeAttr('disabled');
  $('#call-accept').attr('disabled', 'disabled');
  $('#call-reject').attr('disabled', 'disabled');
  $('#call-form').show();
  $('#hangupCall').hide();
  $('#chat-control').hide();
}

function setWidth() {
  var width = Object.keys(allStreams).length > 1 ? vWidth/2-20 : vWidth;
  var root = $('div#gVideo').children('div');
  root.width(width);
  root.height(width/4*3);
  root.children('div').width(width);
  root.children('div').height(width/4*3);
  root.find('video').width(width);
  root.find('video').height(width/4*3);
}

function Connect (accinfo) {
  var video_ = $('#enable-video').prop('checked');
  if (video_) {
    resolution = $('#media-option .btn-group button')[0].textContent;
    if (resolution === 'Video Resolution') {
      resolution = 'unspecified';
    }
    if (typeof resolution === 'string') {
      resolution = resolution.toLowerCase();
    }
  }

  $('input#calleeURI').val("");
  resetCallForm();
  $('div#gVideo #localVideo').empty();
  client.join(accinfo,
    function(ok) {
      $('#call-make').removeAttr('disabled');
      $(function(){
        new PNotify({
          title: 'Session Info',
          text: 'register ok!',
          type: 'success',
          delay: 5000
        });
      });
    },
    function(err) {
    $(function(){
      new PNotify({
        title: 'Connection ERROR',
        text: err,
        type: 'error',
        delay: 5000
      });
    });
  });
}

function init () {
  var gateway_host = location.hostname;
  var isSecured = window.location.protocol === 'https:';
  if (isSecured) {
    gateway_host += ':8443';
  } else {
    gateway_host += ':8080';
  }

  client = Woogeen.SipClient.create({
    host: gateway_host,
    secure: isSecured,
  });

  client.on('client-disconnected', function (evt) {
    $(function(){
      new PNotify({
        title: false,
        text: 'Gateway disconnected',
        type: 'notice',
        delay: 5000
      });
    });
    unsubscribe();
    unpublish();
    localStream.close();
    $('div#gVideo #localVideo').parent().hide();
    $('#call-form').hide();
    $('#chat-control').hide();
    $('#hangupCall').hide();
    $('div#login-form').show();
    $('div#media-option').show();
  });

  client.onMessage(function (evt) {
    var msg = evt.attr;
    if (typeof msg === 'object' && msg !== null && msg.type === 'callAbort') {
      resetCallForm();
      $(function(){
        new PNotify({
          title: 'Call Abort',
          text: msg.uri,
          type: 'info'
        });
      });
      return;
    }
    $(function(){
      new PNotify({
        title: 'Message Received',
        text: msg,
        type: 'info'
      });
    });
  });

  client.on('stream-published', function (evt) {
    var stream = evt.stream;
    $(function(){
      new PNotify({
        title: 'Stream published',
        text: 'Stream Id: ' + stream.id(),
        type: 'info',
        delay: 5000
      });
    });

    unpublish = function () {
      client.unpublish(localStream, function(ok){}, function (err) {
        L.Logger.error(err);
      });
      unpublish = function () {};
    };
  });

  client.on('stream-subscribed', function(evt) {
    var stream = evt.stream;
    $(function(){
      new PNotify({
        title: 'Stream subscribed',
        text: 'Stream Id: '+stream.id(),
        type: 'success',
        delay: 5000
      });
    });
    allStreams[stream.id()] = stream;
    if ($('div#gVideo #remoteVideo'+stream.id()).length === 0) {
      $('div#gVideo').append('<div class="col-md-1 column vivid sample-video-elem"><div id="remoteVideo'+stream.id()+'"></div></div>');
    }
    setWidth();
    stream.show('remoteVideo' + stream.id());
    $('#hangupCall').show();
    $('#chat-control').show();
    unsubscribe = function () {
      client.unsubscribe(stream, function(ok) {},
        function (err) {
        L.Logger.error(err);
      });
      unsubscribe = function () {};
    };
  });

  client.on('video-paused', function (evt) {
    var stream = evt.stream;
    stream.pauseVideo();
    $(function(){
      new PNotify({
        title: 'Video paused',
        text: 'Stream Id: '+stream.Id(),
        type: 'info',
        delay: 5000
      });
    });
  });

  client.on('video-play', function (evt) {
    var stream = evt.stream;
    $(function(){
      new PNotify({
        title: 'Video playing',
        text: 'Stream Id: '+stream.id(),
        type: 'info',
        delay: 5000
      });
    });
    stream.playVideo();
  });

  client.on('audio-paused', function (evt) {
    var stream = evt.stream;
    stream.pauseAudio();
    $(function(){
      new PNotify({
        title: 'Audio paused',
        text: 'Stream Id: '+stream.id(),
        type: 'info',
        delay: 5000
      });
    });
  });

  client.on('audio-play', function (evt) {
    var stream = evt.stream;
    $(function(){
      new PNotify({
        title: 'Audio playing',
        text: 'Stream Id: '+stream.id(),
        type: 'info',
        delay: 5000
      });
    });
    stream.playAudio();
  });

  client.on('stream-added', function (evt) {
    publishLocalStream();
    var stream = evt.stream;
    remoteStream = evt.stream;
    subscribe = function () {
      client.subscribe(remoteStream, function() {
        console.log(remoteStream.id() + " subscribe ok");
      }, function (err) {
        console.log(remoteStream.id() + " subscribe failed: " + err);
      });
    };
    subscribe();
    $(function(){
      new PNotify({
        title: 'Stream added',
        text: 'Stream Id: '+stream.id(),
        type: 'info',
        delay: 5000
      });
    });
  });

  client.on('stream-removed', function (evt) {
    var stream = evt.stream;
    $(function(){
      new PNotify({
        title: 'Stream removed',
        text: 'Stream Id: '+stream.id(),
        type: 'info',
        delay: 5000
      });
    });
    delete allStreams[stream.id()];
    localStream.close();
    $('#remoteVideo'+stream.id()).parent().remove();
    unpublish();
    unsubscribe();
    setWidth();
    $('#localContainer').hide();
    resetCallForm();
  });

  client.on('user-joined', function (evt) {
    $(function(){
      new PNotify({
        title: 'New Incoming Call...',
        text: evt.user,
        type: 'info',
        delay: 5000
      });
    });
    $('#call-accept').removeAttr('disabled');
    $('#call-reject').removeAttr('disabled');
    $('#call-make').attr('disabled', 'disabled');
  });

  publishLocalStream = function() {
    Woogeen.LocalStream.create({
        video: {
          device: 'camera',
          resolution: resolution
        },
        audio: true
      },
      function (err, stream) {
        if (err) {
          return L.Logger.error('create LocalStream failed:', err);
        }
        localStream = stream;
        setWidth();
        $('#localContainer').show();
        if (window.navigator.appVersion.indexOf('Trident') < 0){
          localStream.show('localVideo');
        }
        if (window.navigator.appVersion.indexOf('Trident') > -1){
          var canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 240;
          canvas.setAttribute('autoplay', 'autoplay::autoplay');
          document.getElementById('localVideo').appendChild(canvas);
          attachMediaStream(canvas, localStream.mediaStream);
        }
        publish();
    });
  }

  publish = function () {
    L.Logger.info("Publishing....");
    var maxVideoBW = 300;
    if (resolution == 'hd720p') {
      maxVideoBW = 900; // 300 * (1280 *720) / (640 * 480)
    }
    client.publish(localStream, {maxVideoBW: maxVideoBW},
      function(ok) {
        console.log("Publish OK");
      },
      function(err) {
      $(function() {
        var notice = new PNotify({
          title: 'publish failed',
          text: err,
          type: 'error',
          hide: false
        });
        notice.get().click(function() {
          notice.remove();
        });
      });
    });
  };
};
