// Copyright © 2017 Intel Corporation. All Rights Reserved.
export function isFirefox() {
  return window.navigator.userAgent.match("Firefox") !== null;
}
export function isChrome() {
  return window.navigator.userAgent.match('Chrome') !== null;
}
export function createUuid() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
      v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
