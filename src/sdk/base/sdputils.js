/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* eslint-disable */

/* globals  adapter, trace */
/* exported setCodecParam, iceCandidateType, formatTypePreference,
   maybeSetOpusOptions, maybePreferAudioReceiveCodec,
   maybePreferAudioSendCodec, maybeSetAudioReceiveBitRate,
   maybeSetAudioSendBitRate, maybePreferVideoReceiveCodec,
   maybePreferVideoSendCodec, maybeSetVideoReceiveBitRate,
   maybeSetVideoSendBitRate, maybeSetVideoSendInitialBitRate,
   maybeRemoveVideoFec, mergeConstraints, removeCodecParam*/

/* This file is borrowed from apprtc with some modifications. */
/* Commit hash: c6af0c25e9af527f71b3acdd6bfa1389d778f7bd + PR 530 */

import Logger from './logger.js';

'use strict';

function mergeConstraints(cons1, cons2) {
  if (!cons1 || !cons2) {
    return cons1 || cons2;
  }
  const merged = cons1;
  for (const key in cons2) {
    merged[key] = cons2[key];
  }
  return merged;
}

function iceCandidateType(candidateStr) {
  return candidateStr.split(' ')[7];
}

// Turns the local type preference into a human-readable string.
// Note that this mapping is browser-specific.
function formatTypePreference(pref) {
  if (adapter.browserDetails.browser === 'chrome') {
    switch (pref) {
      case 0:
        return 'TURN/TLS';
      case 1:
        return 'TURN/TCP';
      case 2:
        return 'TURN/UDP';
      default:
        break;
    }
  } else if (adapter.browserDetails.browser === 'firefox') {
    switch (pref) {
      case 0:
        return 'TURN/TCP';
      case 5:
        return 'TURN/UDP';
      default:
        break;
    }
  }
  return '';
}

function maybeSetOpusOptions(sdp, params) {
  // Set Opus in Stereo, if stereo is true, unset it, if stereo is false, and
  // do nothing if otherwise.
  if (params.opusStereo === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'stereo', '1');
  } else if (params.opusStereo === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'stereo');
  }

  // Set Opus FEC, if opusfec is true, unset it, if opusfec is false, and
  // do nothing if otherwise.
  if (params.opusFec === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'useinbandfec', '1');
  } else if (params.opusFec === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'useinbandfec');
  }

  // Set Opus DTX, if opusdtx is true, unset it, if opusdtx is false, and
  // do nothing if otherwise.
  if (params.opusDtx === 'true') {
    sdp = setCodecParam(sdp, 'opus/48000', 'usedtx', '1');
  } else if (params.opusDtx === 'false') {
    sdp = removeCodecParam(sdp, 'opus/48000', 'usedtx');
  }

  // Set Opus maxplaybackrate, if requested.
  if (params.opusMaxPbr) {
    sdp = setCodecParam(
        sdp, 'opus/48000', 'maxplaybackrate', params.opusMaxPbr);
  }
  return sdp;
}

function maybeSetAudioSendBitRate(sdp, params) {
  if (!params.audioSendBitrate) {
    return sdp;
  }
  Logger.debug('Prefer audio send bitrate: ' + params.audioSendBitrate);
  return preferBitRate(sdp, params.audioSendBitrate, 'audio');
}

function maybeSetAudioReceiveBitRate(sdp, params) {
  if (!params.audioRecvBitrate) {
    return sdp;
  }
  Logger.debug('Prefer audio receive bitrate: ' + params.audioRecvBitrate);
  return preferBitRate(sdp, params.audioRecvBitrate, 'audio');
}

function maybeSetVideoSendBitRate(sdp, params) {
  if (!params.videoSendBitrate) {
    return sdp;
  }
  Logger.debug('Prefer video send bitrate: ' + params.videoSendBitrate);
  return preferBitRate(sdp, params.videoSendBitrate, 'video');
}

function maybeSetVideoReceiveBitRate(sdp, params) {
  if (!params.videoRecvBitrate) {
    return sdp;
  }
  Logger.debug('Prefer video receive bitrate: ' + params.videoRecvBitrate);
  return preferBitRate(sdp, params.videoRecvBitrate, 'video');
}

