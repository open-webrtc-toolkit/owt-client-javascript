// Copyright © 2017 Intel Corporation. All Rights Reserved.

export function isFirefox() {
  return window.navigator.userAgent.match("Firefox") !== null;
}

export function isChrome() {
  return window.navigator.userAgent.match('Chrome') !== null;
}
