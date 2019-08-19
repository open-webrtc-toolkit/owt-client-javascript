// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';
import Logger from './logger.js'
import {OwtEvent} from './event.js'
import * as Utils from './utils.js'
import { EventDispatcher} from './event.js';

// eslint-disable-next-line require-jsdoc
function isAllowedValue(obj, allowedValues) {
  return (allowedValues.some((ele) => {
    return ele === obj;
  }));
}
/**
 * @class StreamSourceInfo
 * @memberOf Owt.Base
 * @classDesc Information of a stream's source.
 * @constructor
 * @description Audio source info or video source info could be undefined if a stream does not have audio/video track.
 * @param {?string} audioSourceInfo Audio source info. Accepted values are: "mic", "screen-cast", "file", "mixed" or undefined.
 * @param {?string} videoSourceInfo Video source info. Accepted values are: "camera", "screen-cast", "file", "mixed" or undefined.
 */
export class StreamSourceInfo {
  // eslint-disable-next-line require-jsdoc
  constructor(audioSourceInfo, videoSourceInfo) {
    if (!isAllowedValue(audioSourceInfo, [undefined, 'mic', 'screen-cast',
      'file', 'mixed'])) {
      throw new TypeError('Incorrect value for audioSourceInfo');
    }
    if (!isAllowedValue(videoSourceInfo, [undefined, 'camera', 'screen-cast',
      'file', 'encoded-file', 'raw-file', 'mixed'])) {
      throw new TypeError('Incorrect value for videoSourceInfo');
    }
    this.audio = audioSourceInfo;
    this.video = videoSourceInfo;
  }
}
/**
 * @class Stream
 * @memberOf Owt.Base
 * @classDesc Base class of streams.
 * @extends Owt.Base.EventDispatcher
 * @hideconstructor
 */
export class Stream extends EventDispatcher {
  // eslint-disable-next-line require-jsdoc
  constructor(stream, sourceInfo, attributes) {
    super();
    if ((stream && !(stream instanceof MediaStream)) || (typeof sourceInfo !==
        'object')) {
      throw new TypeError('Invalid stream or sourceInfo.');
    }
    if (stream && ((stream.getAudioTracks().length > 0 && !sourceInfo.audio) ||
        stream.getVideoTracks().length > 0 && !sourceInfo.video)) {
      throw new TypeError('Missing audio source info or video source info.');
    }
    /**
     * @member {?MediaStream} mediaStream
     * @instance
     * @memberof Owt.Base.Stream
     * @see {@link https://www.w3.org/TR/mediacapture-streams/#mediastream|MediaStream API of Media Capture and Streams}.
     */
    Object.defineProperty(this, 'mediaStream', {
      configurable: false,
      writable: true,
      value: stream,
    });
    /**
     * @member {Owt.Base.StreamSourceInfo} source
     * @instance
     * @memberof Owt.Base.Stream
     * @desc Source info of a stream.
     */
    Object.defineProperty(this, 'source', {
      configurable: false,
      writable: false,
      value: sourceInfo,
    });
    /**
     * @member {object} attributes
     * @instance
     * @memberof Owt.Base.Stream
     * @desc Custom attributes of a stream.
     */
    Object.defineProperty(this, 'attributes', {
      configurable: true,
      writable: false,
      value: attributes,
    });
  }
}
/**
 * @class LocalStream
 * @classDesc Stream captured from current endpoint.
 * @memberOf Owt.Base
 * @extends Owt.Base.Stream
 * @constructor
 * @param {MediaStream} stream Underlying MediaStream.
 * @param {Owt.Base.StreamSourceInfo} sourceInfo Information about stream's source.
 * @param {object} attributes Custom attributes of the stream.
 */
export class LocalStream extends Stream {
  // eslint-disable-next-line require-jsdoc
  constructor(stream, sourceInfo, attributes) {
    if (!(stream instanceof MediaStream)) {
      throw new TypeError('Invalid stream.');
    }
    super(stream, sourceInfo, attributes);
    /**
     * @member {string} id
     * @instance
     * @memberof Owt.Base.LocalStream
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: Utils.createUuid(),
    });
  }
}
/**
 * @class RemoteStream
 * @classDesc Stream sent from a remote endpoint.
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when         |
 * | ----------------| ---------------- | ------------------ |
 * | ended           | Event            | Stream is ended.   |
 * | updated         | Event            | Stream is updated. |
 *
 * @memberOf Owt.Base
 * @extends Owt.Base.Stream
 * @hideconstructor
 */
export class RemoteStream extends Stream {
  // eslint-disable-next-line require-jsdoc
  constructor(id, origin, stream, sourceInfo, attributes) {
    super(stream, sourceInfo, attributes);
    /**
     * @member {string} id
     * @instance
     * @memberof Owt.Base.RemoteStream
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid(),
    });
    /**
     * @member {string} origin
     * @instance
     * @memberof Owt.Base.RemoteStream
     * @desc ID of the remote endpoint who published this stream.
     */
    Object.defineProperty(this, 'origin', {
      configurable: false,
      writable: false,
      value: origin,
    });
    /**
     * @member {Owt.Base.PublicationSettings} settings
     * @instance
     * @memberof Owt.Base.RemoteStream
     * @desc Original settings for publishing this stream. This property is only valid in conference mode.
     */
    this.settings = undefined;
    /**
     * @member {Owt.Conference.SubscriptionCapabilities} extraCapabilities
     * @instance
     * @memberof Owt.Base.RemoteStream
     * @desc Extra capabilities remote endpoint provides for subscription. Extra capabilities don't include original settings. This property is only valid in conference mode.
     */
    this.extraCapabilities = undefined;
  }
}

/**
 * @class StreamEvent
 * @classDesc Event for Stream.
 * @extends Owt.Base.OwtEvent
 * @memberof Owt.Base
 * @hideconstructor
 */
export class StreamEvent extends OwtEvent {
  // eslint-disable-next-line require-jsdoc
  constructor(type, init) {
    super(type);
    /**
     * @member {Owt.Base.Stream} stream
     * @instance
     * @memberof Owt.Base.StreamEvent
     */
    this.stream = init.stream;
  }
}