// Add a b=AS:bitrate line to the m=mediaType section.
function preferBitRate(sdp, bitrate, mediaType) {
  const sdpLines = sdp.split('\r\n');

  // Find m line for the given mediaType.
  const mLineIndex = findLine(sdpLines, 'm=', mediaType);
  if (mLineIndex === null) {
    Logger.debug('Failed to add bandwidth line to sdp, as no m-line found');
    return sdp;
  }

  // Find next m-line if any.
  let nextMLineIndex = findLineInRange(sdpLines, mLineIndex + 1, -1, 'm=');
  if (nextMLineIndex === null) {
    nextMLineIndex = sdpLines.length;
  }

  // Find c-line corresponding to the m-line.
  const cLineIndex = findLineInRange(sdpLines, mLineIndex + 1,
      nextMLineIndex, 'c=');
  if (cLineIndex === null) {
    Logger.debug('Failed to add bandwidth line to sdp, as no c-line found');
    return sdp;
  }

  // Check if bandwidth line already exists between c-line and next m-line.
  const bLineIndex = findLineInRange(sdpLines, cLineIndex + 1,
      nextMLineIndex, 'b=AS');
  if (bLineIndex) {
    sdpLines.splice(bLineIndex, 1);
  }

  // Create the b (bandwidth) sdp line.
  const bwLine = 'b=AS:' + bitrate;
  // As per RFC 4566, the b line should follow after c-line.
  sdpLines.splice(cLineIndex + 1, 0, bwLine);
  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add an a=fmtp: x-google-min-bitrate=kbps line, if videoSendInitialBitrate
// is specified. We'll also add a x-google-min-bitrate value, since the max
// must be >= the min.
function maybeSetVideoSendInitialBitRate(sdp, params) {
  let initialBitrate = parseInt(params.videoSendInitialBitrate);
  if (!initialBitrate) {
    return sdp;
  }

  // Validate the initial bitrate value.
  let maxBitrate = parseInt(initialBitrate);
  const bitrate = parseInt(params.videoSendBitrate);
  if (bitrate) {
    if (initialBitrate > bitrate) {
      Logger.debug('Clamping initial bitrate to max bitrate of ' + bitrate + ' kbps.');
      initialBitrate = bitrate;
      params.videoSendInitialBitrate = initialBitrate;
    }
    maxBitrate = bitrate;
  }

  const sdpLines = sdp.split('\r\n');

  // Search for m line.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    Logger.debug('Failed to find video m-line');
    return sdp;
  }
  // Figure out the first codec payload type on the m=video SDP line.
  const videoMLine = sdpLines[mLineIndex];
  const pattern = new RegExp('m=video\\s\\d+\\s[A-Z/]+\\s');
  const sendPayloadType = videoMLine.split(pattern)[1].split(' ')[0];
  const fmtpLine = sdpLines[findLine(sdpLines, 'a=rtpmap', sendPayloadType)];
  const codecName = fmtpLine.split('a=rtpmap:' +
      sendPayloadType)[1].split('/')[0];

  // Use codec from params if specified via URL param, otherwise use from SDP.
  const codec = params.videoSendCodec || codecName;
  sdp = setCodecParam(sdp, codec, 'x-google-min-bitrate',
      params.videoSendInitialBitrate.toString());
  sdp = setCodecParam(sdp, codec, 'x-google-max-bitrate',
      maxBitrate.toString());

  return sdp;
}

function removePayloadTypeFromMline(mLine, payloadType) {
  mLine = mLine.split(' ');
  for (let i = 0; i < mLine.length; ++i) {
    if (mLine[i] === payloadType.toString()) {
      mLine.splice(i, 1);
    }
  }
  return mLine.join(' ');
}

function removeCodecByName(sdpLines, codec) {
  const index = findLine(sdpLines, 'a=rtpmap', codec);
  if (index === null) {
    return sdpLines;
  }
  const payloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines.splice(index, 1);

  // Search for the video m= line and remove the codec.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex],
      payloadType);
  return sdpLines;
}

function removeCodecByPayloadType(sdpLines, payloadType) {
  const index = findLine(sdpLines, 'a=rtpmap', payloadType.toString());
  if (index === null) {
    return sdpLines;
  }
  sdpLines.splice(index, 1);

  // Search for the video m= line and remove the codec.
  const mLineIndex = findLine(sdpLines, 'm=', 'video');
  if (mLineIndex === null) {
    return sdpLines;
  }
  sdpLines[mLineIndex] = removePayloadTypeFromMline(sdpLines[mLineIndex],
      payloadType);
  return sdpLines;
}

