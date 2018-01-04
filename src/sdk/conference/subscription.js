// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

import * as MediaFormatModule from '../base/mediaformat.js'
import * as CodecModule from '../base/codec.js'

export class AudioSubscriptionCapacities {
  constructor(codecs) {
    this.codecs = codecs;
  }
}

export class VideoSubscriptionCapabilities {
  constructor(codecs, resolutions, frameRates, bitrateMultipliers,
    keyFrameIntervals) {
    this.codecs = codecs;
    this.resolutions = resolutions;
    this.frameRates = frameRates;
    this.bitrateMultipliers = bitrateMultipliers;
    this.keyFrameIntervals = keyFrameIntervals;
  }
}

export class SubscriptionCapabilities {
  constructor(audio, video) {
    this.audio = audio;
    this.video = video;
  }
}

export class AudioSubscriptionConstraints {
  constructor(codecs) {
    this.codecs = codecs;
  }
}

export class VideoSubscriptionConstraints {
  constructor(codecs, resolution, frameRate, bitrateMultiplier,
    keyFrameInterval) {
    this.codecs = codecs;
    this.resolution = resolution;
    this.frameRate = frameRate;
    this.bitrateMultiplier = bitrateMultiplier;
    this.keyFrameInterval = keyFrameInterval;
  }
}

export class SubscribeOptions {
  constructor(audio, video) {
    this.audio = audio;
    this.video = video;
  }
}

export class Subscription {
  constructor(id, stop) {
    if (!id) {
      throw new TypeError('ID cannot be null or undefined.');
    }
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id
    });
    this.stop = stop;
  }
}
