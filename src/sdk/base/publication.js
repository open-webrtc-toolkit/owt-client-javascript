'use strict';

import * as Utils from './utils.js'

export default class Publication {
  constructor(id, stop, mute, unmute) {
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id ? id : Utils.createUuid()
    });
    this.stop = stop;
  }
}