function maybeRemoveVideoFec(sdp, params) {
  if (params.videoFec !== 'false') {
    return sdp;
  }

  let sdpLines = sdp.split('\r\n');

  let index = findLine(sdpLines, 'a=rtpmap', 'red');
  if (index === null) {
    return sdp;
  }
  const redPayloadType = getCodecPayloadTypeFromLine(sdpLines[index]);
  sdpLines = removeCodecByPayloadType(sdpLines, redPayloadType);

  sdpLines = removeCodecByName(sdpLines, 'ulpfec');

  // Remove fmtp lines associated with red codec.
  index = findLine(sdpLines, 'a=fmtp', redPayloadType.toString());
  if (index === null) {
    return sdp;
  }
  const fmtpLine = parseFmtpLine(sdpLines[index]);
  const rtxPayloadType = fmtpLine.pt;
  if (rtxPayloadType === null) {
    return sdp;
  }
  sdpLines.splice(index, 1);

  sdpLines = removeCodecByPayloadType(sdpLines, rtxPayloadType);
  return sdpLines.join('\r\n');
}

// Promotes |audioSendCodec| to be the first in the m=audio line, if set.
function maybePreferAudioSendCodec(sdp, params) {
  return maybePreferCodec(sdp, 'audio', 'send', params.audioSendCodec);
}

// Promotes |audioRecvCodec| to be the first in the m=audio line, if set.
function maybePreferAudioReceiveCodec(sdp, params) {
  return maybePreferCodec(sdp, 'audio', 'receive', params.audioRecvCodec);
}

// Promotes |videoSendCodec| to be the first in the m=audio line, if set.
function maybePreferVideoSendCodec(sdp, params) {
  return maybePreferCodec(sdp, 'video', 'send', params.videoSendCodec);
}

// Promotes |videoRecvCodec| to be the first in the m=audio line, if set.
function maybePreferVideoReceiveCodec(sdp, params) {
  return maybePreferCodec(sdp, 'video', 'receive', params.videoRecvCodec);
}

