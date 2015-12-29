Format Description
------------------

# Audio_Levels {#audiolevel}
The format of Audio_Levels object is:<br>
~~~~~~{.js}
        Audio_Levels = {
            "audioInputLevels":[{
                "ssrc":id_of_audio_stream,
                "level": level_value}, ...],
            "audioOutputLevels": [{
                "ssrc":id_of_audio_stream,
                "level": level_value}, ...]}
        }
~~~~~~
It is valid either audioInputLevels or audioOutputLevels member does not exist, or the value array of them is null.<br>
For API user who want to get the audio level from MIC, they can get the audioInputLevels array and from each item in the array, read the "level" value.<br>
For API users who want to get the audio level output to speaker, they can get the audioOutputLevels array from each item in the array, read the "level" value.<br>

# Parse and Understand the JS Statistics {#parse}
The caller of statistics API should setup a periodical timer, in which getConnectionStats API is called, and in the successCallback, you retrieve the Stat_Reports object and record the timestamp this report is returned.
To parse the Stat_Reports object named Stats:<br>

1. Get the length of the reports:<br>
~~~~~~{.js}
var statLength = Stats.length;
~~~~~~
2. Retrieve each Report_Entry object by:<br>
~~~~~~{.js}
var curStat = Stats[i];
~~~~~~
where i=0 to statsLength-1;<br>
3. Get the report type of each Report_Entry object:<br>
~~~~~~{.js}
var reportType = curStat.type;
var curReport = curStat.stats;
var id = curStat.id;
~~~~~~
    There are 5 types of reports as supported by the JS SDK: ssrc_audio_send,  ssrc_video_send,  ssrc_audio_recv, ssrc_video_recv, and VideoBWE.<br>
     For all ssrc_* types, the id field indicates the stream lable bounded to that ssrc.  For VidoeBWE type, the id field is left as empty string.<br>
