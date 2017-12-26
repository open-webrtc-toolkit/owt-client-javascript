/*global require, CryptoJS, XMLHttpRequest, Buffer*/
var ICS_REST = ICS_REST || {};

/**@namespace ICS_REST
 * @classDesc Namespace for ICS(Intel Collaboration Suite) REST API definition.
 */
/**
 * @class ICS_REST.API
 * @classDesc Server-side APIs should be called by RTC service integrators, as demostrated in sampleRTCService.js. Server-side APIs are RESTful, provided as a Node.js module. All APIs, except ICS_REST.API.init(), should not be called too frequently. These API calls carry local timestamps and are grouped by serviceID. Once the server is handling an API call from a certain serviceID, all other API calls from the same serviceID, whose timestamps are behind, would be expired or treated as invalid.<br>
We recommend that API calls against serviceID should have interval of at least 100ms. Also, it is better to retry the logic if it fails with an unexpected timestamp error.
 */
ICS_REST.API = (function(ICS_REST) {
  'use strict';
  var version = 'v1';
  var params = {
    service: undefined,
    key: undefined,
    url: undefined,
    rejectUnauthorizedCert: undefined
  };

  function calculateSignature (toSign, key) {
    var hash, hex, signed;
    hash = CryptoJS.HmacSHA256(toSign, key);
    hex = hash.toString(CryptoJS.enc.Hex);
    signed = ICS_REST.Base64.encodeBase64(hex);
    return signed;
  };

  function send(method, resource, body, onOK, onError) {
    if (!params.service) {
      if (typeof onError === 'function') {
        onError(401, 'ICS REST API is not initialized!!');
      }
      return;
    }

    var timestamp = new Date().getTime();
    var cnounce = require('crypto').randomBytes(8).toString('hex');

    var toSign = timestamp + ',' + cnounce;
    var header = 'MAuth realm=http://marte3.dit.upm.es,mauth_signature_method=HMAC_SHA256';

    var signed = calculateSignature(toSign, params.key);

    header += ',mauth_serviceid=';
    header += params.service;
    header += ',mauth_cnonce=';
    header += cnounce;
    header += ',mauth_timestamp=';
    header += timestamp;
    header += ',mauth_signature=';
    header += signed;

    var req = new XMLHttpRequest({
      rejectUnauthorized: params.rejectUnauthorizedCert
    });

    req.onreadystatechange = function() {
      if (req.readyState === 4) {
        switch (req.status) {
          case 100:
          case 200:
          case 201:
          case 202:
          case 203:
          case 204:
          case 205:
            if (typeof onOK === 'function') {
              onOK(req.responseText);
            }
            break;
          default:
            if (typeof onError === 'function') {
              onError(req.status, req.responseText);
            }
        }
      }
    };

    req.open(method, params.url + resource, true);

    req.setRequestHeader('Authorization', header);

    if (body !== undefined) {
      req.setRequestHeader('Content-Type', 'application/json');
      req.send(JSON.stringify(body));
    } else {
      req.send();
    }
  };

  /**
     * @function init
     * @desc This function completes the essential configuration.
  <br><b>Remarks:</b><br>
  Make sure you use the correct ICS_REST server url, according to the ICS_REST ssl configuration.
     * @memberOf ICS_REST.API
     * @param {string} service                       -The ID of your service.
     * @param {string} key                           -The key of your service.
     * @param {string} url                           -The URL of ICS service.
     * @param {boolean} rejectUnauthorizedCert       -Flag to determine whether reject unauthorized certificates, with value being true or false, true by default.
     * @example
  ICS_REST.API.init('5188b9af6e53c84ffd600413', '21989', 'http://61.129.90.140:3000/', true)
     */
  var init = function(service, key, url, rejectUnauthorizedCert) {
    if (typeof service !== 'string' || service === '') {
      throw new TypeError('Invalid service ID');
    }
    if (typeof key !== 'string' || key === '') {
      throw new TypeError('Invalid service key');
    }
    if (typeof url !== 'string' || url === '') {
      throw new TypeError('Invalid URL.');
    }
    if (typeof rejectUnauthorizedCert !== 'boolean' && rejectUnauthorizedCert !== undefined) {
      throw new TypeError('Invalid certificate setting');
    }
    params.service = service;
    params.key = key;
    params.url = (url.endsWith('/') ? (url + version + '/') : (url + '/' + version + '/'));
    params.rejectUnauthorizedCert = (rejectUnauthorizedCert === undefined ? true : rejectUnauthorizedCert);
  };

  // Convert a viewports object to views which is defined in MCU.
  function viewportsToViews(viewports) {
    var view = {};
    viewports.forEach(function(viewport) {
      view[viewport.name] = {
        mediaMixing: viewport.mediaMixing
      };
    });
    return view;
  }

  /**
     * @function createRoom
     * @desc This function creates a room.
     <br><b>Remarks:</b><br>
  <b>options:</b>
  <br>
  <ul>
      <li><b>mode:</b>"hybrid" for room with mixing and forward streams.</li>
      <li><b>publishLimit:</b>limiting number of publishers in the room. Value should be equal to or greater than -1. -1 for unlimited.</li>
      <li><b>userLimit:</b>limiting number of users in the room. Value should be equal to or greater than -1. -1 for unlimited.</li>
      <li><b>enableMixing:</b>control whether to enable media mixing in the room, with value choices 0 or 1.</li>
      <li><b>viewports:</b>viewport setting for mixed stream in the room if mixing is enabled. A corresponding mixed stream will be created for each viewport. Values should be an array. Each item has two properties listed as follow</li>
      <ul>
        <li><b>name:</b>the name for this viewport.</li>
        <li><b>mediaMixing:</b>media setting for mixed stream in the room if mixing is enabled. Value should be a JSON object contains two entries: "video" and "audio". Audio entry is currently not used and should be null.</li>
        <ul>
            <li>audio: null</li>
            <li>video: maxInput, resolution, quality_level, bkColor, layout, avCoordinate, crop</li>
            <ul>
                <li>maxInput is for maximum number of slots in the mix stream</li>
                <li>resolution denotes the resolution of the video size of mix stream.Valid resolution list:</li>
                    <ul>
                        <li>'sif'</li>
                        <li>'vga'</li>
                        <li>'svga'</li>
                        <li>'xga'</li>
                        <li>'hd720p'</li>
                        <li>'hd1080p'</li>
                        <li>'uhd_4k'</li>
                        <li>'r720x720'</li>
                        <li>'r720x1080'</li>
                        <li>'r1080x1920'</li>
                    </ul>
                <li>quality_level indicates the default video quality of the mix stream (choose from "bestSpeed", "betterSpeed", "standard", "betterQuality", "bestQuality").</li>
                <li>bkColor sets the background color, supporting RGB color format: {"r":red-value, "g":green-value, "b":blue-value}.</li>
                <li>layout describes video layout in mix stream</li>
                    <ul>
                        <li>"base" is the base template (choose from "void", "fluid", "lecture")</li>
                        <li>If base layout is set to 'void', user must input customized layout for the room, otherwise the video layout would be treated as invalid. </li>
                        <li>"custom" is user-defined customized video layout. Here we give out an example to show you the details of a valid customized video layout.A valid customized video layout should be a JSON string which represents an array of video layout definition. More details see [customized video layout](@ref layout) . </li>
                        <li>MCU would try to combine the two entries for mixing video if user sets both.</li>
                    </ul>
                <li>avCoordinated (0 or 1) is for disabling/enabling VAD(Voice activity detection). When VAD is applied, main pane(layout id=1) will be filled with the user stream which is the most active in voice currently.</li>
                <li>crop (0 or 1) is for disabling/enabling video cropping to fit in the region assigned to it in the mixed video.</li>
            </ul>
        </ul>
      </ul>
    </ul>
  Omitted entries are set with default values.
  All supported resolutions are list in the following table.
  @htmlonly
  <table class="doxtable">
  <caption><b>Table : Resolution Mapping for Multistreaming</b></caption>
      <tbody>
      <thead>
          <tr>
              <th><b>Base resolution</b></th>
              <th><b>Available resolution list</b></th>
          </tr>
      </thead>
          <tr>
              <td>sif</td>
              <td>{width: 320, height: 240}</td>
          </tr>
          <tr>
              <td>vga</td>
              <td>{width: 640, height: 480}</td>
          </tr>
          <tr>
              <td>svga</td>
              <td>{width: 800, height: 600}</td>
          </tr>
          <tr>
              <td>xga</td>
              <td>{width: 1024, height: 768}</td>
          </tr>
          <tr>
              <td>hd720p</td>
              <td>{width: 1280, height: 720}, {width: 640, height: 480}, {width: 640, height: 360}</td>
          </tr>
          <tr>
              <td>hd1080p</td>
              <td>{width: 1920, height: 1080}, {width: 1280, height: 720}, {width: 800, height: 600}, {width: 640, height: 480}, {width: 640, height: 360}</td>
          </tr>
          <tr>
              <td>uhd_4k</td>
              <td>{width: 3840, height: 2160}, {width: 1920, height: 1080}, {width: 1280, height: 720}, {width: 800, height: 600}, {width: 640, height: 480}</td>
          </tr>
          <tr>
              <td>r720x720</td>
              <td>{width: 720, height: 720}, {width: 480, height: 480}, {width: 360, height: 360}</td>
          </tr>
          <tr>
              <td>r720x1080</td>
              <td>{width: 720, height: 1280}, {width: 540, height: 960}, {width: 480, height: 853}, {width: 360, height: 640}, {width: 240, height: 426}, {width: 180, height: 320}, {width: 640, height: 480}, {width: 352, height: 288}</td>
          </tr>
          <tr>
              <td>r1080x1920</td>
              <td>{width: 1080, height: 1920}, {width: 810, height: 1440}, {width: 720, height: 1280}, {width: 540, height: 960}, {width: 360, height: 640}, {width: 270, height: 480}, {width: 800, height: 600}, {width: 640, height: 480}, {width: 352, height: 288}</td>
          </tr>
      </tbody>
  </table>
  @endhtmlonly
     * @memberOf ICS_REST.API
     * @param {string} name                          -Room name.
     * @param {json} options                         -Room configuration.
     * @param {function} callback                    -Callback function on success.
     * @param {function} callbackError               -Callback function on error.
     * @example
  ICS_REST.API.createRoom('myRoom', {
    mode: 'hybrid',
    publishLimit: -1,
    userLimit: 30,
    viewports: [
      {
        name: "common",
        mediaMixing: {
          video: {
            maxInput: 15,
            resolution: 'hd720p',
            quality_level: 'standard',
            bkColor: {"r":1, "g":2, "b":255},
            layout: {
              base: 'lecture',
            },
            avCoordinated: 1,
            crop: 1
          },
          audio: null
        },
      },
      {
        name: "another",
        mediaMixing: {
          video: {
            maxInput: 15,
            resolution: 'hd1080p',
            quality_level: 'standard',
            bkColor: {"r":1, "g":2, "b":255},
            layout: {
              base: 'lecture',
            },
            avCoordinated: 1,
            crop: 1
          },
          audio: null
        },
      }
    ]
  }, function (res) {
    console.log ('Room', res.name, 'created with id:', res._id);
  }, function (err) {
    console.log ('Error:', err);
  });
     */
  var createRoom = function(name, options, callback, callbackError) {
    if (!options) {
      options = {};
    }

    if (options.viewports) {
      options.views = viewportsToViews(options.viewports);
      delete options.viewports;
    }

    send('POST', 'rooms', {
      name: name,
      options: options
    }, function(roomRtn) {
      var room = JSON.parse(roomRtn);
      callback(room);
    }, callbackError);
  };

  /**
     * @function getRooms
     * @desc This function lists the rooms in your service.
     * @memberOf ICS_REST.API
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  ICS_REST.API.getRooms(function(rooms) {
    for(var i in rooms) {
      console.log('Room', i, ':', rooms[i].name);
    }
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getRooms = function(callback, callbackError) {
    send('GET', 'rooms', undefined, function(roomsRtn) {
      var rooms = JSON.parse(roomsRtn);
      callback(rooms);
    }, callbackError, );
  };

  /**
     * @function getRoom
     * @desc This function returns information on the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  ICS_REST.API.getRoom(roomID, function(room) {
    console.log('Room name:', room.name);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getRoom = function(room, callback, callbackError) {
    if (typeof room !== 'string') {
      callbackError(401, 'Invalid room ID.');
      return;
    }
    if (room.trim() === '') {
      callbackError(401, 'Empty room ID');
      return;
    }
    send('GET', 'rooms/' + room, undefined, function(roomRtn) {
      var room = JSON.parse(roomRtn);
      callback(room);
    }, callbackError);
  };

  /**
     * @function deleteRoom
     * @desc This function deletes the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID to be deleted
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var room = '51c10d86909ad1f939000001';
  ICS_REST.API.deleteRoom(room, function(result) {
    console.log ('Result:' result);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var deleteRoom = function(room, callback, callbackError) {
    send('DELETE', 'rooms/' + room, undefined, function(room) {
      callback(room);
    }, callbackError);
  };

  /**
     * @function updateRoom
     * @desc This function updates a room's configuration entirely.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {json} options                         -Room configuration. See details about options in {@link ICS_REST.API#createRoom createRoom(name, options, callback, callbackError)}.
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  ICS_REST.API.updateRoom(XXXXXXXXXX, {
    publishLimit: -1,
    userLimit: -1,
    enableMixing: 1,
    viewports: [
      {
        name: "common",
        mediaMixing: {
          video: {
            maxInput: 15,
            resolution: 'hd720p',
            quality_level: 'standard',
            bkColor: {"r":1, "g":2, "b":255},
            layout: {
              base: 'lecture',
            },
            avCoordinated: 1,
            crop: 1
          },
          audio: null
        },
      },
      {
        name: "another":,
        mediaMixing: {
          video: {
            maxInput: 15,
            resolution: 'hd1080p',
            quality_level: 'standard',
            bkColor: {"r":1, "g":2, "b":255},
            layout: {
              base: 'lecture',
            },
            avCoordinated: 1,
            crop: 1
          },
          audio: null
        },
      }
    ]
  }, function (res) {
    console.log ('Room', res._id, 'updated');
  }, function (err) {
    console.log ('Error:', err);
  });
     */

  var updateRoom = function(room, options, callback, callbackError) {
    if (options && options.viewports) {
      options.views = viewportsToViews(options.viewports);
      delete options.viewports;
    }
    send('PUT', 'rooms/' + room, (options || {}), function(roomRtn) {
      var room = JSON.parse(roomRtn);
      callback(room);
    }, callbackError);
  };

  /**
     * @function updateRoomPartially
     * @desc This function updates a room's configuration partially.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {Array.<{op: string, path: string, value: json}>} items  -Configuration item list to be updated, with format following RFC6902(https://tools.ietf.org/html/rfc6902).
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  ICS_REST.API.updateRoomPartially(XXXXXXXXXX, [
    {op: 'replace', path: 'enableMixing', value: 0},
    {op: 'replace', path: 'viewports/0/mediaMixing/video/avCoordinated', value: 1}
  ], function (res) {
    console.log ('Room', res._id, 'updated');
  }, function (err) {
    console.log ('Error:', err);
  });
     */
  var updateRoomPartially = function(room, items, callback, callbackError) {
    send('PATCH', 'rooms/' + roomId, (items || []), function(roomRtn) {
      var room = JSON.parse(roomRtn);
      callback(room);
    }, callbackError);
  };

  /*
     * * @callback onParticipantList
     * * @param {Array.<Object>} participantList
     * * @param {Object} participantList[x]          -The list of object "participantDetail" same as defined in "onParticipantDetail" callback.
  */
  /**
     * @function getParticipants
     * @desc This function lists participants currently in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {onParticipantList} callback           -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  ICS_REST.API.getParticipants(roomID, function(participants) {
    var l = JSON.parse(participants);
    console.log ('This room has ', l.length, 'participants');
    for (var i in l) {
      console.log(i, ':', l[i]);
    }
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getParticipants = function(room, callback, callbackError) {
    send('GET', 'rooms/' + room + '/participants/', undefined, function(participantsRtn) {
      var participants = JSON.parse(participantsRtn);
      callback(participants);
    }, callbackError);
  };

  /*
     * * @callback onParticipantDetail
     * * @param {Object} participantDetail           -The object containing the detailed info of the specified participant.
     * * @param {string} participantDetail.id        -The participant ID.
     * * @param {string} participantDetail.role      -The participant role.
     * * @param {string} participantDetail.user      -The user ID of the participant.
     * * @param {Object} participantDetail.permission      -The "Permission" object defined in section "3.3.1 Participant Joins a Room" in "Client-Portal Protocol" doc.
     * * @param {Array.<{id: string, type: string}>} participantDetail.published      -The stream list published by the participant.
     * * @param {Array.<{id: string, type: string}>} participantDetail.subscribed     -The subscription list initiated by the participant.
  */
  /**
     * @function getParticipant
     * @desc This function gets a participant's information from the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} participant                   -Participant ID
     * @param {onParticipantDetail} callback         -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var participantID = 'JdlUI29yjfVY6O4yAAAB';
  ICS_REST.API.getParticipant(roomID, participantID, function(participant) {
    console.log('Participant:', participant);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getParticipant = function(room, participant, callback, callbackError) {
    send('GET', 'rooms/' + room + '/participants/' + participant, undefined, function(participantRtn) {
      var p = JSON.parse(participantRtn);
      callback(p);
    }, callbackError);
  };

  /*
     * * @callback onParticipantDetail
     * * @param {Object} participantDetail           -The object containing the updated detailed info of the specified participant, same as in getParticipant.
  */
  /**
     * @function updateParticipant
     * @desc This function updates the permission of a participant in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} participant                   -Participant ID
     * @param {Array.<{op: string, path: string, value: json}>} items   -Permission item list to be updated, with format following RFC6902(https://tools.ietf.org/html/rfc6902).
     * @param {onParticipantDetail} callback         -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var participantID = 'JdlUI29yjfVY6O4yAAAB';
  ICS_REST.API.getParticipant(roomID, participantID, function(participant) {
    console.log('Participant:', participant);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var updateParticipant = function(room, participant, items, callback, callbackError) {
    send('PATCH', 'rooms/' + room + '/participants/' + participant, items, function(participantRtn) {
      var p = JSON.parse(participantRtn);
      callback(p);
    }, callbackError);
  };

  /**
     * @function dropParticipant
     * @desc This function drops a participant from a room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} participant                   -Participant ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var participantID = 'JdlUI29yjfVY6O4yAAAB';
  ICS_REST.API.dropParticipant(roomID, participantID, function(res) {
    console.log('Participant', participantID, 'in room', roomID, 'deleted');
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var dropParticipant = function(room, participant, callback, callbackError) {
    send('DELETE', 'rooms/' + room + '/participants/' + participant, undefined, function(participant) {
      callback(participant);
    }, callbackError);
  };

  /*
     * * @callback onStreamList
     * * @param {Array.<Object>} streamList
     * * @param {Object} streamList[x]               -Object "StreamInfo" defined in section "3.3.1 Participant Joins a Room" in "Client-Portal Protocol" doc.
  */
  /**
     * @function getStreams
     * @desc This function lists streams currently in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {onStreamList} callback                -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  ICS_REST.API.getStreams(roomID, function(streams) {
    var l = JSON.parse(streams);
    console.log ('This room has ', l.length, 'streams');
    for (var i in l) {
      console.log(i, ':', l[i]);
    }
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getStreams = function(room, callback, callbackError) {
    send('GET', 'rooms/' + room + '/streams/', undefined, function(streamsRtn) {
      var streams = JSON.parse(streamsRtn);
      callback(streams);
    }, callbackError);
  };

  /*
     * * @callback onStreamInfo
     * * @param {Object} streamInfo                  -Object "StreamInfo" defined in section "3.3.1 Participant Joins a Room" in "Client-Portal Protocol" doc.
  */
  /**
     * @function getStream
     * @desc This function gets a stream's information from the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} stream                        -Stream ID
     * @param {onStreamInfo} callback                -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var streamID = '878889273471677';
  ICS_REST.API.getStream(roomID, streamID, function(stream) {
    console.log('Stream:', stream);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getStream = function(room, stream, callback, callbackError) {
    send('GET', 'rooms/' + room + '/streams/' + stream, undefined, function(streamRtn) {
      var st = JSON.parse(streamRtn);
      callback(st);
    }, callbackError);
  };

  /*
     * * @callback onStreamInfo
     * * @param {Object} streamInfo                  -Object "StreamInfo" defined in section "3.3.1 Participant Joins a Room" in "Client-Portal Protocol" doc.
  */
  /**
     * @function updateStream
     * @desc This function updates a stream's given attributes in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} stream                        -Stream ID
     * @param {Array.<{op: string, path: string, value: json}>} items   -Attributes to be updated, with format following RFC6902(https://tools.ietf.org/html/rfc6902).
     * @param {onStreamInfo} callback                -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var streamID = '878889273471677';
  ICS_REST.API.updateStream(roomID, streamID, [{op: 'replace', patch: 'media/audio/status', value: 'inactive'}], function(stream) {
    console.log('Stream:', stream);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var updateStream = function(room, stream, items, callback, callbackError) {
    send('PATCH', 'rooms/' + room + '/streams/' + stream, items, function(streamRtn) {
      var st = JSON.parse(streamRtn);
      callback(st);
    }, callbackError);
  };

  /**
     * @function deleteStream
     * @desc This function deletes the specified stream from the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} stream                        -Stream ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var streamID = '878889273471677';
  ICS_REST.API.deleteStream(roomID, streamID, function(result) {
    console.log('Stream:', streamID, 'in room:', roomID, 'deleted');
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var deleteStream = function(room, stream, callback, callbackError) {
    send('DELETE', 'rooms/' + room + '/streams/' + stream, undefined, function(result) {
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onStartingStreamingInOK
     * * @param {Object} streamInfo                  -The object "StreamInfo" defined in section "3.3.1 Participant Joins a Room" in "Client-Portal Protocol" doc.
  */
  /**
   ***
     * @function startStreamingIn
     * @desc This function adds an external RTSP/RTMP stream to the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} url                           -URL of the streaming source, e.g. the source URL of IPCamera.
     * @param {Object} transport                     -Transport parameters.
     * @param {string} transport.protocol            -Transport protocol, "tcp" or "udp", "tcp" by default.
     * @param {number} transport.bufferSize          -The buffer size in bytes in case "udp" is specified, 2048 by default.
     * @param {Object} media Media requirements.
     * @param {string='auto' | boolean}  media.video -If video is required, "auto" or true or false, "auto" by default.
     * @param {string='auto' | boolean}  media.audio -If audio is required, "auto" or true or false, "auto" by default.
     * @param {onStartingStreamingInOK} callback     -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var url = 'rtsp://10.239.44.7:554/rtsp_tunnel%3Fh26x=4%26line=1';
  var transport = {
    protocol: 'udp',
    bufferSize: 2048
  };
  var media = {
    audio: 'auto',
    video: true
  };

  ICS_REST.API.startStreamingIn(roomID, url, transport, media, function(stream) {
    console.log('Streaming-In:', stream);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var startStreamingIn = function(room, url, transport, media, callback, callbackError) {
    var pub_req = {
      connection: {
        url: url,
        transportProtocol: transport.protocol,
        bufferSize: transport.bufferSize
      },
      media: media
    };
    send('POST', 'rooms/' + room + '/streaming-ins/', pub_req, function(streamRtn) {
      var st = JSON.parse(streamRtn);
      callback(st);
    }, callbackError);
  };

  /**
     * @function stopStreamingIn
     * @desc This function stops the specified external streaming-in in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} stream                        -Stream ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var streamID = '878889273471677';
  ICS_REST.API.stopStreamingIn(roomID, streamID, function(result) {
    console.log('External streaming-in:', streamID, 'in room:', roomID, 'stopped');
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var stopStreamingIn = function(room, stream, callback, callbackError) {
    send('DELETE', 'rooms/' + room + '/streaming-ins/' + stream, undefined, function(result) {
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onStreamingOutList
     * * @param {Array.<id: string, url: string, media: Object>} streamingOutList    -The list of streaming-outs.
     * * @param {Object} streamingOutList[x].media   -The media description of the streaming-out, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
  */
  /**
     * @function getStreamingOuts
     * @desc This function gets all the ongoing streaming-outs in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {onStreamingOutList} callback          -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  ICS_REST.API.getStreamingOuts(roomID, function(streamingOuts) {
    console.log('Streaming-outs:', streamingOuts);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getStreamingOuts = function(room, callback, callbackError) {
    send('GET', 'rooms/' + room + '/streaming-outs/', undefined, function(streamingOutList) {
      var result = JSON.parse(streamingOutList);
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onStartingStreamingOutOK
     * * @param {Object} streamingOutInfo              -The object containing the information of the external streaming-out.
     * * @param {string} streamingOutInfo.id         -The streaming-out ID.
     * * @param {string} streamingOutInfo.url        -The URL of the target streaming-out.
     * * @param {Object} streamingOutInfo.media      -The media description of the streaming-out, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
  */
  /**
     * @function startStreamingOut
     * @desc This function starts a streaming-out to the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {string} url                           -The URL of the target streaming-out.
     * @param {Object} media                         -The media description of the streaming-out, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
     * @param {onStartingStreamingOutOK} callback    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var url = 'rtmp://USER:PASS@localhost:1935/live';
  var media = {
    audio: {
      from: '7652773772543651'
    },
    video: {
      from: '7652773772543651',
      parameters: {
        keyFrameInterval: 2
      }
    }
  };
  ICS_REST.API.startStreamingOut(roomID, url, media, function(streamingOut) {
    console.log('Streaming-out:', streamingOut);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var startStreamingOut = function(room, url, media, callback, callbackError) {
    var options = {
      url: url,
      media: media
    };

    send('POST', 'rooms/' + room + '/streaming-outs/', options, function(streamingOutRtn) {
      var result = JSON.parse(streamingOutRtn);
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onUpdatingStreamingOutOK
     * * @param {Object} streamingOutInfo              -The object containing the information of the updated streaming-out, same as defined in onStartingStreamingOutOk.
  */
  /**
     * @function updateStreamingOut
     * @desc This function updates a streaming-out's given attributes in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} id                            -Streaming-out ID
     * @param {Array.<{op: string, path: string, value: json}>} items -Attributes to be updated, with format following RFC6902(https://tools.ietf.org/html/rfc6902).
     * @param {onUpdatingStreamingOutOk} callback    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var id = '878889273471677';
  ICS_REST.API.updateStreamingOut(roomID, id, [{op: 'replace', patch: 'media/audio/from', value: '9836636255531'}], function(subscription) {
    console.log('Subscription:', subscription);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var updateStreamingOut = function(room, id, items, callback, callbackError) {
    send('PATCH', 'rooms/' + room + '/streaming-outs/' + id, items, function(streamingOutRtn) {
      var result = JSON.parse(streamingOutRtn);
      callback(result);
    }, callbackError);
  };

  /**
     * @function stopStreamingOut
     * @desc This function stops the specified streaming-out in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} id                            -Streaming-out ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var id = '878889273471677';
  ICS_REST.API.stopStreamingOut(roomID, id, function(result) {
    console.log('Streaming-out:', id, 'in room:', roomID, 'stopped');
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var stopStreamingOut = function(room, id, callback, callbackError) {
    send('DELETE', 'rooms/' + room + '/streaming-outs/' + id, undefined, function(result) {
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onRecordingList
     * * @param {Array.<{id: string, storage: Object, media: Object}>} recordingList            -The recording list.
     * * @param {Object} recordingList[x].storage       -The storage information of the recording.
     * * @param {string} recordingList[x].storage.host  -The host-name or IP address where the recording file is stored.
     * * @param {string} recordingList[x].storage.file  -The full-path name of the recording file.
     * * @param {Object} recordingList[x].media         -The media description of the recording, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
  */
  /**
     * @function getRecordings
     * @desc This function gets the all the ongoing recordings in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {onStreamingOutList} callback          -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  ICS_REST.API.getRecordings(roomID, function(recordings) {
    console.log('Recordings:', recordings);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var getRecordings = function(room, callback, callbackError) {
    send('GET', 'rooms/' + room + '/recordings/', undefined, function(recordingList) {
      var result = JSON.parse(recordingList);
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onStartingRecordingOK
     * * @param {Object} recordingInfo               -The object containing the information of the server-side recording.
     * * @param {string} recordingInfo.id            -The recording ID.
     * * @param {Object} recordingInfo.storage       -The storage information of the recording.
     * * @param {string} recordingInfo.storage.host  -The host-name or IP address where the recording file is stored.
     * * @param {string} recordingInfo.storage.file  -The full-path name of the recording file.
     * * @param {Object} recordingInfo.media         -The media description of the recording, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
  */
  /**
     * @function startRecording
     * @desc This function starts a recording in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID.
     * @param {string='mp4' | 'mkv' | 'auto'} container -The container type of the recording file, 'auto' by default.
     * @param {Object} media                         -The media description of the recording, which must follow the definition of object "MediaSubOptions" in section "3.3.11 Participant Starts a Subscription" in "Client-Portal Protocol.md" doc.
     * @param {onStartingRecordingOK} callback       -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var container = 'mkv';
  var media = {
    audio: {
      from: '7652773772543651'
    },
    video: {
      from: '7652773772543651',
      parameters: {
        keyFrameInterval: 2
      }
    }
  };
  ICS_REST.API.startRecording(roomID, container, media, function(recording) {
    console.log('recording:', recording);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var startRecording = function(room, container, media, callback, callbackError) {
    var options = {
      container: container,
      media: media
    };

    send('POST', 'rooms/' + room + '/recordings/', options, function(recordingRtn) {
      var result = JSON.parse(recordingRtn);
      callback(result);
    }, callbackError);
  };

  /*
     * * @callback onUpdatingRecordingOK
     * * @param {Object} recordingInfo               -The object containing the information of the server-side recording, same as defined in onStartingRecordingOk.
  */
  /**
     * @function updateRecording
     * @desc This function updates a recording's given attributes in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} id                            -Recording ID
     * @param {Array.<{op: string, path: string, value: json}>} items -Attributes to be updated, with format following RFC6902(https://tools.ietf.org/html/rfc6902).
     * @param {onUpdatingRecordingOk} callback       -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var id = '878889273471677';
  ICS_REST.API.updateRecording(roomID, id, [{op: 'replace', patch: 'media/audio/from', value: '9836636255531'}], function(subscription) {
    console.log('Subscription:', subscription);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var updateRecording = function(room, id, items, callback, callbackError) {
    send('PATCH', 'rooms/' + room + '/recordings/' + id, items, function(recordingRtn) {
      var result = JSON.parse(recordingRtn);
      callback(result);
    }, callbackError);
  };

  /**
     * @function stopRecording
     * @desc This function stops the specified recording in the specified room.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} id                            -Recording ID
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var id = '878889273471677';
  ICS_REST.API.stopRecording(roomID, id, function(result) {
    console.log('Recording:', id, 'in room:', roomID, 'stopped');
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var stopRecording = function(room, id, callback, callbackError) {
    send('DELETE', 'rooms/' + room + '/recordings/' + id, undefined, function(result) {
      callback(result);
    }, callbackError);
  };

  /**
     * @function createToken
     * @desc This function creates a new token when a new participant to a room needs to be added.
     * @memberOf ICS_REST.API
     * @param {string} room                          -Room ID
     * @param {string} user                          -Participant's user ID
     * @param {string} role                          -Participant's role
     * @param {object} preference                    -Preference of this token would be used to connect through
     * @param {function} callback                    -Callback function on success
     * @param {function} callbackError               -Callback function on error
     * @example
  var roomID = '51c10d86909ad1f939000001';
  var user = 'user-id@company.com';
  var role = 'guest';
  // Only isp and region are supported in preference currently, please see server's document for details.
  var preference = {isp: 'isp', region: 'region'};
  ICS_REST.API.createToken(roomID, user, role, preference, function(token) {
    console.log ('Token created:' token);
  }, function(status, error) {
    // HTTP status and error
    console.log(status, error);
  });
     */
  var createToken = function(room, user, role, preference, callback, callbackError) {
    if (typeof room !== 'string' || typeof user !== 'string' || typeof role !== 'string') {
      if (typeof callbackError === 'function')
        callbackError(400, 'Invalid argument.');
      return;
    }
    send('POST', 'rooms/' + room + '/tokens/', {preference: preference, user: user, role: role}, callback, callbackError);
  };

  return {
    init: init,

    //Room management.
    createRoom: createRoom,
    getRooms: getRooms,
    getRoom: getRoom,
    updateRoom: updateRoom,
    updateRoomPartially: updateRoomPartially,
    deleteRoom: deleteRoom,

    //Participants management.
    getParticipants: getParticipants,
    getParticipant: getParticipant,
    updateParticipant: updateParticipant,
    dropParticipant: dropParticipant,

    //Streams management.
    getStreams: getStreams,
    getStream: getStream,
    updateStream: updateStream,
    deleteStream: deleteStream,

    //Streaming-ins management.
    startStreamingIn: startStreamingIn,
    stopStreamingIn: stopStreamingIn,

    //Streaming-outs management
    getStreamingOuts: getStreamingOuts,
    startStreamingOut: startStreamingOut,
    updateStreamingOut: updateStreamingOut,
    stopStreamingOut: stopStreamingOut,

    //Server-side recordings management
    getRecordings: getRecordings,
    startRecording: startRecording,
    updateRecording: updateRecording,
    stopRecording: stopRecording,

    //Tokens management.
    createToken: createToken
  };
}(ICS_REST));
