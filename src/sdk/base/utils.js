// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

/* global navigator, window */

'use strict';
const sdkVersion = '4.3';

// eslint-disable-next-line require-jsdoc
export function isFirefox() {
  return window.navigator.userAgent.match('Firefox') !== null;
}
// eslint-disable-next-line require-jsdoc
export function isChrome() {
  return window.navigator.userAgent.match('Chrome') !== null;
}
// eslint-disable-next-line require-jsdoc
export function isSafari() {
  return /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
}
// eslint-disable-next-line require-jsdoc
export function isEdge() {
  return window.navigator.userAgent.match(/Edge\/(\d+).(\d+)$/) !== null;
}
// eslint-disable-next-line require-jsdoc
export function createUuid() {
  return 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Returns system information.
// Format: {sdk:{version:**, type:**}, runtime:{version:**, name:**}, os:{version:**, name:**}};
// eslint-disable-next-line require-jsdoc
export function sysInfo() {
  const info = Object.create({});
  info.sdk = {
    version: sdkVersion,
    type: 'JavaScript',
  };
  // Runtime info.
  const userAgent = navigator.userAgent;
  const firefoxRegex = /Firefox\/([0-9\.]+)/;
  const chromeRegex = /Chrome\/([0-9\.]+)/;
  const edgeRegex = /Edge\/([0-9\.]+)/;
  const safariVersionRegex = /Version\/([0-9\.]+) Safari/;
  let result = chromeRegex.exec(userAgent);
  if (result) {
    info.runtime = {
      name: 'Chrome',
      version: result[1],
    };
  } else if (result = firefoxRegex.exec(userAgent)) {
    info.runtime = {
      name: 'Firefox',
      version: result[1],
    };
  } else if (result = edgeRegex.exec(userAgent)) {
    info.runtime = {
      name: 'Edge',
      version: result[1],
    };
  } else if (isSafari()) {
    result = safariVersionRegex.exec(userAgent);
    info.runtime = {
      name: 'Safari',
    };
    info.runtime.version = result ? result[1] : 'Unknown';
  } else {
    info.runtime = {
      name: 'Unknown',
      version: 'Unknown',
    };
  }
  // OS info.
  const windowsRegex = /Windows NT ([0-9\.]+)/;
  const macRegex = /Intel Mac OS X ([0-9_\.]+)/;
  const iPhoneRegex = /iPhone OS ([0-9_\.]+)/;
  const linuxRegex = /X11; Linux/;
  const androidRegex = /Android( ([0-9\.]+))?/;
  const chromiumOsRegex = /CrOS/;
  if (result = windowsRegex.exec(userAgent)) {
    info.os = {
      name: 'Windows NT',
      version: result[1],
    };
  } else if (result = macRegex.exec(userAgent)) {
    info.os = {
      name: 'Mac OS X',
      version: result[1].replace(/_/g, '.'),
    };
  } else if (result = iPhoneRegex.exec(userAgent)) {
    info.os = {
      name: 'iPhone OS',
      version: result[1].replace(/_/g, '.'),
    };
  } else if (result = linuxRegex.exec(userAgent)) {
    info.os = {
      name: 'Linux',
      version: 'Unknown',
    };
  } else if (result = androidRegex.exec(userAgent)) {
    info.os = {
      name: 'Android',
      version: result[1] || 'Unknown',
    };
  } else if (result = chromiumOsRegex.exec(userAgent)) {
    info.os = {
      name: 'Chrome OS',
      version: 'Unknown',
    };
  } else {
    info.os = {
      name: 'Unknown',
      version: 'Unknown',
    };
  }
  info.capabilities = {
    continualIceGathering: false,
    unifiedPlan: true,
    streamRemovable: info.runtime.name !== 'Firefox',
  };
  return info;
}
