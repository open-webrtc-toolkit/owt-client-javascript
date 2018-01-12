// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import * as StreamModule from '../base/stream.js'
import * as StreamUtilsModule from './streamutils.js'

/**
 * @class RemoteMixedStream
 * @classDesc Mixed stream from conference server.
 * @memberOf Ics.Conference
 * @extends Ics.Base.RemoteStream
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | layoutchanged   | Event            | Video's layout has been changed. It usually happens when a new video is mixed into the target mixed stream or an existing video has been removed from mixed stream. |
 *
 * @hideconstructor
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
