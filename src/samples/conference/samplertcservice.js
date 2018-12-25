// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

const express = require('express');
const fs = require('fs');
const https = require('https');
const app = express();
const bodyParser = require('body-parser')

const rest = require('./icsrest');
const cipher = require('./cipher');

// Directory 'public' for static files
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());

// Prepare sample room before start-up
const icsREST = { API: rest };
icsREST.API.init('_service_ID_', '_service_KEY_', 'http://localhost:3000/', true);

const request = rest.request;

const prepareSampleRoom = new Promise((onOk, onError) => {
  const checkResponse = (resp) => {
    const rooms = JSON.parse(resp);
    let sampleRoomId = null;
    // Find sample room
    for (const room of rooms) {
      if (room.name === 'sampleRoom') {
        sampleRoomId = room._id;
        break;
      }
    }
    if (sampleRoomId) {
      onOk(sampleRoomId);
    } else {
      // Try create
      const createBody = JSON.stringify({
        name: 'sampleRoom',
        options: {}
      });
      const createOk = (resp) => {
        onOk(JSON.parse(resp)._id);
      };
      request('POST', '/v1/rooms', createBody, createOk, onError);
    }
  };

  request('GET', '/v1/rooms?page=1&per_page=100', null, checkResponse, onError);
});

function onRequestFail(err) {
  console.log('Request Fail:', err);
}

prepareSampleRoom
.then((sampleRoom) => {
  console.log('Get sampleRoom Id:', sampleRoom);
  //// Legacy Interface Begin
  app.get('/getUsers/:room', function(req, res) {
    request('GET', '/v1/rooms/' + req.params.room + '/participants')
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.post(['/createToken/', '/tokens/'], function(req, res) {
    const room = req.body.room || sampleRoom;
    const tokenBody = JSON.stringify({
      //FIXME: The actual *ISP* and *region* info should be retrieved
      // from the *req* object and filled in the following 'preference' data
      preference: {isp: 'isp', region: 'region'},
      user: req.body.user,
      role: req.body.role
    });
    request('POST', '/v1/rooms/' + room + '/tokens/', tokenBody)
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.post('/createRoom/', function(req, res) {
    request('POST', '/v1/rooms/', JSON.stringify(req.body))
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.get('/getRooms/', function(req, res) {
    request('GET', '/v1/rooms/')
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.get('/getRoom/:room', function(req, res) {
    request('GET', '/v1/rooms/' + req.params.room)
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.get('/room/:room/user/:user', function(req, res) {
    const room = req.params.room;
    const user = req.params.user;
    request('GET', '/v1/rooms/' + room + '/participants/' + user)
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.delete('/room/:room/user/:user', function(req, res) {
    const room = req.params.room;
    const user = req.params.user;
    request('DELETE', '/v1/rooms/' + room + '/participants/' + user)
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  app.delete('/room/:room', function(req, res) {
    request('DELETE', '/v1/rooms/' + req.params.room)
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });
  //// Legacy Interface End

  // Route version 1 interface
  app.use(function(req, res) {
    request(req.method, '/v1' + req.path, JSON.stringify(req.body))
      .then((icsRes) => {
        res.writeHead(icsRes.statusCode, icsRes.headers);
        icsRes.pipe(res);
      })
      .catch(onRequestFail);
  });

  // Start HTTP server
  app.listen(3001);

  // Start HTTPS server
  cipher.unlock(cipher.k, 'cert/.woogeen.keystore', function cb(err, obj) {
    if (!err) {
      try {
        https.createServer({
          pfx: fs.readFileSync('cert/certificate.pfx'),
          passphrase: obj.sample
        }, app).listen(3004);
      } catch (e) {
        err = e;
      }
    }
    if (err) {
      console.error('Failed to setup secured server:', err);
      process.exit();
    }
  });

})
.catch((e) => {
  console.log('Failed to intialize sampleRoom', e);
});
