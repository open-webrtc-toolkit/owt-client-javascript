// Copyright (C) <2018> Intel Corporation
'use strict';

const crypto = require('crypto');
const http = require('http');
const https = require('https');

// Configuration for REST client
// Properties: service, key, host, port, secure, rejectUnauthorized
var config = null;

function signWithKey (data, key) {
  const hex = crypto.createHmac('sha256', key).update(data).digest('hex')
  return Buffer(hex).toString('base64');
};

function init(service, key, url, rejectUnauthorized) {
  const parsedUrl = require('url').parse(url);
  config = {
    service,
    key,
    host: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    secure: (parsedUrl.protocol === 'https:'),
    rejectUnauthorized
  };
}

function request(method, resource, body, onOK, onError) {
  if (!config) {
    onError(new Error('ICS-REST not initialized'));
    return;
  }

  const timestamp = new Date().getTime();
  const cnounce = crypto.randomBytes(8).toString('hex');

  const toSign = timestamp + ',' + cnounce;
  const signed = signWithKey(toSign, config.key);

  let header = 'MAuth realm=http://marte3.dit.upm.es,mauth_signature_method=HMAC_SHA256';
  header += ',mauth_serviceid=';
  header += config.service;
  header += ',mauth_cnonce=';
  header += cnounce;
  header += ',mauth_timestamp=';
  header += timestamp;
  header += ',mauth_signature=';
  header += signed;

  const options = {
    hostname: config.host,
    port: config.port,
    path: resource,
    method, //'POST',
    headers: {
      'Authorization': header,
      'Content-Type': 'application/json'
    }
  };
  if (body) {
    options.headers['Content-Length'] = Buffer.byteLength(body);
  }

  const httpHttps = config.secure ? https : http;

  const responseReady = new Promise((resolve, reject) => {
    const req = httpHttps.request(options, (res) => {
      // Keep res.statusCode, res.headers
      resolve(res);
    });

    req.on('error', (e) => {
      reject(e);
    });

    // Write data to request body
    if (body) {
      req.write(body);
    }
    req.end();
  });

  if (typeof onOK === 'function' && typeof onError === 'function') {
    responseReady
    .then((res) => {
      res.setEncoding('utf8');
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        switch (res.statusCode) {
          case 100:
          case 200:
          case 201:
          case 202:
          case 203:
          case 204:
          case 205:
            onOK(data);
            break;
          default:
            onError(data);
        }
      });
    })
    .catch(onError);
  } else {
    // Return promise
    return responseReady;
  }
};

module.exports = {
  init,
  request
};
