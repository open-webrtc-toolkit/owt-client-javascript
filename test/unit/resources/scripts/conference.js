// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import {ConferenceClient} from '../../../../src/sdk/conference/client.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';
import * as EventModule from '../../../../src/sdk/base/event.js'

const expect = chai.expect;
const screenSharingExtensionId = 'jniliohjdiikfjjdlpapmngebedgigjn';
chai.use(chaiAsPromised);

describe('Unit tests for ConferenceClient', function() {
  describe('Create a ConferenceClient.', function() {
    it(
      'Create a ConferenceClient with or without configuration should success.',
      done => {
        let confclient = new ConferenceClient({});
        expect(confclient).to.be.an.instanceof(EventModule.EventDispatcher);
        confclient = new ConferenceClient({});
        expect(confclient).to.be.an.instanceof(EventModule.EventDispatcher);
        done();
      });

    it('Event should be fired on correct target.', done => {
      let conf1 = new ConferenceClient({});
      let conf2 = new ConferenceClient({});
      conf1.addEventListener('test', () => {
        done('Event should not be fired on conf1.');
      });
      conf2.addEventListener('test', () => {
        done();
      });
      conf2.dispatchEvent(new EventModule.OwtEvent('test'));
    });

    it('Event listener should not be triggered after removeEventListener.',
       done => {
         const conf1 = new ConferenceClient({});
         const listener = () => {
           done('Event listener should not be fired.');
         };
         conf1.addEventListener('test', listener);
         conf1.removeEventListener('test', listener);
         conf1.dispatchEvent(new EventModule.OwtEvent('test'));
         done();
       });
  });
});
