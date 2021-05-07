// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import {ConferenceClient} from '../../../../src/sdk/conference/client.js';
import {ConferencePeerConnectionChannel} from '../../../../src/sdk/conference/channel.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';
import * as EventModule from '../../../../src/sdk/base/event.js'
import * as SubscriptionModule from '../../../../src/sdk/conference/subscription.js'
import { TransportSettings, TransportType } from '../../../../src/sdk/base/transport.js';

const expect = chai.expect;
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

describe('Unit tests for ConferencePeerConnectionChannel.', () => {
  describe('Tests for codecs.', () => {
    it('Correctly detect the type of publishOptions elements.', () => {
      // For each element in paramters, [object to be tested, is
      // RTCRtpEncodingParameters, is OwtEncodingParameters].
      const parameters = [
        [[{scalabilityMode: 'L3T3'}], true, false],
        [
          [
            {rid: 'q', active: true, scaleResolutionDownBy: 4.0},
            {rid: 'h', active: true, scaleResolutionDownBy: 2.0},
            {rid: 'f', active: true}
          ],
          true, false
        ],
        [true, false, false],
        [
          [
            {
              codec: {
                name: 'h264',
              },
            },
            {
              codec: {
                name: 'vp9',
              },
            },
            {
              codec: {
                name: 'vp8',
              },
            }
          ],
          false, true
        ]
      ];
      const channel = new ConferencePeerConnectionChannel();
      for (const [p, isRtpEncodingParameters, isOwtEncodingParameters] of
               parameters) {
        expect(channel._isRtpEncodingParameters(p))
            .to.equal(isRtpEncodingParameters);
        expect(channel._isOwtEncodingParameters(p))
            .to.equal(isOwtEncodingParameters);
      }
    });
  });
});

describe('Unit tests for Subscription.', () => {
  it('Get transport returns correct TransportSettings.', () => {
    const transportSettings =
        new TransportSettings(TransportType.WEBRTC, 'randomId');
    const subscription = new SubscriptionModule.Subscription(
        'sessionId', undefined, transportSettings);
    expect(subscription.transport).to.equal(transportSettings);
  });
});