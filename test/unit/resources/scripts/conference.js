// Copyright © 2017 Intel Corporation. All Rights Reserved.
import {ConferenceClient} from '../../../../src/sdk/conference/client.js';
import * as StreamModule from '../../../../src/sdk/base/stream.js';

const expect = chai.expect;
const screenSharingExtensionId = 'jniliohjdiikfjjdlpapmngebedgigjn';
chai.use(chaiAsPromised);

describe('Unit tests for ConferenceClient', function() {
  describe('Create a ConferenceClient.', function() {
    it(
      'Create a ConferenceClient with or without configuration should success.',
      done => {
        let confclient = new ConferenceClient({}, {});
        expect(confclient).to.be.an.instanceof(ConferenceClient);
        confclient = new ConferenceClient({},{});
        expect(confclient).to.be.an.instanceof(ConferenceClient);
        done();
      });
  });
});
