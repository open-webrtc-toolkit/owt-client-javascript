// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

import * as StreamModule from '../base/stream.js'
import * as StreamUtilsModule from './streamutils.js'
import { IcsEvent } from '../base/event.js'

/**
 * @class RemoteMixedStream
 * @classDesc Mixed stream from conference server.
 * Events:
 *
 * | Event Name             | Argument Type    | Fired when       |
 * | -----------------------| ---------------- | ---------------- |
 * | activeaudioinputchange | Event            | Audio activeness of input stream(of the mixed stream) is changed. |
 * | layoutchange           | Event            | Video's layout has been changed. It usually happens when a new video is mixed into the target mixed stream or an existing video has been removed from mixed stream. |
 *
 * @memberOf Ics.Conference
 * @extends Ics.Base.RemoteStream
 * @hideconstructor
 */
export class RemoteMixedStream extends StreamModule.RemoteStream {
  constructor(info) {
    if (info.type !== 'mixed') {
      throw new TypeError('Not a mixed stream');
    }
    super(info.id, undefined, undefined, new StreamModule.StreamSourceInfo(
      'mixed', 'mixed'));

    this.settings = StreamUtilsModule.convertToPublicationSettings(info.media);

    this.capabilities = new StreamUtilsModule.convertToSubscriptionCapabilities(
      info.media);
  }
}

/**
 * @class ActiveAudioInputChangeEvent
 * @classDesc Class ActiveInputChangeEvent represents an active audio input change event.
 * @memberof Ics.Conference
 * @hideconstructor
 */
export class ActiveAudioInputChangeEvent extends IcsEvent {
  constructor(type, init) {
    super(type);
    /**
     * @member {string} activeAudioInputStreamId
     * @instance
     * @memberof Ics.Conference.ActiveAudioInputChangeEvent
     * @desc The ID of input stream(of the mixed stream) whose audio is active.
     */
    this.activeAudioInputStreamId = init.activeAudioInputStreamId;
  }
}

/**
 * @class LayoutChangeEvent
 * @classDesc Class LayoutChangeEvent represents an video layout change event.
 * @memberof Ics.Conference
 * @hideconstructor
 */
export class LayoutChangeEvent extends IcsEvent{
  constructor(type, init) {
    super(type);
    /**
     * @member {object} layout
     * @instance
     * @memberof Ics.Conference.LayoutChangeEvent
     * @desc Current video's layout. It's an array of map which maps each stream to a region.
     */
    this.layout = init.layout;
  }
}