4. Proceed to proccess each Report_Entry object according to its type:<br>
~~~~~~{.js}
    if ( reportType == "ssrc_audio_send" ){
    　　//This is bytes that has been sent for this audio stream after the peer connection is setup.
      var bytes_sent = curReport.bytes_sent;
      //This is RTP packets that has been sent over for this audio stream after the peer connection is setup.
      var packets_sent = curReport.packets_sent;
      //This is RTP packets that is lost for this audio stream after the peer connection is setup.
      var packets_lost = curReport.packets_lost;
      //Round trip time in ms measured by the stack when retrieving the statistics for this audio stream.
      var rtt_ms = curReport.rtt_ms;
      //Audio encoder used for this audio stream.
      var codec_name = curReport.codec_name;
    }
   else if (reportType == "ssrc_audio_recv" ){
      //This is bytes that has been received for this audio stream after the peer connection is setup;
     　var bytes_recv = curReport.bytes_rcvd;
     　//This is RTP packets that has been received for this audio stream after the peer connection is setup.
     　var packets_recv = curReport.packets_rcvd;
     　//This is RTP packets that has been lost for this audio stream after the peer connection is setup.
    　 var packets_lost = curReport.packets_lost;
    　 //Current e2e delay in ms as estimated by the stack for this audio stream.
    　 var delay_estimated_ms = curReport.delay_estimated_ms;
    　 //audio decoder used for this audio stream;
    　 var codec_name = curReport.codec_name;
   }
  　else if ( reportType == "ssrc_video_send" ){
  　   //This is bytes that has been sent for this video stream after the peer connection is setup.
      var bytes_sent = curReport.bytes_sent;
      //This is RTP packets that has been sent over for this video stream after the peer connection is setup.
      var packets_sent = curReport.packets_sent;
      //This is RTP packets that is lost for this video stream after the peer connection is setup.
      var packets_lost = curReport.packets_lost;
      //round trip time in ms measured by the stack when retrieving the statistics for this video stream.
      var rtt_ms = curReport.rtt_ms;
      //video encoder used for this video stream.
      var codec_name = curReport.codec_name;
      //FIR packets received from the remote end for this video stream afte the peer connection is setup.
      var firs_rcvd = curReport.firs_rcvd;
      //NACK packets received from the remote end for this video stream after the peer connection is setup.
      var nacks_rcvd = curReport.nacks_rcvd;
      //PLI packets received from the remote end for this video stream after the peer connection is setup.
      var plis_rcvd = curReport.plis_rcvd;
      //current frame height that is sent to remote for this video stream. this is not neccessarily to be the capture frame height.
      var send_frame_height = curReport.send_frame_height;
      //current frame width that is sent to remote for this video stream; this is not neccessarily to be the capture frame width.
      var send_frame_width = curReport.send_frame_width;
      //current frame rate of the video stream sending to remote peer. This is not neccessarily to be the capture frame rate.
      var framerate_sent = curReport.framerate_sent;
      // If there is a resolution degrade on the sent video stream, for example, from VGA to CIF, this field shows the reason for
      // most recent resolution change.
      // if last_adapt_reason = 1,  the resolution change is because of high CPU usage;
      // if last_adapt_reason = 2, the resolution change is caused by current available bandwidth for sending the stream is too low.
      // If last_adpat_reason = 3, the resolution change is view renderer is at heavy load.
      // If last_adapt_reason = 99, there is no resolution degrade recently.
      var last_adapt_reason = curReport.adapt_reason;
      // how many resolution degradation has happend on this video stream since the peer connection is setup.
      var adapt_changes = curReport.adapt_reason;
   }
   if ( reportType == "ssrc_video_recv") {
   　　　//This is bytes that has been received for this video stream after the peer connection is setup;
      var bytes_recv = curReport.bytes_rcvd;
      //This is RTP packets that has been received for this video stream after the peer connection is setup.
      var packets_recv = curReport.packets_rcvd;
      //This is RTP packets that has been lost for this video stream after the peer connection is setup.
      var packets_lost = curReport.packets_lost;
      //Current e2e delay in ms as estimated by the stack for this video stream.
      var current_delay_ms = curReport.current_delay_ms;
      //video decoder used for this video stream;
      var codec_name = curReport.codec_name;
      //FIR packets sent from local end for this video stream afte the peer connection is setup.
      var firs_sent = curReport.firs_sent;
      //NACK packets sent from local end for this video stream after the peer connection is setup.
      var nacks_rcvd = curReport.nacks_rcvd;
      //PLI packets sent from local end for this video stream after the peer connection is setup.
      var plis_rcvd = curReport.plis_rcvd;
      //current frame height that is received for this video stream.
      var frame_height = curReport.frame_height;
      //current frame width that is received for this video stream.
      var frame_width = curReport.frame_width;
      //current frame rate of the video stream received from remote peerr. This is not neccessarily to be the rendered frame rate.
      var framerate_rcvd = curReport.framerate_rcvd;
      //current rendered frame rate on this video stream.  This is usually smaller or equal to received frame rate.
      var framereate_output = curReport.framerate_output;
   }
   if (reportType == "VideoBWE"){
   　　　//the estimated available send bandwidth on local peer, in kbps.
      var available_send_bandwidth = curReport.available_send_bandwidth;
      //the estimated avaiable receive bandwidth on local peer in kbps.
      var available_recv_bandwidth = curReport.available_receive_bandwidth;
      //the current total sending bitrate of the video channels, in kbps;
      var trasmit_bitrate = curReport.transmit_bitrate;
      //the current total re-trasmitting bitrate of the video channels, in kbps
      var retransmit_bitrate = curReport.retransmit_bitrate;
   }
~~~~~~

# How to Analyze the Connection Status {#status}

1. To analyze the average outgoing bitrate of all video streams on local peer during checkpoint time A and B (B>A)<br>
 * Get all ssrc report of type "ssrc_video_send" at time A, sum up the .bytes_sent on those reports as A.total_bytes_sent;<br>
 * Get all ssrc report of type "ssrc_video_send" at time B, sum up the .bytes_sent on those reports as B.total_bytes_sent;<br>
 * Calcluate the average sending bitrate during A and B by: AvgVideoSentKbps = (B.total_bytes_sent - A.total_bytes_sent)/(B-A);<br>

If AvgVideoSentKbps is much smaller than bandwidth preset for this peerclient, it will indicate connection is not good or the endpoint processing capability is not good.<br>

