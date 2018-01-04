// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

import * as Utils from './utils.js'
import * as MediaFormat from './mediaformat.js'

export class AudioPublicationSettings {
  constructor(codec) {
    this.codec = codec;
  }
}

export class VideoPublicationSettings {
  constructor(codec, resolution, frameRate, bitrate, keyFrameInterval){
    this.codec=codec,
    this.resolution=resolution;
    this.frameRate=frameRate;
    this.bitrate=bitrate;
    this.keyFrameInterval=keyFrameInterval;
  }
}

export class PublicationSettings {
  constructor(audio, video){
    this.audio=audio;
    this.video=video;
  }
}

export class Publication {
  constructor(id, stop, mute, unmute) {
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid()
    });
    this.stop = stop;
  }
}
