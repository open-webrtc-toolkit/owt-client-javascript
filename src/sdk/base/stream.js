// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';
import Logger from './logger.js'
import {IcsEvent} from './event.js'
import * as Utils from './utils.js'

function isAllowedValue(obj, allowedValues) {
  return (allowedValues.some((ele) => {
    return ele === obj;
  }));
}
/*
   Information of a stream's source.
 */
export class StreamSourceInfo {
  /*
    Constructor a StreamSourceInfo with audio and video source info.
    @details Audio source info or video source info could be undefined if a stream does not have audio/video track.
  */
  constructor(audioSourceInfo, videoSourceInfo) {
    if (!isAllowedValue(audioSourceInfo, [undefined, 'mic', 'screen-cast',
        'file'
      ])) {
      throw new TypeError('Incorrect value for audioSourceInfo');
    }
    if (!isAllowedValue(videoSourceInfo, [undefined, 'camera', 'screen-cast',
        'file'
      ])) {
      throw new TypeError('Incorrect value for videoSourceInfo');
    }
    this.audio = audioSourceInfo;
    this.video = videoSourceInfo;
  }
}
/*
  A stream that may have audio or/and video tracks.
*/
export class Stream {
  constructor(stream, sourceInfo) {
    if (!(stream instanceof MediaStream) || !(sourceInfo instanceof StreamSourceInfo)) {
      throw new TypeError('Invalid stream or sourceInfo.');
    }
    if ((stream.getAudioTracks().length > 0 && !sourceInfo.audio) || stream.getVideoTracks()
      .length > 0 && !sourceInfo.video) {
      throw new TypeError('Missing audio source info or video source info.');
    }
    Object.defineProperty(this, 'mediaStream', {
      configurable: false,
      writable: false,
      value: stream
    });
    Object.defineProperty(this, 'source', {
      configurable: false,
      writable: false,
      value: sourceInfo
    });
  };
}
/*
  Stream captured from current endpoint.
*/
export class LocalStream extends Stream {
  constructor(stream, sourceInfo) {
    super(stream, sourceInfo);
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: Utils.createUuid()
    });
  };
}
/*
  Stream sends from a remote endpoint.
*/
export class RemoteStream extends Stream {
  constructor(id, origin, stream, sourceInfo) {
    super(stream, sourceInfo);
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid()
    });
    Object.defineProperty(this, 'origin', {
      configurable: false,
      writable: false,
      value: origin
    });
  }
}

/*
  Event for Stream.
*/
export class StreamEvent extends IcsEvent {
  constructor(type, init) {
    super(type);
    this.stream = init.stream;
  }
}
