// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';
var conference;
var publicationGlobal;
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

    conference = new Oms.Conference.ConferenceClient();
    function renderVideo(stream){
        conference.subscribe(stream)
        .then((subscriptions)=>{
           let $video = $(`<video controls autoplay id=${stream.id} width="320" height="240">this browser does not supported video tag</video>`);
           $video.get(0).srcObject = stream.mediaStream;
           $('body').append($video);
        }, (err)=>{ console.log('subscribe failed', err);
        });
        stream.addEventListener('ended', () => {
            removeUi(stream.id);
        });
    }
    function removeUi(id){
        $(`#${id}`).remove();
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
                    const audioConstraintsForMic = new Oms.Base.AudioTrackConstraints(Oms.Base.AudioSourceInfo.MIC);
                    const videoConstraintsForCamera = new Oms.Base.VideoTrackConstraints(Oms.Base.VideoSourceInfo.CAMERA);
                    let mediaStream;
                    Oms.Base.MediaStreamFactory.createMediaStream(new Oms.Base.StreamConstraints(
                        audioConstraintsForMic, videoConstraintsForCamera)).then(stream => {
                        mediaStream = stream;
                        localStream = new Oms.Base.LocalStream(
                            mediaStream, new Oms.Base.StreamSourceInfo(
                                'mic', 'camera'));
                        $('.local video').get(0).srcObject = stream;
                        conference.publish(localStream).then(publication => {
                            publicationGlobal = publication;
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
};
window.onbeforeunload = function(event){
    conference.leave()
    publicationGlobal.stop();
}
