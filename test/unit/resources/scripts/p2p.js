// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import P2PClient from '../../../../src/sdk/p2p/p2pclient.js';
import SignalingChannel from './fake-p2p-signaling.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';
import * as EventModule from '../../../../src/sdk/base/event.js'

const expect = chai.expect;
const screenSharingExtensionId = 'jniliohjdiikfjjdlpapmngebedgigjn';
chai.use(chaiAsPromised);
describe('Unit tests for P2PClient', function() {
  describe('Create a P2PClient.', function() {
    it(
      'Create a P2PClient with or without configuration should success.',
      done => {
        let p2pclient = new P2PClient({}, {});
        expect(p2pclient).to.be.an.instanceof(EventModule.EventDispatcher);
        p2pclient = new P2PClient({},{});
        expect(p2pclient).to.be.an.instanceof(EventModule.EventDispatcher);
        done();
      });
  });
  describe('Connect to signaling server', function() {
    const username = 'username';
    it('Connect to signaling server with correct token should success.',
      done => {
        const signaling = new SignalingChannel();
        sinon.stub(signaling, 'connect').resolves(username);
        const p2pclient = new P2PClient(null, signaling);
        expect(p2pclient.connect('user')).to.eventually.equal(
          username).and.notify(done);
        signaling.connect.restore();
      });
    it(
      'Connect to signaling server should be rejected if signaling channel rejects login request.',
      done => {
        const signaling = new SignalingChannel();
        sinon.stub(signaling, 'connect').rejects(2100);
        const p2pclient = new P2PClient(null, signaling);
        expect(p2pclient.connect('user')).to.be.rejected.and.notify(
          done);
      });
  });
  describe('Disconnect from signaling server', function() {
    let signaling;
    let p2pclient;
    beforeEach(() => {
      signaling = new SignalingChannel();
      p2pclient = new P2PClient(null, signaling);
    });
    it(
      'Disconnect from signaling server after connected should be resolved.',
      done => {
        expect(p2pclient.connect('user').then(() => {
            return p2pclient.disconnect();
          })).to.be.fulfilled.and.notify(done);
      });
    it(
      'Disconnect from signaling server before connected should be rejected.',
      done => {
        expect(p2pclient.disconnect()).to.be.undefined;
        done();
      });
  });
  describe('Interop with remote endpoints', function(){
    const sourceInfo = new StreamModule.StreamSourceInfo('mic');
    let signaling1, signaling2, signaling3;
    let p2pclient1, p2pclient2, p2pclient3;
    let localStream;
    before(done=>{
      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
      }).then(stream => {
        expect(stream).to.be.an.instanceof(MediaStream);
        localStream=new StreamModule.LocalStream(stream, sourceInfo);
        done();
      }).catch(err => {
        done(err);
      });
    });
    after(function(done) {
      localStream.mediaStream.getTracks().map(function(track) {
        if (typeof track.stop === 'function') {
          track.stop();
        }
      });
      done();
    });
    beforeEach((done) => {
      signaling1 = new SignalingChannel();
      signaling2 = new SignalingChannel();
      signaling3 = new SignalingChannel();
      p2pclient1 = new P2PClient({}, signaling1);
      p2pclient1.allowedRemoteIds = ['user2'];
      p2pclient2 = new P2PClient({}, signaling2);
      p2pclient2.allowedRemoteIds=['user1'];
      p2pclient3 = new P2PClient({}, signaling3);
      p2pclient3.allowedRemoteIds=['user1'];
      expect(Promise.all([p2pclient1.connect('user1'), p2pclient2.connect(
        'user2'), p2pclient3.connect('user3')])).to.be.fulfilled.and.notify(
        done);
    });
    it('Publish a valid stream to remote endpoint then stop the publication should be resolved.', done => {
      p2pclient1.publish('user2', localStream).then(publication=>{
        p2pclient1.getStats('user2').then((stats)=>{
          console.info('Stats: '+JSON.stringify(stats));
        });
        expect(publication.stop()).to.be.undefined;
        done();
      });
    });
    it(
      'Publish a stream to a remote endpoint not listed in local allowedRemoteIds should be rejected.',
      done => {
        expect(p2pclient1.publish('user3', localStream)).to.be.rejected.and.notify(
          done);
      });
    it(
      'Publish a stream to a remote endpoint not listed in remote allowedRemoteIds should be rejected.',
      done => {
        expect(p2pclient3.publish('user1', localStream)).to.be.rejected.and.notify(
          done);
      });
    it('Send message to a remote endpoint should be resolved.', done => {
      expect(p2pclient1.send('user2', 'message')).to.be.fulfilled.and.notify(
        done);
    });
    it(
      'Send message to a remote endpoint not listed in local allowedRemoteIds should be rejected.',
      done => {
        expect(p2pclient1.send('user3', 'message')).to.be.rejected.and.notify(
          done);
      });
    it(
      'Send message to a remote endpoint not listed in remote allowedRemoteIds should be rejected.',
      done => {
        expect(p2pclient3.send('user1', 'message')).to.be.rejected.and.notify(
          done);
      });
  });
});
