const express = require('express');
const http = require('http');
const cors = require('cors');

const webapp = express();
webapp.use(express.json()); // to support JSON-encoded bodies
webapp.use(express.urlencoded()); // to support URL-encoded bodies
webapp.use(cors());

const httpServer = http.createServer({}, webapp);
httpServer.listen(7081);

let iceParameters = {
  usernameFragment: '',
  password: ''
};
let iceCandidates = [];
let quicKey;
let serverIceParameters={
  usernameFragment: '',
  password: ''
};
let serverCandidates=[];

webapp.put('/rest/client', (req, res) => {
  // req.body is expected to be [{name: string for role name, type: string for device type}].
  iceParameters = req.body.iceParameters;
  iceCandidates = req.body.iceCandidates;
  quicKey = req.body.quicKey;
  return res.send(200);
});

webapp.get('/rest/client', (req, res) => {
  return res.send(200, {
    parameters: iceParameters,
    candidates: iceCandidates,
    quicKey: quicKey
  });
});

webapp.get('/rest/client/key',(req, res)=>{
  return res.send(200, quicKey);
});

webapp.put('/rest/server', (req, res) => {
  // req.body is expected to be [{name: string for role name, type: string for device type}].
  console.log('server put: '+JSON.stringify(req.body));
  serverIceParameters = req.body.iceParameters;
  serverIceCandidates = req.body.iceCandidates;
  return res.send(200);
});

webapp.get('/rest/server', (req, res) => {
  return res.send(200, {
    parameters: serverIceParameters,
    candidates: serverIceCandidates
  });
});