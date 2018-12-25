// MIT License
//
// Copyright (c) 2012 Universidad Politécnica de Madrid
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0


var send = function (method, entity, body, okCallback, errCallback) {
    var req = new XMLHttpRequest();
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            if (req.status === 200) {
                okCallback(req.responseText);
            } else {
                errCallback(req.responseText);
            }
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

var onRespone = function (result) {
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

var listRooms = function (ok_cb, err_cb) {
    send('GET', '/rooms/', undefined, ok_cb, err_cb);
};

var getRoom = function (room, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/', undefined, ok_cb, err_cb);
};

var createRoom = function (name = 'testNewRoom', options, ok_cb, err_cb) {
    //options.name = name;
    send('POST', '/rooms/', {
        name: name,
        options: options
    }, ok_cb, err_cb);
};

var deleteRoom = function (room, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/', undefined, ok_cb, err_cb);
};

var updateRoom = function (room, config, ok_cb, err_cb) {
    send('PUT', '/rooms/' + room + '/', config, ok_cb, err_cb);
};

var listParticipants = function (room, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/participants/', undefined, ok_cb, err_cb);
};

var getParticipant = function (room, participant, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/participants/' + participant + '/', undefined, ok_cb, err_cb);
};

function getForbidOptions() {
    let audio = $('#audioforbidoptions').val() === 'false' ? false : true;
    let video = $('#videoforbidoptions').val() === 'false' ? false : true;
    return { audio, video }
}
var forbidSub = function (room, participant, ok_cb, err_cb) {
    let { audio, video } = getForbidOptions();
    var jsonPatch = [{
        op: 'replace',
        path: '/permission/subscribe',
        value: {
            audio: audio,
            video: video
        }
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/', jsonPatch, ok_cb, err_cb);
};

var forbidPub = function (room, participant, ok_cb, err_cb) {
    let { audio, video } = getForbidOptions();
    var jsonPatch = [{
        op: 'replace',
        path: '/permission/publish',
        value: {
            audio: audio,
            video: video
        }
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/', jsonPatch, ok_cb, err_cb);
};

var dropParticipant = function (room, participant, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/participants/' + participant + '/', undefined, ok_cb, err_cb);
};

var listStreams = function (room, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/streams/', undefined, ok_cb, err_cb, onerror);
};

var getStream = function (room, stream, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/streams/' + stream, undefined, ok_cb, err_cb);
};

var mixStream = function (room, stream, view, ok_cb, err_cb) {
    var jsonPatch = [{
        op: 'add',
        path: '/info/inViews',
        value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, ok_cb, err_cb);
};

var unmixStream = function (room, stream, view, ok_cb, err_cb) {
    var jsonPatch = [{
        op: 'remove',
        path: '/info/inViews',
        value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, ok_cb, err_cb);
};

var setRegion = function (room, stream, region, subStream, ok_cb, err_cb) {
    var jsonPatch = [{
        op: 'replace',
        path: `/info/layout/${region}/stream`,
        value: subStream
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, ok_cb, err_cb);
};

var pauseStream = function (room, stream, track, ok_cb, err_cb) {
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
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, ok_cb, err_cb);
};

var playStream = function (room, stream, track, ok_cb, err_cb) {
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
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch, ok_cb, err_cb);
};

var dropStream = function (room, stream, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/streams/' + stream, undefined, ok_cb, err_cb);
};

var startStreamingIn = function (room, url, ok_cb, err_cb) {
    var options = {
        url: url,
        media: {
            audio: 'auto',
            video: true
        },
        transport: {
            protocol: 'tcp',
            bufferSize: 4096
        }
    };
    send('POST', '/rooms/' + room + '/streaming-ins', options, ok_cb, err_cb);
};

var stopStreamingIn = function (room, stream, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/streaming-ins/' + stream, undefined, ok_cb, err_cb);
};

var listRecordings = function (room, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/recordings/', undefined, ok_cb, err_cb);
};

var startRecording = function (room, options, ok_cb, err_cb) {
    send('POST', '/rooms/' + room + '/recordings', options, ok_cb, err_cb);
};

var stopRecording = function (room, id, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/recordings/' + id, undefined, ok_cb, err_cb);
};

var updateRecording = function (room, id, updateOptions, ok_cb, err_cb) {
    send('PATCH', '/rooms/' + room + '/recordings/' + id, updateOptions, ok_cb, err_cb);
};

var listStreamingOuts = function (room, ok_cb, err_cb) {
    send('GET', '/rooms/' + room + '/streaming-outs/', undefined, ok_cb, err_cb);
};

var startStreamingOut = function (room, url, mediaOptions, ok_cb, err_cb) {
    var options = {
        media: mediaOptions,
        url: url
    };
    send('POST', '/rooms/' + room + '/streaming-outs', options, ok_cb, err_cb);
};

var stopStreamingOut = function (room, id, ok_cb, err_cb) {
    send('DELETE', '/rooms/' + room + '/streaming-outs/' + id, undefined, ok_cb, err_cb);
};

var updateStreamingOut = function (room, id, updateOptions, ok_cb, err_cb) {
    send('PATCH', '/rooms/' + room + '/streaming-outs/' + id, updateOptions, ok_cb, err_cb);
};

var createToken = function (room, user, role, ok_cb, err_cb) {
    var body = {
        room: room,
        user: user,
        role: role
    };
    send('POST', '/tokens/', body, ok_cb, err_cb);
};



function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results == null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
let resolutionName2Value = {
    'cif': {
        width: 352,
        height: 288
    },
    'vga': {
        width: 640,
        height: 480
    },
    'svga': {
        width: 800,
        height: 600
    },
    'xga': {
        width: 1024,
        height: 768
    },
    'r640x360': {
        width: 640,
        height: 360
    },
    'hd720p': {
        width: 1280,
        height: 720
    },
    'sif': {
        width: 320,
        height: 240
    },
    'hvga': {
        width: 480,
        height: 320
    },
    'r480x360': {
        width: 480,
        height: 360
    },
    'qcif': {
        width: 176,
        height: 144
    },
    'r192x144': {
        width: 192,
        height: 144
    },
    'hd1080p': {
        width: 1920,
        height: 1080
    },
    'uhd_4k': {
        width: 3840,
        height: 2160
    },
    'r360x360': {
        width: 360,
        height: 360
    },
    'r480x480': {
        width: 480,
        height: 480
    },
    'r720x720': {
        width: 720,
        height: 720
    },
    'r1080x1920': {
        width: 1080,
        height: 1920
    },
    'r720x1280': {
        width: 720,
        height: 1280
    },
    'invaild': {
        width: 333,
        height: 222
    },
    'unbelievable': {
        width: 1111,
        height: 100,
    },
};
let defaultRoomId = '',
    role = '',
    isPublish,
    resolution = '',
    videoCodec = '',
    audioCodec = '',
    hasVideo,
    hasAudio,
    isJoin,
    isSignaling,
    mix;
let {
    LocalStream,
    MediaStreamFactory,
    StreamSourceInfo,
    StreamConstraints,
    MediaStreamDeviceConstraints,
    AudioTrackConstraints,
    VideoTrackConstraints,
    Resolution,
} = Oms.Base, {
    ConferenceClient,
    SioSignaling
} = Oms.Conference;
let client = new ConferenceClient(),
    localScreenStream,
    remoteMixedStream,
    publicationCamera,
    paublicationScreen,
    subscriptions = [],
    participansGlobal;

defaultRoomId = getParameterByName("room") || defaultRoomId;
role = getParameterByName('role') || 'presenter';
isPublish = getParameterByName('publish') === 'false' ? false : true;
resolution = resolutionName2Value[getParameterByName('resolution') || 'hd720p'];
videoCodec = getParameterByName('videoCodec') || 'h264CB';
audioCodec = getParameterByName('audioCodec') || 'opus';
hasVideo = getParameterByName('hasVideo') === 'false' ? false : true;
hasAudio = getParameterByName('hasAudio') === 'false' ? false : true;
isJoin = getParameterByName('join') === 'false' ? false : true;
mix = getParameterByName('mix') === 'false' ? false : true;
isSignaling = getParameterByName('signaling') === 'true' ? true : false;
videoMaxBitrate = parseInt(getParameterByName('videoMaxBitrate')) || 800;
audioMaxBitrate = parseInt(getParameterByName('audioMaxBitrate')) || undefined;
hasForward = getParameterByName('forward') === 'false' ? false : true;
hasMixed = getParameterByName('mixed') === 'false' ? false : true;

function displayStream(stream, $videoTag) {
    $videoTag.attr('title', stream.id).get(0).srcObject = stream.mediaStream;
}
function displayRemoteStream(stream) {
    let source = stream.source.video || stream.source.audio;
    if (source === 'mixed') {
        displayStream(stream, $('.remotemixedstream'));
    } else if (source === 'screen-cast') {
        displayStream(stream, $('.remotemixedstream'));
        displayStream(remoteMixedStream, $('.screensharing'));
    }
}

function getAudioAndVideoCodec(audioCodecName, videoCodecName) {
    let audioCodec, videoCodec;
    switch (audioCodecName) {
        case 'g722-1':
            audioCodec = {
                name: 'g722',
                channelCount: 1,
            }
            break;
        case 'g722-2':
            audioCodec = {
                name: 'g722',
                channelCount: 2,
            }
            break;
        case 'isac16':
            audioCodec = {
                name: 'isac',
                clockRate: 16000,
            }
            break;
        case 'isac32':
            audioCodec = {
                name: 'isac',
                clockRate: 32000,
            }
            break;
        case 'opus':
            audioCodec = {
                name: "opus",
                channelCount: 2,
                clockRate: 48000
            }
            break;
        default:
            audioCodec = {
                name: audioCodecName,
            }
            break;
    }

    switch (videoCodecName) {
        case 'h264H':
            videoCodec = {
                name: 'h264',
                profile: 'high',
            }
            break;
        case 'h264CB':
            videoCodec = {
                name: 'h264',
                profile: 'CB',
            }
            break;
        default:
            videoCodec = {
                name: videoCodecName,
            }
            break;
    }

    return {
        audioCodec,
        videoCodec,
    }
}
function appendUser(participantId) {
    $('.userlist').append(`<li>${participantId}</li>`);
}
function removeUser(participantId) {
    let children = $('.userlist').children();
    children.each((_, child) => {
        child = $(child);
        if (child.text() === participantId) {
            child.remove();
        }
    })

}
(function (client) {
    let streamaddedListener = (eve) => {
        let remoteStream = eve.stream;
        console.log(`new stream added ${remoteStream.id}`);
        let source = remoteStream.source.video || remoteStream.source.audio;
        source === 'screen-cast' && subscribeStream(remoteStream);
    },
        participantjoinedListener = (eve) => {
            let participant = eve.participant;
            appendUser(participant.id);
            participansGlobal.push(participant);
            participant.addEventListener('left', (event) => {
                removeUser(participant.id);
            })
            console.log('new participant joined:', participant);
        },
        messagereceivedListener = (eve) => {
            console.log('new message received: ', eve);
            $('#allcontent').append(`${eve.origin}: ${eve.message} <br/>`);
        }
    serverdisconnectedListener = () => {
        console.log('server disconnected');
    };
    client.addEventListener("streamadded", streamaddedListener);
    client.addEventListener('participantjoined', participantjoinedListener);
    client.addEventListener('messagereceived', messagereceivedListener);
    client.addEventListener("serverdisconnected", serverdisconnectedListener);
})(client);

function subscribeStream(stream) {
    let audio = stream.source.audio ? true : false;
    let video = stream.source.video ? true : false;
    client.subscribe(stream, {
        audio: audio,
        video: video,
    })
        .then((subscription) => {
            console.log(`subscribe ${stream.id} success: ${stream.id}`);
            subscriptions.push(subscription);
            displayRemoteStream(stream);
        }, (err) => {
            console.log(`subscribe ${stream.id} failed: ${err}`);
        })
}

function controlVideo() {
    $ctrlVdieo = $('#controlvideo');
    let track = 'video';
    if ($ctrlVdieo.text() === 'pause video') {
        publicationCamera.mute(track).then(() => {
            subscriptions.forEach(item => {
                item.mute(track).then(() => {
                    $ctrlVdieo.text('play video');
                })
            })
        });
    } else {
        publicationCamera.unmute(track).then(() => {
            subscriptions.forEach(item => {
                item.unmute(track).then(() => {
                    $ctrlVdieo.text('pause video');
                })
            })
        });
    }

}

function controlAudio() {
    $ctrlAudio = $('#controlaudio');
    let track = 'audio';
    if ($ctrlAudio.text() === 'unmute') {
        publicationCamera.unmute(track).then(() => {
            $ctrlAudio.text('mute');
        });
    } else {
        publicationCamera.mute(track).then(() => {
            $ctrlAudio.text('unmute');
        });
    }
}

function screenSharing() {
    let extensionId = $('#extensionid').val();
    if ($('#screensharing').text() === 'screen sharing') {
        if (!extensionId) alert('Input your extension id');
        let resolution = {
            width: screen.width,
            height: screen.height,
        };
        MediaStreamFactory.createMediaStream({
            audio: false,
            video: {
                resolution: resolution,
                frameRate: undefined,
                source: 'screen-cast',
            },
            extensionId: extensionId,
        })
            .then((mediaStream) => {
                console.log('media stream is', mediaStream);
                localScreenStream = new LocalStream(mediaStream, { audio: undefined, video: 'screen-cast' });
                console.log('screen stream is:', localScreenStream);
                let { audioCodec: audio, videoCodec: video } = getAudioAndVideoCodec(audioCodec, videoCodec);
                let publishOputions = {
                    audio: false,
                    video: [{
                        codec: video,
                        maxBitrate: videoMaxBitrate,
                    }]
                }
                client.publish(localScreenStream, publishOputions)
                    .then((publication) => {
                        console.log('publish success:', publication);
                        paublicationScreen = publication;
                        $('#screensharing').text('stop screen sharing');
                    }, err => {
                        console.log('publish failed', err);
                    })
            }, (err) => {
                console.log('create screen stream failed: ', err);
            })
    } else {
        paublicationScreen.stop();
        localScreenStream.mediaStream.getTracks().forEach(track => {
            track.stop();
            if (!localScreenStream.mediaStream.active) {
                $('#screensharing').text('screen sharing');
            }
        });
    }

}

document.onkeydown = function () {
    if (window.event.keyCode === 13) {
        let message = $('#sendcontent').val();
        if (message) {
            client.send(message)
                .then(() => {
                    console.log(`send message to  success`);
                    $('#sendcontent').val('');
                }, (err) => {
                    console.log(`send message to failed`, err);
                })
        }
    }
}

window.onload = function () {
    let { audioCodec: audio, videoCodec: video } = getAudioAndVideoCodec(audioCodec, videoCodec);
    let publishOputions = {
        audio: [{
            codec: audio,
            maxBitrate: audioMaxBitrate,
        }],
        video: [{
            codec: video,
            maxBitrate: videoMaxBitrate,
        }]
    }
    listRooms(rooms => {
        rooms = JSON.parse(rooms);
        console.log('list all rooms', rooms);
        rooms.forEach(room => {
            if (room.name === 'sampleRoom') {
                defaultRoomId = defaultRoomId || room._id;
            }
        })
        if (defaultRoomId) {
            createToken(defaultRoomId, 'testuser', role, (token) => {
                client.join(token)
                    .then((resp) => {
                        console.log('join success:', resp);
                        let {
                            participants,
                            remoteStreams
                        } = resp;
                        participansGlobal = participants;
                        participansGlobal.forEach(participant => {
                            appendUser(participant.id);
                            participant.addEventListener('left', (event) => {
                                removeUser(participant.id);
                            })
                        })
                        //subscribe remote streams.
                        remoteStreams.forEach((stream) => {
                            subscribeStream(stream);
                            !stream.origin && (remoteMixedStream = stream);
                        })
                        MediaStreamFactory.createMediaStream({
                            audio: {
                                source: 'mic',
                                deviceId: undefined,
                                volume: undefined,
                                sampleRate: undefined,
                                channelCount: undefined,
                            },
                            video: {
                                resolution: resolution,
                                frameRate: undefined,
                                deviceId: undefined,
                                source: 'camera',
                            }
                        })
                            .then((mediaStream) => {
                                console.log('media stream is', mediaStream);
                                return new LocalStream(mediaStream, new StreamSourceInfo('mic', 'camera'), { attributes: 'test attributes' });
                            }, (err) => {
                                console.log('create media stream failed: ', err);
                            })
                            .then((localStream) => {
                                console.log('local stream is:', localStream);
                                displayStream(localStream, $('.localcamera'));
                                client.publish(localStream, publishOputions)
                                    .then((publication) => {
                                        console.log('publish success:', publication);
                                        publicationCamera = publication;
                                        mixStream(defaultRoomId, publication.id, 'common', (resp) => {
                                            resp = JSON.parse(resp);
                                            console.log(`mix stream ${publication.id} to common success: `, resp);
                                        }, err => {
                                            console.log(`mix stream ${publication.id} to common failed: `, err);
                                        })
                                    })
                            }, err => {
                                console.log('create local stream failed:', err);
                            });
                    }, (err) => {
                        console.log('join failed', err);
                    })
            });
        } else {
            console.error('There is no sampleRoom in the server');
        }
    });




};
window.onbeforeunload = function () {
    client && client.leave();
    publicationCamera.stop();
    paublicationScreen.stop();
    subscriptions.forEach(subscription=>{
        subscription.stop();
    })
}