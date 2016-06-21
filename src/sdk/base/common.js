/*global adapter, attachMediaStream:true*/

/*
 * Woogeen.Common provides common functions for WooGeen SDK
 */
Woogeen.Common = Object.create({});

// Convert W3C defined statistic data to SDK format.
// TODO: stats data is Chrome specified at this time. So this function only
// supports Chrome now.
Woogeen.Common.parseStats = function(stats) {
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

/*
 * Following UI code is for backward compability. Delete it when it is old enough.
 * Detailed reason: we provide global function |attachMediaStream| in the old adapter.js. However, it has been move to adapter.browserShim.attachMediaStream in the latest code, and it will be removed in the future. We should modify adapter.js as less as possible. So we provide |attachMediaStream| in Woogeen.UI namespace.
 */
attachMediaStream = function(){
  L.Logger.warning('Global attachMediaStream is deprecated, pleause include woogeen.sdk.ui.js and use Woogeen.UI.attachMediaStream instead.');
  adapter.browserShim.attachMediaStream.apply(this, arguments);
};