2. To analyze the packet lost ratio of the network for all outgoing video streams during checkpoint time A and B (B>A)<br>

 * Get all ssrc report of type "ssrc_video_send" at time A, sum up the .packets_lost and .packets_sent as A.total_packets_lost and A.total_packets_sent;<br>
 * Get all ssrc report of type "ssrc_video_send" at time B, sum up the .packets_lost and .packets_sent as B.total_packets_lost and B.total_packets_sent;<br>
 * Calculate the packet lost ratio during A and B by:AvgPkgLossRatio = (B.total_packets_lost-A.total_packets_lost)/(B.total_packets_sent - A.total_packets_sent);<br>
Non-zero packet loss ratio indicates the outgoing link status is not good.<br>

3. To analyze the RTT for each sending video stream, and estimated delay for receiving each video stream <br>

  * At each checkpoint, you get .rtt_ms of each ssrc_video_send report;<br>
  * At each checkpoint, you get .current_delay_ms for each ssrc_video_recv report. High RTT and delay indicates band network condition, that the network latency is high.<br>

4. When packet lost ratio is high, you can check the RTCP feedbacks during time period A and B.<br>

 * On ssrc_video_send report, if you continuously get a lot of PLIs/FIRs/NACKs during A and B by checking .plis_rcvd/firs_rcvd/nacks_rcvd delta , this indicates how the receiver is responding to the packet loss.<br>
 * On ssrc_video_recv report, if you continously get a lot of PLIs/FIRs/NACKS during A and B by checking .plis_sent/firs_sent/nacks_sent delta, this indicates how local receiver is resonding to the packet loss.<br>

5. When you observe bad image quality as reflected by the remote peer, you can check locally for the possible reason: <br>

 * On ssrc_video_send report, check the .adapt_reason field. If adapt_reason = 1, this indicates your local host is not capable to handle higher resolution due to heavy workload, so it degrades the resolution. If adapt_reason = 2, this indicates the local stack detects the available send/receive bandwidth for outgoing stream is not sufficient to maintian current resolution. if adapt_reason = 3, this indicates the local stack's rendering system is not capable of maintianing high resolution due to heavy workload. <br>
 * You can further check the sent frame rate and frame resolution by check .send_frame_width/send_frame_height/framerate_sent.<br>

6. The VideoBWE report type also helps to indicate the estimated available bandwidth and actual bandwidth for the video engine:<br>

 *  Get the estimated bandwidth your local peer can accept/send video streams by checking .available_receive_bandwidth & .available_send_bandwidth;<br>
 * Get the current acutal total send/retransimit bandwidth that flows over the video engine by checking .trasmit_bitrate & .retrasmit_bitrate;<br>
It's suggested you use the bytes_sent field of each ssrc_video_send to get details of each stream, instead of relying on VideoBWE as the indicator.<br>

7. To analyze the average incoming bitrate of all video streams on local peer during checkpoint time A and B (B>A)<br>

 * Get all ssrc report of type "ssrc_video_recv" at time A, sum up the .bytes_rcvd on those reports as A.total_bytes_rcvd;<br>
 * Get all ssrc report of type "ssrc_video_recv" at time B, sum up the .bytes_rcvd on those reports as B.total_bytes_rcvd;<br>
 * Calcluate the average receiving bitrate during A and B by: AvgVideoRecvKbps = (B.total_bytes_rcvd - A.total_bytes_rcvd)/(B-A);<br>
If AvgVideoRcvdKbps is much smaller than bandwidth preset for remote peerclient, it will indicate connection is not good or the endpoint processing capability is not good.<br>

8. To analyze the packet lost ratio of the network for all incoming video streams during checkpoint time A and B (B>A)<br>

 * Get all ssrc report of type "ssrc_video_rcvd" at time A, sum up the .packets_lost and .packets_rcvd as A.total_packets_lost and A.total_packets_rcvd;<br>
 * Get all ssrc report of type "ssrc_video_rcvd" at time B, sum up the .packets_lost and .packets_rcvd as B.total_packets_lost and B.total_packets_rcvd;<br>
 * Calculate the packet lost ratio during A and B by: AvgPkgLossRatio = (B.total_packets_lost-A.total_packets_lost)/(B.total_packets_sent - A.total_packets_sent);<br>

Non-zero packet loss ratio indicates the incoming link stus not good.<br>
