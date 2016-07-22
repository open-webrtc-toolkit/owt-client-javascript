/*global adapter, attachMediaStream:true*/

/*
 * Woogeen.Common provides common functions for WooGeen SDK
 */
Woogeen.Common = (function(){
  // Convert W3C defined statistic data to SDK format.
  // TODO: stats data is Chrome specified at this time. So this function only
  // supports Chrome now.
  var parseStats = function(stats) {
    'use strict';
    var index = 0;
    var statusReport = [];
    var result = stats.result();
    for (var i = 0; i < result.length; i++) {
      var res = result[i];
      var curStat;
      var match = false;
      if (res.type === "ssrc") {
        // This is a ssrc report. Check if it is send/recv
        match = true;
        if (res.stat("bytesSent")) {
          // check if it"s audio or video
          if (res.stat("googFrameHeightSent")) {
            // video send
            var adaptReason;
            if (res.stat("googCpuLimitedResolution") === true) {
              adaptReason = 1;
            } else if (res.stat("googBandwidthLimitedResolution") === true) {
              adaptReason = 2;
            } else if (res.stat("googViewLimitedResolution") === true) {
              adaptReason = 3;
            } else {
              adaptReason = 99;
            }
            curStat = {
              "type": "ssrc_video_send",
              "id": res.id,
              "stats": {
                "bytes_sent": res.stat("bytesSent"),
                "codec_name": res.stat("googCodecName"),
                "packets_sent": res.stat("packetsSent"),
                "packets_lost": res.stat("packetsLost"),
                "firs_rcvd": res.stat("googFirsReceived"),
                "plis_rcvd": res.stat("googPlisReceived"),
                "nacks_rcvd": res.stat("googNacksReceived"),
                "send_frame_width": res.stat("googFrameWidthSent"),
                "send_rame_height": res.stat("googFrameHeightSent"),
                "adapt_reason": adaptReason,
                "adapt_changes": res.stat("googAdaptationChanges"),
                "framerate_sent": res.stat("googFrameRateSent"),
                "rtt_ms": res.stat("googRtt")
              }
            };
          } else {
            // audio send
            curStat = {
              "type": "ssrc_audio_send",
              "id": res.id,
              "stats": {
                "bytes_sent": res.stat("bytesSent"),
                "codec_name": res.stat("googCodecName"),
                "packets_sent": res.stat("packetsSent"),
                "packets_lost": res.stat("packetsLost"),
                "rtt_ms": res.stat("googRtt")
              }
            };
          }
        } else {
          // this is ssrc receive report.
          if (res.stat("googFrameHeightReceived")) {
            // video receive
            curStat = {
              "type": "ssrc_video_recv",
              "id": res.id,
              "stats": {
                "bytes_rcvd": res.stat("bytesReceived"),
                "packets_rcvd": res.stat("packetsReceived"),
                "packets_lost": res.stat("packetsLost"),
                "firs_sent": res.stat("googFirsSent"),
                "nacks_sent": res.stat("googNacksSent"),
                "plis_sent": res.stat("googPlisSent"),
                "frame_width": res.stat("googFrameWidthReceived"),
                "frame_height": res.stat("googFrameHeightReceived"),
                "framerate_rcvd": res.stat("googFrameRateReceived"),
                "framerate_output": res.stat("googFrameRateDecoded"),
                "current_delay_ms": res.stat("googCurrentDelayMs"),
                "codec_name": res.stat("googCodecName")
              }
            };
          } else {
            // audio receive
            curStat = {
              "type": "ssrc_audio_recv",
              "id": res.id,
              "stats": {
                "bytes_rcvd": res.stat("bytesReceived"),
                "delay_estimated_ms": res.stat("googCurrentDelayMs"),
                "packets_rcvd": res.stat("packetsReceived"),
                "packets_lost": res.stat("packetsLost"),
                "codec_name": res.stat("googCodecName")
              }
            };
          }
        }
      } else if (res.type === "VideoBwe") {
        match = true;
        curStat = {
          "type": "VideoBWE",
          "id": "",
          "stats": {
            "available_send_bandwidth": res.stat("googAvailableSendBandwidth"),
            "available_receive_bandwidth":
                res.stat("googAvailableReceiveBandwidth"),
            "transmit_bitrate": res.stat("googTransmitBitrate"),
            "retransmit_bitrate": res.stat("googRetransmitBitrate")
          }
        };
      }
      if (match) {
        statusReport[index] = curStat;
        index++;
      }
    }
    return statusReport;
  };

/* Following functions are copied from apprtc with modifications */

  // Find the line in sdpLines that starts with |prefix|, and, if specified,
  // contains |substr| (case-insensitive search).
  function findLine(sdpLines, prefix, substr) {
    return findLineInRange(sdpLines, 0, -1, prefix, substr);
  }

  // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
  // and, if specified, contains |substr| (case-insensitive search).
  function findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
    var realEndLine = endLine !== -1 ? endLine : sdpLines.length;
    for (var i = startLine; i < realEndLine; ++i) {
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
    var index = findLine(sdpLines, 'a=rtpmap', codec);
    return index ? getCodecPayloadTypeFromLine(sdpLines[index]) : null;
  }

  // Gets the codec payload type from an a=rtpmap:X line.
  function getCodecPayloadTypeFromLine(sdpLine) {
    var pattern = new RegExp('a=rtpmap:(\\d+) [a-zA-Z0-9-]+\\/\\d+', 'i');
    var result = sdpLine.match(pattern);
    return (result && result.length === 2) ? result[1] : null;
  }

  // Returns a new m= line with the specified codec as the first one.
  function setDefaultCodec(mLine, payload) {
    var elements = mLine.split(' ');

    // Just copy the first three parameters; codec order starts on fourth.
    var newLine = elements.slice(0, 3);

    // Put target payload first and copy in the rest.
    newLine.push(payload);
    for (var i = 3; i < elements.length; i++) {
      if (elements[i] !== payload) {
        newLine.push(elements[i]);
      }
    }
    return newLine.join(' ');
  }

  // Modify m-line. Put preferred payload type in the front of other types.
  // mediaType is 'audio' or 'video'.
  var setPreferredCodec = function(sdp, mediaType, codecName){
    if(!mediaType||!codecName){
      L.Logger.warning('Media type or codec name is not provided.');
      return sdp;
    }

    var sdpLines = sdp.split('\r\n');

    // Search for m line.
    var mLineIndex = findLine(sdpLines, 'm=', mediaType);
    if (mLineIndex === null) {
      return sdp;
    }

    // If the codec is available, set it as the default in m line.
    var payload = getCodecPayloadType(sdpLines, codecName);
    if (payload) {
      sdpLines[mLineIndex] = setDefaultCodec(sdpLines[mLineIndex], payload);
    }

    sdp = sdpLines.join('\r\n');
    return sdp;
  };

/* Above functions are copied from apprtc with modifications */

  return {
    parseStats: parseStats,
    setPreferredCodec: setPreferredCodec
  };
}());

/*
 * Following UI code is for backward compability. Delete it when it is old enough.
 * Detailed reason: we provide global function |attachMediaStream| in the old adapter.js. However, it has been move to adapter.browserShim.attachMediaStream in the latest code, and it will be removed in the future. We should modify adapter.js as less as possible. So we provide |attachMediaStream| in Woogeen.UI namespace.
 */
attachMediaStream = function(){
  L.Logger.warning('Global attachMediaStream is deprecated, pleause include woogeen.sdk.ui.js and use Woogeen.UI.attachMediaStream instead.');
  adapter.browserShim.attachMediaStream.apply(this, arguments);
};
