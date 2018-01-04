'use strict';

export const AudioSourceInfo = {
  MIC: 'mic',
  SCREENCAST: 'screen-cast',
  FILE: 'file'
};

export const VideoSourceInfo = {
  CAMERA: 'camera',
  SCREENCAST: 'screen-cast',
  FILE: 'file'
}

export class Resolution {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
}
