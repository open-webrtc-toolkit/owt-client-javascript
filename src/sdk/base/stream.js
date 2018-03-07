// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';
import Logger from './logger.js'
import {IcsEvent} from './event.js'
import * as Utils from './utils.js'
import { EventDispatcher} from './event.js';

function isAllowedValue(obj, allowedValues) {
  return (allowedValues.some((ele) => {
    return ele === obj;
  }));
}
/**
 * @class StreamSourceInfo
 * @memberOf Ics.Base
 * @classDesc Information of a stream's source.
 * @constructor
 * @description Audio source info or video source info could be undefined if a stream does not have audio/video track.
 * @param {?string} audioSourceInfo Audio source info. Accepted values are: "mic", "screen-cast", "file", "mixed" or undefined.
 * @param {?string} videoSourceInfo Video source info. Accepted values are: "camera", "screen-cast", "file", "mixed" or undefined.
 */
export class StreamSourceInfo {
  constructor(audioSourceInfo, videoSourceInfo) {
    if (!isAllowedValue(audioSourceInfo, [undefined, 'mic', 'screen-cast',
        'file', 'mixed'
      ])) {
      throw new TypeError('Incorrect value for audioSourceInfo');
    }
    if (!isAllowedValue(videoSourceInfo, [undefined, 'camera', 'screen-cast',
        'file', 'mixed'
      ])) {
      throw new TypeError('Incorrect value for videoSourceInfo');
    }
    this.audio = audioSourceInfo;
    this.video = videoSourceInfo;
  }
}
/**
 * @class Stream
 * @memberOf Ics.Base
 * @classDesc Base class of streams.
 * @extends Ics.Base.EventDispatcher
 * @hideconstructor
 */
export class Stream extends EventDispatcher {
  constructor(stream, sourceInfo) {
    super();
    if ((stream && !(stream instanceof MediaStream)) || !(sourceInfo instanceof StreamSourceInfo)) {
        throw new TypeError('Invalid stream or sourceInfo.');
      }
    if (stream && ((stream.getAudioTracks().length > 0 && !sourceInfo.audio) ||
        stream.getVideoTracks().length > 0 && !sourceInfo.video)) {
      throw new TypeError('Missing audio source info or video source info.');
    }
    /**
     * @member {?MediaStream} mediaStream
     * @instance
     * @memberof Ics.Base.Stream
     * @see {@link https://www.w3.org/TR/mediacapture-streams/#mediastream|MediaStream API of Media Capture and Streams}.
     */
    Object.defineProperty(this, 'mediaStream', {
      configurable: false,
      writable: true,
      value: stream
    });
    /**
     * @member {Ics.Base.StreamSourceInfo} source
     * @instance
     * @memberof Ics.Base.Stream
     * @desc Source info of a stream.
     */
    Object.defineProperty(this, 'source', {
      configurable: false,
      writable: false,
      value: sourceInfo
    });
  };
}
/**
 * @class LocalStream
 * @classDesc Stream captured from current endpoint.
 * @memberOf Ics.Base
 * @extends Ics.Base.Stream
 */
export class LocalStream extends Stream {
  constructor(stream, sourceInfo) {
    if(!(stream instanceof MediaStream)){
      throw new TypeError('Invalid stream.');
    }
    super(stream, sourceInfo);
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Base.LocalStream
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: Utils.createUuid()
    });
  };
}
/**
 * @class RemoteStream
 * @classDesc Stream sent from a remote endpoint.
 * @memberOf Ics.Base
 * @extends Ics.Base.Stream
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | ended           | Event            | Stream is ended. |
 *
 * @hideconstructor
 */
export class RemoteStream extends Stream {
  constructor(id, origin, stream, sourceInfo) {
    super(stream, sourceInfo);
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Base.RemoteStream
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid()
    });
    /**
     * @member {string} origin
     * @instance
     * @memberof Ics.Base.RemoteStream
     * @desc ID of the remote endpoint who published this stream.
     */
    Object.defineProperty(this, 'origin', {
      configurable: false,
      writable: false,
      value: origin
    });
  }
}

/**
 * @class StreamEvent
 * @classDesc Event for Stream.
 * @extends Ics.Base.IcsEvent
 * @memberof Ics.Base
 * @hideconstructor
 */
export class StreamEvent extends IcsEvent {
  constructor(type, init) {
    super(type);
    this.stream = init.stream;
  }
}
