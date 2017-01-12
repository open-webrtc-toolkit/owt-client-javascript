#!/usr/bin/env node

'use strict';

var path = require('path');
var readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});
var cipher = require('./cipher');
var collection;
var keystore = path.resolve(__dirname, 'cert/.woogeen.keystore');
var allComps = ['sample'];

console.log('Will generate passphrase store for basic server.');

cipher.unlock(cipher.k, keystore, function cb(err, obj) {
  if (err || typeof collection !== 'object') {
    collection = {};
  } else {
    collection = obj;
  }

  function done() {
    readline.close();
    cipher.lock(cipher.k, collection, keystore, function cb(err) {
      console.log(err || 'done!');
    });
  }

  function ask(components, end) {
    var component = components.splice(0, 1)[0];
    if (component) {
      readline.question('Enter passphrase of certificate for ' + component +
        ': ',
        function(res) {
          collection[component] = res;
          ask(components, end);
        });
    } else {
      end();
    }
  }

  ask(allComps, done);
});