// Sets |codec| as the default |type| codec if it's present.
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
function maybePreferCodec(sdp, type, dir, codec) {
  const str = type + ' ' + dir + ' codec';
  if (!codec) {
    Logger.debug('No preference on ' + str + '.');
    return sdp;
  }

  Logger.debug('Prefer ' + str + ': ' + codec);

  const sdpLines = sdp.split('\r\n');

  // Search for m line.
  const mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  // If the codec is available, set it as the default in m line.
  let payload = null;
  for (let i = 0; i < sdpLines.length; i++) {
    const index = findLineInRange(sdpLines, i, -1, 'a=rtpmap', codec);
    if (index !== null) {
      payload = getCodecPayloadTypeFromLine(sdpLines[index]);
      if (payload) {
        sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
      }
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Set fmtp param to specific codec in SDP. If param does not exists, add it.
function setCodecParam(sdp, codec, param, value) {
  let sdpLines = sdp.split('\r\n');
  // SDPs sent from MCU use \n as line break.
  if (sdpLines.length <= 1) {
    sdpLines = sdp.split('\n');
  }

  const fmtpLineIndex = findFmtpLine(sdpLines, codec);

  let fmtpObj = {};
  if (fmtpLineIndex === null) {
    const index = findLine(sdpLines, 'a=rtpmap', codec);
    if (index === null) {
      return sdp;
    }
    const payload = getCodecPayloadTypeFromLine(sdpLines[index]);
    fmtpObj.pt = payload.toString();
    fmtpObj.params = {};
    fmtpObj.params[param] = value;
    sdpLines.splice(index + 1, 0, writeFmtpLine(fmtpObj));
  } else {
    fmtpObj = parseFmtpLine(sdpLines[fmtpLineIndex]);
    fmtpObj.params[param] = value;
    sdpLines[fmtpLineIndex] = writeFmtpLine(fmtpObj);
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Remove fmtp param if it exists.
function removeCodecParam(sdp, codec, param) {
  const sdpLines = sdp.split('\r\n');

  const fmtpLineIndex = findFmtpLine(sdpLines, codec);
  if (fmtpLineIndex === null) {
    return sdp;
  }

  const map = parseFmtpLine(sdpLines[fmtpLineIndex]);
  delete map.params[param];

  const newLine = writeFmtpLine(map);
  if (newLine === null) {
    sdpLines.splice(fmtpLineIndex, 1);
  } else {
    sdpLines[fmtpLineIndex] = newLine;
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Split an fmtp line into an object including 'pt' and 'params'.
function parseFmtpLine(fmtpLine) {
  const fmtpObj = {};
  const spacePos = fmtpLine.indexOf(' ');
  const keyValues = fmtpLine.substring(spacePos + 1).split(';');

  const pattern = new RegExp('a=fmtp:(\\d+)');
  const result = fmtpLine.match(pattern);
  if (result && result.length === 2) {
    fmtpObj.pt = result[1];
  } else {
    return null;
  }

  const params = {};
  for (let i = 0; i < keyValues.length; ++i) {
    const pair = keyValues[i].split('=');
    if (pair.length === 2) {
      params[pair[0]] = pair[1];
    }
  }
  fmtpObj.params = params;

  return fmtpObj;
}

// Generate an fmtp line from an object including 'pt' and 'params'.
function writeFmtpLine(fmtpObj) {
  if (!fmtpObj.hasOwnProperty('pt') || !fmtpObj.hasOwnProperty('params')) {
    return null;
  }
  const pt = fmtpObj.pt;
  const params = fmtpObj.params;
  const keyValues = [];
  let i = 0;
  for (const key in params) {
    keyValues[i] = key + '=' + params[key];
    ++i;
  }
  if (i === 0) {
    return null;
  }
  return 'a=fmtp:' + pt.toString() + ' ' + keyValues.join(';');
}

// Find fmtp attribute for |codec| in |sdpLines|.
function findFmtpLine(sdpLines, codec) {
  // Find payload of codec.
  const payload = getCodecPayloadType(sdpLines, codec);
  // Find the payload in fmtp line.
  return payload ? findLine(sdpLines, 'a=fmtp:' + payload.toString()) : null;
}

// Find the line in sdpLines that starts with |prefix|, and, if specified,
// contains |substr| (case-insensitive search).
function findLine(sdpLines, prefix, substr) {
  return findLineInRange(sdpLines, 0, -1, prefix, substr);
}

// Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
// and, if specified, contains |substr| (case-insensitive search).
function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
  const realEndLine = endLine !== -1 ? endLine : sdpLines.length;
  for (let i = startLine; i < realEndLine; ++i) {
    if (sdpLines[i].indexOf(prefix) === 0) {
      if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
        return i;
      }
    }
  }
  return null;
}

// Gets the codec payload type from sdp lines.
function getCodecPayloadType(sdpLines, codec) {
  const index = findLine(sdpLines, 'a=rtpmap', codec);
  return index ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
}

// Gets the codec payload type from an a=rtpmap:X line.
function getCodecPayloadTypeFromLine(sdpLine) {
  const pattern = new RegExp('a=rtpmap:(\\d+) [a-zA-Z0-9-]+\\/\\d+');
  const result = sdpLine.match(pattern);
  return (result && result.length === 2) ? result[1] : null;
}

// Returns a new m= line with the specified codec as the first one.
function setDefaultCodec(mLine, payload) {
  const elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  const newLine = elements.slice(0, 3);

  // Put target payload first and copy in the rest.
  newLine.push(payload);
  for (let i = 3; i < elements.length; i++) {
    if (elements[i] !== payload) {
      newLine.push(elements[i]);
    }
  }
  return newLine.join(' ');
}

/* Below are newly added functions */

// Following codecs will not be removed from SDP event they are not in the
// user-specified codec list.
const audioCodecWhiteList = ['CN', 'telephone-event'];
const videoCodecWhiteList = ['red', 'ulpfec'];

// Returns a new m= line with the specified codec order.
function setCodecOrder(mLine, payloads) {
  const elements = mLine.split(' ');

  // Just copy the first three parameters; codec order starts on fourth.
  let newLine = elements.slice(0, 3);

  // Concat payload types.
  newLine = newLine.concat(payloads);

  return newLine.join(' ');
}

// Append RTX payloads for existing payloads.
function appendRtxPayloads(sdpLines, payloads) {
  for (const payload of payloads) {
    const index = findLine(sdpLines, 'a=fmtp', 'apt=' + payload);
    if (index !== null) {
      const fmtpLine = parseFmtpLine(sdpLines[index]);
      payloads.push(fmtpLine.pt);
    }
  }
  return payloads;
}

// Remove a codec with all its associated a lines.
function removeCodecFramALine(sdpLines, payload) {
  const pattern = new RegExp('a=(rtpmap|rtcp-fb|fmtp):'+payload+'\\s');
  for (let i=sdpLines.length-1; i>0; i--) {
    if (sdpLines[i].match(pattern)) {
      sdpLines.splice(i, 1);
    }
  }
  return sdpLines;
}

// Reorder codecs in m-line according the order of |codecs|. Remove codecs from
// m-line if it is not present in |codecs|
// The format of |codec| is 'NAME/RATE', e.g. 'opus/48000'.
export function reorderCodecs(sdp, type, codecs) {
  if (!codecs || codecs.length === 0) {
    return sdp;
  }

  codecs = type === 'audio' ? codecs.concat(audioCodecWhiteList) : codecs.concat(
      videoCodecWhiteList);

  let sdpLines = sdp.split('\r\n');

  // Search for m line.
  const mLineIndex = findLine(sdpLines, 'm=', type);
  if (mLineIndex === null) {
    return sdp;
  }

  const originPayloads = sdpLines[mLineIndex].split(' ');
  originPayloads.splice(0, 3);

  // If the codec is available, set it as the default in m line.
  let payloads = [];
  for (const codec of codecs) {
    for (let i = 0; i < sdpLines.length; i++) {
      const index = findLineInRange(sdpLines, i, -1, 'a=rtpmap', codec);
      if (index !== null) {
        const payload = getCodecPayloadTypeFromLine(sdpLines[index]);
        if (payload) {
          payloads.push(payload);
          i = index;
        }
      }
    }
  }
  payloads = appendRtxPayloads(sdpLines, payloads);
  sdpLines[mLineIndex] = setCodecOrder(sdpLines[mLineIndex], payloads);

  // Remove a lines.
  for (const payload of originPayloads) {
    if (payloads.indexOf(payload)===-1) {
      sdpLines = removeCodecFramALine(sdpLines, payload);
    }
  }

  sdp = sdpLines.join('\r\n');
  return sdp;
}

// Add legacy simulcast.
export function addLegacySimulcast(sdp, type, numStreams) {
  if (!numStreams || !(numStreams > 1)) {
    return sdp;
  }

  let sdpLines = sdp.split('\r\n');
  // Search for m line.
  const mLineStart = findLine(sdpLines, 'm=', type);
  if (mLineStart === null) {
    return sdp;
  }
  let mLineEnd = findLineInRange(sdpLines, mLineStart + 1, -1, 'm=');
  if (mLineEnd === null) {
    mLineEnd = sdpLines.length;
  }

  const ssrcGetter = (line) => {
    const parts = line.split(' ');
    const ssrc = parts[0].split(':')[1];
    return ssrc;
  };

  // Process ssrc lines from mLineIndex.
  const removes = new Set();
  const ssrcs = new Set();
  const gssrcs = new Set();
  const simLines = [];
  const simGroupLines = [];
  let i = mLineStart + 1;
  while (i < mLineEnd) {
    const line = sdpLines[i];
    if (line === '') {
      break;
    }
    if (line.indexOf('a=ssrc:') > -1) {
      const ssrc = ssrcGetter(sdpLines[i]);
      ssrcs.add(ssrc);
      if (line.indexOf('cname') > -1 || line.indexOf('msid') > -1) {
        for (let j = 1; j < numStreams; j++) {
          const nssrc = (parseInt(ssrc) + j) + '';
          simLines.push(line.replace(ssrc, nssrc));
        }
      } else {
        removes.add(line);
      }
    }
    if (line.indexOf('a=ssrc-group:FID') > -1) {
      const parts = line.split(' ');
      gssrcs.add(parts[2]);
      for (let j = 1; j < numStreams; j++) {
        const nssrc1 = (parseInt(parts[1]) + j) + '';
        const nssrc2 = (parseInt(parts[2]) + j) + '';
        simGroupLines.push(
          line.replace(parts[1], nssrc1).replace(parts[2], nssrc2));
      }
    }
    i++;
  }

  const insertPos = i;
  ssrcs.forEach(ssrc => {
    if (!gssrcs.has(ssrc)) {
      let groupLine = 'a=ssrc-group:SIM';
      groupLine = groupLine + ' ' + ssrc;
      for (let j = 1; j < numStreams; j++) {
        groupLine = groupLine + ' ' + (parseInt(ssrc) + j);
      }
      simGroupLines.push(groupLine);
    }
  });

  simLines.sort();
  // Insert simulcast ssrc lines.
  sdpLines.splice(insertPos, 0, ...simGroupLines);
  sdpLines.splice(insertPos, 0, ...simLines);
  sdpLines = sdpLines.filter(line => !removes.has(line));

  sdp = sdpLines.join('\r\n');
  return sdp;
}

export function setMaxBitrate(sdp, encodingParametersList) {
  for (const encodingParameters of encodingParametersList) {
    if (encodingParameters.maxBitrate) {
      sdp = setCodecParam(
          sdp, encodingParameters.codec.name, 'x-google-max-bitrate',
          (encodingParameters.maxBitrate).toString());
    }
  }
  return sdp;
}
