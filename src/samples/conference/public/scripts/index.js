// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';
var conference;

const runSocketIOSample = function() {

    let localStream;
    let showedRemoteStreams = [];
    let myId;
    let subscriptionForMixedStream;
    let myRoom;

    function getParameterByName(name) {
        name = name.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(
            /\+/g, ' '));
    }

    var subscribeForward = getParameterByName('forward') === 'true'?true:false;

    conference = new Ics.Conference.ConferenceClient();
    function renderVideo(stream){
        conference.subscribe(stream)
        .then((subscriptions)=>{
           let $video = $('<video controls autoplay width="320" height="240">this browser does not supported video tag</video>');
           $video.get(0).srcObject = stream.mediaStream;
           $('body').append($video);
        }, (err)=>{ console.log('subscribe failed', err);
        });
    }
    function subscribeDifferentResolution(stream, resolution) {
        subscriptionForMixedStream.stop();
        subscriptionForMixedStream = null;
        const videoOptions = {};
        videoOptions.resolution = resolution;
        conference.subscribe(stream, {
            audio: true,
            video: videoOptions
        }).then((
            subscription) => {
            subscriptionForMixedStream = subscription;
            $('.remote video').get(0).srcObject = stream.mediaStream;
        });
    }

    conference.addEventListener('streamadded', (event) => {
        console.log('A new stream is added ', event.stream.id);
        subscribeForward &&  renderVideo(event.stream);
        mixStream(myRoom, event.stream.id, 'common');
        event.stream.addEventListener('ended', () => {
            console.log(event.stream.id + ' is ended.');
        });
    });


    window.onload = function() {
        var myResolution = getParameterByName('resolution') || {
            width: 1280,
            height: 720
        };
        var shareScreen = getParameterByName('screen') || false;
        myRoom = getParameterByName('room');
        var isHttps = (location.protocol === 'https:');
        var mediaUrl = getParameterByName('url');
        var isPublish = getParameterByName('publish');
        createToken(myRoom, 'user', 'presenter', function(response) {
            var token = response;
            conference.join(token).then(resp => {
                myId = resp.self.id;
                myRoom = resp.id;
                if(mediaUrl){
                     startStreamingIn(myRoom, mediaUrl);
                }
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
                }
                var streams = resp.remoteStreams;
                for (const stream of streams) {
                    if(!subscribeForward){
                      if (stream.source.audio === 'mixed' || stream.source.video ===
                        'mixed') {
                        conference.subscribe(stream, {
                            audio: {codecs:[{name:'opus'}]},
                            video: true
                        }).then((subscription) => {
                            subscriptionForMixedStream = subscription;
                            $('.remote video').get(0).srcObject = stream.mediaStream;
                            subscription.addEventListener('error', (err) => {
                                console.log('Subscription error: ' + err.error.message);
                            })
                        });
                        for (const resolution of stream.capabilities.video.resolutions) {
                            const button = $('<button/>', {
                                text: resolution.width + 'x' +
                                    resolution.height,
                                click: () => {
                                    subscribeDifferentResolution(stream, resolution);
                                }
                            });
                            button.appendTo($('#resolutions'));
                        };
                      }
                    }else if(stream.source.audio !== 'mixed'){
                        subscribeForward && renderVideo(stream);
                    }
                }
                console.log('Streams in conference:', streams.length);
                var participants = resp.participants;
                console.log('Participants in conference: ' + participants.length);
            }, function(err) {
                console.error('server connection failed:', err);
            });
        });
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
        send('POST', '/rooms/', {
                name: 'testNewRoom',
                options: undefined
            },
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
            value: {
                audio: false,
                video: false
            }
        }];
        send('PATCH', '/rooms/' + room + '/participants/' + participant + '/',
            jsonPatch, onResponse);
    };

    var forbidPub = function(room, participant) {
        var jsonPatch = [{
            op: 'replace',
            path: '/permission/publish',
            value: {
                audio: false,
                video: false
            }
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
        send('GET', '/rooms/' + room + '/streams/' + stream, undefined, function(stJSON) {
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
