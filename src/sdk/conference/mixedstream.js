// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import * as StreamModule from '../base/stream.js'
import * as StreamUtilsModule from './streamutils.js'

/*
   Mixed stream from MCU.
 */
export class RemoteMixedStream extends StreamModule.RemoteStream {
  constructor(info) {
    if (info.type !== 'mixed') {
      throw new TypeError('Not a mixed stream');
    }
    super(info.id, undefined, undefined, new StreamModule.StreamSourceInfo(
      'mixed', 'mixed'));

    /// Original settings for publishing this stream.
    this.settings = StreamUtilsModule.convertToPublicationSettings(info.media);
    /// Capabilities remote endpoint provides for subscription.
    this.capabilities = new StreamUtilsModule.convertToSubscriptionCapabilities(
      info.media);
  }
}
