// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

// REST samples. It sends HTTP requests to sample server, and sample server sends requests to conference server.
// Both this file and sample server are samples.
var send = function (method, path, body, onRes, host) {
    var req = new XMLHttpRequest()
    req.onreadystatechange = function () {
        if (req.readyState === 4) {
            onRes(req.responseText);
        }
    };
    let url = generateUrl(host, path);
    req.open(method, url, true);
    req.setRequestHeader('Content-Type', 'application/json');
    if (body !== undefined) {
        req.send(JSON.stringify(body));
    } else {
        req.send();
    }
};

var generateUrl = function(host, path) {
    let url;
    if (host !== undefined) {
        url = host + path;  // Use the host user set.
    }else {
        let index = document.URL.lastIndexOf('\/');
        url = document.URL.substring(0, index) + path;  // Get the string before last '/'.
    }
    return url;
}

var onResponse = function (result) {
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

var listRooms = function (host) {
    send('GET', '/rooms/', undefined, onResponse, host);
};

var getRoom = function (room, host) {
    send('GET', '/rooms/' + room + '/', undefined, onResponse, host);
};

var createRoom = function (host) {
    send('POST', '/rooms/', {
        name: 'testNewRoom',
        options: undefined
    },
        onResponse, host);
};

var deleteRoom = function (room, host) {
    send('DELETE', '/rooms/' + room + '/', undefined, onResponse, host);
};

var updateRoom = function (room, config, host) {
    send('PUT', '/rooms/' + room + '/', config, onResponse, host);
};

var listParticipants = function (room, host) {
    send('GET', '/rooms/' + room + '/participants/', undefined, onResponse, host);
};

var getParticipant = function (room, participant, host) {
    send('GET', '/rooms/' + room + '/participants/' + participant + '/',
        undefined, onResponse, host);
};

var forbidSub = function (room, participant, host) {
    var jsonPatch = [{
        op: 'replace',
        path: '/permission/subscribe',
        value: {
            audio: false,
            video: false
        }
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/',
        jsonPatch, onResponse, host);
};

var forbidPub = function (room, participant, host) {
    var jsonPatch = [{
        op: 'replace',
        path: '/permission/publish',
        value: {
            audio: false,
            video: false
        }
    }];
    send('PATCH', '/rooms/' + room + '/participants/' + participant + '/',
        jsonPatch, onResponse, host);
};

var dropParticipant = function (room, participant, host) {
    send('DELETE', '/rooms/' + room + '/participants/' + participant + '/',
        undefined, onResponse, host);
};

var listStreams = function (room, host) {
    send('GET', '/rooms/' + room + '/streams/', undefined, onResponse, host);
};

var getStream = function (room, stream, host) {
    send('GET', '/rooms/' + room + '/streams/' + stream, undefined,
        onResponse, host);
};

var mixStream = function (room, stream, view, host) {
    var jsonPatch = [{
        op: 'add',
        path: '/info/inViews',
        value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
        onResponse, host);
};

var unmixStream = function (room, stream, view, host) {
    var jsonPatch = [{
        op: 'remove',
        path: '/info/inViews',
        value: view
    }];
    send('PATCH', '/rooms/' + room + '/streams/' + stream, jsonPatch,
        onResponse, host);
};

var setRegion = function (room, stream, region, subStream, host) {
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
                onResponse, host);
        } else {
            console.info('Invalid region');
        }
    }, host);
};

var pauseStream = function (room, stream, track, host) {
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
        onResponse, host);
};

var playStream = function (room, stream, track, host) {
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
        onResponse, host);
};

var dropStream = function (room, stream, host) {
    send('DELETE', '/rooms/' + room + '/streams/' + stream, undefined,
        onResponse, host);
};

var startStreamingIn = function (room, inUrl, host) {
    var options = {
        url: inUrl,
        media: {
            audio: 'auto',
            video: true
        },
        transport: {
            protocol: 'udp',
            bufferSize: 2048
        }
    };
    send('POST', '/rooms/' + room + '/streaming-ins', options, onResponse, host);
};

var stopStreamingIn = function (room, stream, host) {
    send('DELETE', '/rooms/' + room + '/streaming-ins/' + stream, undefined,
        onResponse, host);
};

var listRecordings = function (room, host) {
    send('GET', '/rooms/' + room + '/recordings/', undefined, onResponse, host);
};

var startRecording = function (room, audioFrom, videoFrom, container, host) {
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
    send('POST', '/rooms/' + room + '/recordings', options, onResponse, host);
};

var stopRecording = function (room, id, host) {
    send('DELETE', '/rooms/' + room + '/recordings/' + id, undefined,
        onResponse, host);
};

var updateRecording = function (room, id, audioFrom, videoFrom, host) {
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
        onResponse, host);
};

var listStreamingOuts = function (room, host) {
    send('GET', '/rooms/' + room + '/streaming-outs/', undefined, onResponse, host);
};

var startStreamingOut = function (room, outUrl, audioFrom, videoFrom, host) {
    var options = {
        media: {
            audio: {
                from: audioFrom
            },
            video: {
                from: videoFrom
            }
        },
        url: outUrl
    };
    send('POST', '/rooms/' + room + '/streaming-outs', options, onResponse, host);
};

var stopStreamingOut = function (room, id, host) {
    send('DELETE', '/rooms/' + room + '/streaming-outs/' + id, undefined,
        onResponse, host);
};

var updateStreamingOut = function (room, id, audioFrom, videoFrom, host) {
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
        onResponse, host);
};


var createToken = function (room, user, role, callback, host) {
    var body = {
        room: room,
        user: user,
        role: role
    };
    send('POST', '/tokens/', body, callback, host);
};
