/* global Gab,room,RTCIceCandidate,RTCSessionDescription,getPeerConnectionAudioLevels,remoteIceCandidates*/
/* Depend on woogeen.js, gab-websocket.js, WooGeen.Error.js*/

var Woogeen = Woogeen || {}; /*jshint ignore:line*/ //Woogeen is defined.
/**
 * @class Woogeen.PeerClient
 * @classDesc Sets up one-to-one video chat for two clients. It provides methods to initialize or stop a video call or to join a P2P chat room. This object can start a chat when another client joins the same chat room.
    <br><b>Remarks:</b><br>
The following list briefly describes the URIs:<br>
@htmlonly
<table class="doxtable">
    <tr>
        <th>bandWidth</th>
        <td>(Optional) Defines the bandwidth in kbps for any video streams sent by this peer client. Currently only maxVideoBW option is supported, to limit maximum bandwidth of any outgoing video stream.</td>
    </tr>
    <tr>
        <th>iceServers</th>
        <td>Each ICE server instance has three properties: URIs, username (optional), credential (optional).</td>
    </tr>
<tbody>
    <tr>
        <th>URIs</th>
        <td>Could be an array of STUN/TURN server URIs which shared the same username and credential, or a string of STUN/TURN for a server's URI.</td>
    </tr>
    <tr>
        <th>stun</th>
        <td>This URI is defined at http://tools.ietf.org/html/draft-nandakumar-rtcweb-stun-uri-08.</td>
    </tr>
    <tr>
        <th>turn</th>
        <td>This URI is defined at http://tools.ietf.org/html/rfc5766</td>
    </tr>
</tbody>
</table>
@endhtmlonly
*/
/**
 * @function PeerClient
 * @desc Constructor of PeerClient
 * @memberOf Woogeen.PeerClient
 * @param {json} config (Optional)Specifies the configurations for the peer client object. This parameter is the property of config: iceServers.
 * @return {Woogeen.PeerClient} An instance of Woogeen.PeerClient.
 * @example
var p2p=new Woogeen.PeerClient({
  bandWidth:{maxVideoBW:300},
  iceServers : [{
    urls : "stun:61.152.239.60"
  }, {
    urls : ["turn:61.152.239.60:3478?transport=tcp", "turn:61.152.239.60:3478?transport=udp"],
    credential : "master",
    username : "woogeen"
  }]
});
 */
Woogeen.PeerClient=function (pcConfig) {
  'use strict';

  var that = Woogeen.EventDispatcher({});

  var PeerState={
    READY:1,  // Ready to chat.
    MATCHED:2,  // Another client joined the same room.
    OFFERED:3,  // Sent invitation to remote user.
    PENDING:4,  // Received an invitation.
    CONNECTING:5,  // Exchange SDP and prepare for video chat.
    CONNECTED:6,  // Chat.
    ERROR:9  // Haven't been used yet.
  };

  var NegotiationState={
    READY:1,
    REQUESTED:2,
    ACCEPTED:3,
    NEGOTIATING:4
  };

  var DataChannelLabel={
    MESSAGE:'message',
    FILE:'file'
  };

  var spec = pcConfig ? pcConfig.bandWidth : undefined;

  /**
   * @function isArray
   * @desc Test if an object is an array.
   * @return {boolean} DESCRIPTION
   * @private
   */
  var isArray=function(obj){
    return (Object.prototype.toString.call(obj) === '[object Array]');
  };

  var pcDisconnectTimeout=15000;  // Close peerconnection after disconnect 15s.

  var connectSuccessCallback;  // Callback for connect success.
  var connectFailureCallback;  // Callback for connect failure.

  var gab=null;
  var peers={};  // A map, key is target's UID, and value is an object with status and connection.
  var streams={}; //A map, key is the stream's ID, and the value is : audio, video or screen.
  var chats={};  // Same as room.
  var myId=null;
  var roomStreams={};
  var isConnectedToSignalingChannel=false;
  var streamPeers={};  // Key is stream id, value is an array of peer id.

  var pcConstraints={ 'optional': [{'DtlsSrtpKeyAgreement': 'true'}]};
  //var pcConstraints=null;
  //var dataConstraints = {'ordered': true,
  //                     'maxRetransmitTime': 3000,  // in milliseconds
  //                     'protocol': 'SCTP'
  //                    };
  var dataConstraints=null;
  var sdpConstraints={'offerToReceiveAudio':true, 'offerToReceiveVideo':true };
  var config = null;

  var sysInfo = Woogeen.Common.sysInfo();
  var supportsPlanB = navigator.mozGetUserMedia?false:true;
  var supportsUnifiedPlan = navigator.mozGetUserMedia?true:false;

  // Set configuration for PeerConnection
  if(pcConfig){
    config={iceServers: pcConfig.iceServers};
  }

  /*
   * Return negative value if id1<id2, positive value if id1>id2
   */
  var compareID=function(id1, id2){
    return id1.localeCompare(id2);
  };

  // If targetId is peerId, then return targetId.
  var getPeerId=function(targetId){
    return targetId;
  };

  var changeNegotiationState=function(peer, state){
    peer.negotiationState=state;
  };

  // Do stop chat locally.
  var stopChatLocally=function(peer,originatorId){
    if(peer.state===PeerState.CONNECTED||peer.state===PeerState.CONNECTING){
      if(peer.sendDataChannel){
        peer.sendDataChannel.close();
      }
      if(peer.receiveDataChannel){
        peer.receiveDataChannel.close();
      }
      if(peer.connection&&peer.connection.iceConnectionState!=='closed'){
        peer.connection.close();
      }
      if(peer.state!==PeerState.READY){
        peer.state=PeerState.READY;
        that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-stopped',peerId:peer.id, senderId: originatorId}));
      }
      // Unbind events for the pc, so the old pc will not impact new peerconnections created for the same target later.
      unbindEvetsToPeerConnection(peer.connection);
    }
  };

  var handleRemoteCapability = function(peer, ua){
    if(ua.sdk&&ua.sdk&&ua.sdk.type==="JavaScript"&&ua.runtime&&ua.runtime.name==="FireFox"){
      peer.remoteSideSupportsRemoveStream=false;
      peer.remoteSideSupportsPlanB=false;
      peer.remoteSideSupportsUnifiedPlan=true;
    } else {  // Remote side is iOS/Android/C++ which uses Chrome stack.
      peer.remoteSideSupportsRemoveStream=true;
      peer.remoteSideSupportsPlanB=true;
      peer.remoteSideSupportsUnifiedPlan=false;
    }
  };

  /* Event handlers name convention:
   *
   * **Handler for network events.
   * on** for PeerConnection events.
   */

  var connectedHandler=function(){
    isConnectedToSignalingChannel=true;
  };

  var connectFailedHandler=function(){
    if(connectFailureCallback){
      connectFailureCallback();
    }
    connectSuccessCallback = undefined;
    connectFailureCallback = undefined;
  };

  var disconnectedHandler=function(){
    isConnectedToSignalingChannel=false;
    that.dispatchEvent(new Woogeen.ClientEvent({type: 'server-disconnected'}));
  };

  var chatInvitationHandler=function(senderId, ua){
    // !peers[senderId] means this peer haven't been interacted before, so we
    // can treat it as READY.
    var peer=peers[senderId];
    if(!peer){
      // Initialize a peer in peers array for new interacted peer
      createPeer(senderId);
      peer=peers[senderId];
    }
    handleRemoteCapability(peer, ua);
    if(peer.state===PeerState.READY || peer.state===PeerState.PENDING){
      peers[senderId].state=PeerState.PENDING;
      that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-invited', senderId: senderId}));
    }
    // If both sides send invitation, the client with smaller ID send accept.
    else if(peer.state===PeerState.OFFERED&&(compareID(myId,senderId)<0)){
      peer.state=PeerState.PENDING;
      accept(senderId, function(){
        that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-accepted', senderId: senderId}));
      });
    }
  };

  var chatDeniedHandler=function(senderId){
    var peer=peers[senderId];
    if(peer&&peer.connection){
      // Close PeerConnection if it has been established for this sender.
      if(peer.sendDataChannel){
         peer.sendDataChannel.close();
       }
      if(peer.receiveDataChannel){
         peer.receiveDataChannel.close();
       }
      peer.connection.close();
    }
    // Delete this peer's information from peers list since the
    // chat is stopped.
    delete peers[senderId];
    that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-denied', senderId: senderId}));
  };

  var chatAcceptedHandler=function(senderId, ua){
    L.Logger.debug('Received chat accepted.');
    var peer=peers[senderId];
    if(peer){
      peer.state=PeerState.MATCHED;
      handleRemoteCapability(peer, ua);
      createPeerConnection(peer);
      peer.state=PeerState.CONNECTING;
      createDataChannel(peer.id);  // PeerConnection without streams and data channel is not allowed by FireFox.
      that.dispatchEvent(new Woogeen.ChatEvent({type: 'chat-accepted', senderId: senderId}));
    }
  };

  // Chat stop is very similar with chat denied
  var chatStoppedHandler=function(senderId){
    var peer=peers[senderId];
    if(peer&&peer.connection){
      stopChatLocally(peer,senderId);
    }
    delete peers[senderId];
  };

  var chatSignalHandler=function(message, senderId){
    var peer=peers[senderId];
    if(peer&&peer.state===PeerState.CONNECTING){
      if(!peer.connection){
        createPeerConnection(peer);
      }
    }
      SignalingMessageHandler(peer,message);
  };

  var streamTypeHandler=function(message, senderId){/*jshint ignore:line*/ //sendId is unused.
    streams[message.streamId] = message.type;
    L.Logger.debug('remote stream ID:'+ message.streamId + ',type:'+streams[message.streamId]);
  };

  var authenticatedHandler=function(uid){
    myId=uid;
    if(connectSuccessCallback){
      connectSuccessCallback(uid);
    }
    connectSuccessCallback = undefined;
    connectFailureCallback = undefined;
  };

  var forceDisconnectHandler=function(){
    stop();
  };

  var onNegotiationneeded=function(peer){
    L.Logger.debug('On negotiation needed.');
    if(peer.isCaller&&peer.connection.signalingState==='stable'&&peer.negotiationState===NegotiationState.READY){
      doRenegotiate(peer);
    } else if(!peer.isCaller && gab){
      gab.sendNegotiationNeeded(peer.id);
    } else {
      peer.isNegotiationNeeded=true;
    }
  };

  var onLocalIceCandidate=function(peer,event) {
    if (event.candidate && gab) {
      gab.sendSignalMessage(peer.id, {
        type : 'candidates',
        candidate : event.candidate.candidate,
        sdpMid : event.candidate.sdpMid,
        sdpMLineIndex : event.candidate.sdpMLineIndex
      });
    }
  };

  var onRemoteIceCandidate=function(peer,event){
    if(peer){
      L.Logger.debug('On remote ice candidate from peer '+peer.id);
    }
    if(peer&&(peer.state===PeerState.OFFERED||peer.state===PeerState.CONNECTING||peer.state===PeerState.CONNECTED)){
      var candidate = new RTCIceCandidate({
        candidate : event.message.candidate,
        sdpMid : event.message.sdpMid,
        sdpMLineIndex : event.message.sdpMLineIndex
      });
      if(peer.connection){
        L.Logger.debug('Add remote ice candidates.');
        peer.connection.addIceCandidate(candidate,onAddIceCandidateSuccess,onAddIceCandidateFailure);
      }
      else{
        L.Logger.debug('Cache remote ice candidates.');
        if(!peer.remoteIceCandidates){
          peer.remoteIceCandidates=[];
        }
        peer.remoteIceCandidates.push(candidate);
      }
    }
  };

  var onOffer=function(peer,event){
    if(!peer){
      L.Logger.debug('"peer" cannot be null or undefined');
      return;
    }

    switch(peer.state){
      case PeerState.OFFERED:
      case PeerState.MATCHED:
        peer.state=PeerState.CONNECTING;
        createPeerConnection(peer);/*jshint ignore:line*/ //Expected a break before case.
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        L.Logger.debug('About to set remote description. Signaling state: '+peer.connection.signalingState);
        peer.connection.setRemoteDescription(new RTCSessionDescription(event.message),function(){
          createAndSendAnswer(peer);
          drainIceCandidates(peer);
        },function(errorMessage){
          L.Logger.debug('Set remote description failed. Message: '+JSON.stringify(errorMessage));
        });
        break;
      default:
        L.Logger.debug('Unexpected peer state: '+peer.state);
    }
  };

  var onAnswer=function(peer,event){
    if (peer&&(peer.state===PeerState.CONNECTING||peer.state===PeerState.CONNECTED)){
      L.Logger.debug('About to set remote description. Signaling state: '+peer.connection.signalingState);
      peer.connection.setRemoteDescription(new RTCSessionDescription(event.message),function(){
        L.Logger.debug('Set remote descripiton successfully.');
        drainIceCandidates(peer);
        drainPendingMessages(peer);
      },function(errorMessage){
        L.Logger.debug('Set remote description failed. Message: ' + errorMessage);
      });
    }
  };

  var createRemoteStream=function(mediaStream,peer){
    var type=streams[mediaStream.id];
    if(!type){
      return null;
    }else{
      var streamSpec = {video:{}, audio:true};
      if(type === 'screen'){
        streamSpec.video.device='screen';
      }
      else{
        streamSpec.video.device='camera';
      }
      var stream= new Woogeen.RemoteStream(streamSpec);
      stream.mediaStream=mediaStream;
      stream.from=peer.id;
      return stream;
    }
  };

  var onRemoteStreamAdded=function(peer,event){
    L.Logger.debug('Remote stream added.');
    var stream=createRemoteStream(event.stream,peer);
    if(stream){
      var streamEvent = new Woogeen.StreamEvent({type:'stream-added', senderId:peer.id, stream:stream});
      that.dispatchEvent(streamEvent);
    }
  };

  var onRemoteStreamRemoved=function(peer,event){
    L.Logger.debug('Remote stream removed.');
    var stream=createRemoteStream(event.stream,peer);
    if(stream){
      var streamEvent = new Woogeen.StreamEvent({type:'stream-removed', stream:stream});
      that.dispatchEvent(streamEvent);
    }
  };

  var SignalingMessageHandler = function(peer,message) {
    L.Logger.debug('S->C: ' + JSON.stringify(message));
    if (message.type === 'offer') {
      onOffer(peer,{message:message});
    } else if (message.type === 'answer') {
      onAnswer(peer,{message:message});
    } else if (message.type === 'candidates') {
      onRemoteIceCandidate(peer,{message:message});
    }
  };

  var onIceConnectionStateChange=function(peer,event){ /*jshint ignore:line*/ //event is unused.
    if(peer){
      L.Logger.debug('Ice connection state changed. State: '+peer.connection.iceConnectionState);
      if(peer.connection.iceConnectionState==='closed'&&peer.state===PeerState.CONNECTED){
        stopChatLocally(peer, peer.id);
        if(gab){
          gab.sendChatStopped(peer.id);
        }
        delete peers[peer.id];
      }
      if(peer.connection.iceConnectionState==='connected' || peer.connection.iceConnectionState==='completed'){
        peer.lastDisconnect=(new Date('2099/12/31')).getTime();
        if(peer.state!==PeerState.CONNECTED){
          peer.state=PeerState.CONNECTED;
          that.dispatchEvent(new Woogeen.ChatEvent({type:'chat-started', peerId:peer.id}));
        }
      }
      if(peer.connection.iceConnectionState==='checking'){
        peer.lastDisconnect=(new Date('2099/12/31')).getTime();
      }
      if(peer.connection.iceConnectionState==='disconnected'){
        peer.lastDisconnect=(new Date()).getTime();
        setTimeout(function(){
          if((new Date()).getTime()-peer.lastDisconnect>=pcDisconnectTimeout){
            L.Logger.debug('Disconnect timeout.');
            stopChatLocally(peer, peer.id);
            // peers[peer.id] may be a new instance, we only want to delete the old one from peer list.
            if(peer===peers[peer.id]){
              delete peers[peer.id];
            }
          }
        }, pcDisconnectTimeout);
      }
    }
  };

  var onAddIceCandidateSuccess=function(){
    L.Logger.debug('Add ice candidate success.');
  };

  var onAddIceCandidateFailure=function(error){
    L.Logger.debug('Add ice candidate failed. Error: '+error);
  };

  var onSignalingStateChange=function(peer){
    L.Logger.debug('Signaling state changed: '+peer.connection.signalingState);
    if(peer.connection.signalingState==='closed'){
      stopChatLocally(peer, peer.id);
      delete peers[peer.id];
    }
    else if(peer.connection.signalingState==='stable'){
      changeNegotiationState(peer, NegotiationState.READY);
      if(peer.isCaller&&peer.isNegotiationNeeded&&gab){
        doRenegotiate(peer);
      } else {
        drainPendingStreams(peer);
      }
    }
  };

  // Return true if create PeerConnection successfully.
  var createPeerConnection=function(peer){
    if(!peer||peer.connection){
      return true;
    }
    try {
      peer.connection = new RTCPeerConnection(config, pcConstraints);/*jshint ignore:line*/
      peer.connection.onicecandidate = function(event){onLocalIceCandidate(peer,event);};
      peer.connection.onaddstream=function(event){onRemoteStreamAdded(peer,event);};
      peer.connection.onremovestream=function(event){onRemoteStreamRemoved(peer,event);};
      peer.connection.oniceconnectionstatechange=function(event){onIceConnectionStateChange(peer,event);};
      peer.connection.onnegotiationneeded=function(){onNegotiationneeded(peers[peer.id]);};
      peer.connection.onsignalingstatechange=function(){onSignalingStateChange(peer);};
      //DataChannel
      peer.connection.ondatachannel=function(event){
        L.Logger.debug(myId+': On data channel');
        // Save remote created data channel.
        if(!peer.dataChannels[event.channel.label]){
          peer.dataChannels[event.channel.label]=event.channel;
          L.Logger.debug('Save remote created data channel.');
        }
        bindEventsToDataChannel(event.channel,peer);
      };
    } catch (e) {
      L.Logger.debug('Failed to create PeerConnection, exception: ' + e.message);
      return false;
    }
    return true;
  };

  var unbindEvetsToPeerConnection=function(pc){
    pc.onicecandidate=undefined;
    pc.onaddstream=undefined;
    pc.onremovestream=undefined;
    pc.oniceconnectionstatechange=undefined;
    pc.onnegotiationneeded=undefined;
    pc.onsignalingstatechange=undefined;
  };

  var bindEventsToDataChannel=function(channel,peer){
    channel.onmessage = function(event){onDataChannelMessage(peer,event);};
    channel.onopen = function(event){onDataChannelOpen(peer,event);};
    channel.onclose = function(event){onDataChannelClose(peer,event);};
    channel.onerror = function(error){
      L.Logger.debug("Data Channel Error:", error);
    };
  };

  var createDataChannel=function(targetId,label){
    if(!label){
      label=DataChannelLabel.MESSAGE;
    }
    doCreateDataChannel(getPeerId(targetId),label);
  };

  var doCreateDataChannel=function(peerId,label){
    var peer=peers[peerId];
    // If a data channel with specified label already existed, then send data by it.
    if(peer&&!peer.dataChannels[label]){
      L.Logger.debug('Do create data channel.');
      try{
        var dc = peer.connection.createDataChannel(label, dataConstraints);
        bindEventsToDataChannel(dc,peer);
        peer.dataChannels[DataChannelLabel.MESSAGE]=dc;
      } catch (e) {
        L.Logger.error('Failed to create SendDataChannel, exception: ' + e.message);
      }
    }
  };

  // Do renegotiate when remote client allowed
  var doRenegotiate=function(peer){
    L.Logger.debug('Do renegotiation.');
    createAndSendOffer(peer);
  };

  var createPeer=function(peerId){
    if(!peers[peerId]){
      // Default value for |lastDisconnect| makes sure now-|lastDisconnect| < 0.
      // Default value for |isCaller| is true, it will be changed to false when send acceptance. If both sides send invitation at the same time, one side will send acceptance and change |isCaller| to false. This is handled in |chatInvitationHandler|.
      peers[peerId]={state:PeerState.READY, id:peerId, pendingStreams:[], pendingUnpublishStreams:[], remoteIceCandidates:[], dataChannels:{}, pendingMessages:[], negotiationState:NegotiationState.READY, lastDisconnect:(new Date('2099/12/31')).getTime(),publishedStreams:[], isCaller:true, remoteSideSupportsRemoveStream:false, remoteSideSupportsPlanB:false, remoteSideSupportsUnifiedPlan:false};
    }
    return peers[peerId];
  };

  var negotiationNeededHandler=function(peerId){
    var peer=peers[peerId];
    L.Logger.debug(myId+': Remote side needs negotiation.');
    if(peer){
      if(peer.isCaller&&peer.connection.signalingState==='stable'&&peer.negotiationState===NegotiationState.READY){
        doRenegotiate(peer);
      } else {
        peer.isNegotiationNeeded=true;
        L.Logger.error('Should not receive negotiation needed request because user is callee.');
      }
    }
  };

/**
   * @function connect
   * @instance
   * @desc This function establishes a connection to the signaling server.
   * @memberOf Woogeen.PeerClient
   * @param {string} loginInfo  An objects contains login information. For peer server, this object has two properties: host and token. Please make sure the host is correct.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
</script>
*/
  var connect=function(loginInfo, successCallback, failureCallback){
    gab=new Gab(loginInfo);
    gab.onConnected=connectedHandler;
    gab.onDisconnected=disconnectedHandler;
    gab.onConnectFailed=connectFailedHandler;
    gab.onChatStopped=chatStoppedHandler;
    gab.onChatAccepted=chatAcceptedHandler;
    gab.onChatDenied=chatDeniedHandler;
    gab.onChatInvitation=chatInvitationHandler;
    gab.onChatSignal=chatSignalHandler;
    gab.onStreamType=streamTypeHandler;
    gab.onNegotiationNeeded=negotiationNeededHandler;
    gab.onAuthenticated=authenticatedHandler;
    gab.onForceDisconnect=forceDisconnectHandler;
    gab.connect(loginInfo,successCallback,failureCallback);
/* After we merge p2p and conf sdk, this creation should be removed
    if(window.navigator.appVersion.indexOf("Trident") > -1){
      var plugin = document.getElementById("WebRTC.ActiveX");
      if(!plugin){
        plugin = document.createElement("OBJECT");
        plugin.setAttribute("ID", "WebRTC.ActiveX");
        plugin.setAttribute("height", "0");
        plugin.setAttribute("width", "0");
        plugin.setAttribute("CLASSID", "CLSID:1D117433-FD6F-48D2-BF76-26E2DC5390FC");
        document.body.appendChild(plugin);
      }
    }
*/
  };

  /**
   * @function disconnect
   *@instance
   * @desc This function disconnects from the peer server.
   * @memberOf Woogeen.PeerClient
   * @param {function} successCallback callback function to be invoked if connection is disconnected.
   * @param {function} failureCallback callback function to be invoked if error occurred. Paramter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.disconnect();
</script>
*/
  var disconnect=function(successCallback, failureCallback){
    if(!isConnectedToSignalingChannel){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      }
      return;
    }
    stop();
    if(gab){
      gab.finalize();
    }
    gab=null;
    if(successCallback){
      successCallback();
    }
  };

/**
   * @function invite
   *@instance
   * @desc This function invites a remote client to establish a connection for chatting.
   * @memberOf Woogeen.PeerClient
   * @param {string} peerId Remote user's ID.
   * @param {function} successCallback callback function to be invoked if invitation is sent.
   * @param {function} failureCallback callback function to be invoked if error occurred. Paramter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.invite('user2');
</script>
*/
  var invite = function(peerId, successCallback, failureCallback) {
    if(!gab){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
      }
      return;
    }
    if(peerId===myId){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }
    if(!peers[peerId]){
      createPeer(peerId);
    }
    var peer=peers[peerId];
    if(peer.state===PeerState.READY||peer.state===PeerState.OFFERED){
      L.Logger.debug('Send invitation to '+peerId);
      peer.state=PeerState.OFFERED;
      gab.sendChatInvitation(peerId, sysInfo, function(){
        if(successCallback){
          successCallback();
        }
      }, function(err){
        peer.state=PeerState.READY;
        if(failureCallback){
          failureCallback(Woogeen.Error.getErrorByCode(err));
        }
      });
    }
    else{
      L.Logger.debug('Invalid state. Will not send invitation.');
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      }
    }
  };
/**
   * @function inviteWithStream
   * @instance
   * @desc This function invites a remote client to establish a connection for chatting. The stream will be published as soon as the connection is established.<br><b>Remarks:</b><br>This method is intended to be used with Firefox. Please avoid using this method if your application only runs on Chrome.
   * @memberOf Woogeen.PeerClient
   * @private
   * @param {string} peerId Remote user's ID.
   * @param {stream} stream Stream to be published. An instance of Woogeen.Stream.
   * @param {function} successCallback callback function to be invoked if invitation is sent.
   * @param {function} failureCallback callback function to be invoked if error occurred. Paramter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.inviteWithStream('user2',localStream);
</script>
*/
  var inviteWithStream=function(peerId, stream, successCallback, failureCallback){
    invite(peerId, function(){
      publish(stream,peerId);
    }, failureCallback);
  };

/**
   * @function accept
   * @instance
   * @desc This function accepts a remote client to establish a connection for chatting.<br><b>Remarks:</b><br>This method is intended to be used with Firefox. Please avoid using this method if your application only runs on Chrome.
   * @memberOf Woogeen.PeerClient
   * @param {string} peerId Remote user's ID.
   * @param {function} successCallback callback function to be invoked if acceptance is sent to server successfully.
   * @param {function} failureCallback callback function to be invoked if error occurred. Paramter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.addEventListener('chat-invited',function(e){
 p2p.accept(e.senderId);
};
</script>
*/
  var accept=function(peerId, successCallback, failureCallback){
    if(!gab){
      failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
    }
    if(!peers[peerId]){
      createPeer(peerId);
    }
    var peer=peers[peerId];
    peer.isCaller=false;
    if(peer.state===PeerState.PENDING){
      peer.state=PeerState.MATCHED;
      gab.sendChatAccepted(peerId, sysInfo, successCallback, function(errCode){
        peer.state=PeerState.PENDING;
        failureCallback(Woogeen.Error.getErrorByCode(errCode));
      });
    }
    else{
      L.Logger.debug('Invalid state. Will not send acceptance.');
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      }
    }
  };
/**
   * @function acceptWithStream
   * @instance
   * @desc This function accepts a remote client to establish a connection for chatting. The stream will be published as soon as the connection is established.<br><b>Remarks:</b><br> This API is aimed to compatable with ealier version of FireFox which doesn't support renegotiation. It may be removed once FireFox supports renegotiation well.
   * @memberOf Woogeen.PeerClient
   * @private
   * @param {string} peerId Remote user's ID.
   * @param {stream} stream Stream to be published.An instance of Woogeen.Stream.
   * @param {function} successCallback callback function to be invoked if acceptance is sent to remote user.
   * @param {function} failureCallback callback function to be invoked if error occurred. Paramter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.addEventListener('chat-invited',function(e){
 p2p.acceptWithStream(e.senderId, localStream);
};
</script>
*/
  var acceptWithStream=function(peerId, stream, successCallback, failureCallback){
    accept(peerId, function(){
      publish(stream, peerId);
    }, failureCallback);
  };

  var createAndSendOffer=function(peer){
    if(!peer.connection){
      L.Logger.error('Peer connection have not been created.');
      return;
    }
    if(peer.connection.signalingState!=='stable'){
      changeNegotiationState(peer, NegotiationState.NEGOTIATING);
      return;
    }
    drainPendingStreams(peer);
    peer.isNegotiationNeeded=false;
    peer.connection.createOffer(function(desc) {
      desc.sdp = replaceSdp(desc.sdp);
      peer.connection.setLocalDescription(desc,function(){
        L.Logger.debug('Set local descripiton successfully.');
        changeNegotiationState(peer,NegotiationState.READY);
        if(gab){
          gab.sendSignalMessage(peer.id, desc);
        }
      },function(errorMessage){
        L.Logger.debug('Set local description failed. Message: '+JSON.stringify(errorMessage));
      });
    },function(error){
      L.Logger.debug('Create offer failed. Error info: '+JSON.stringify(error));
    }, sdpConstraints);
  };

  var drainIceCandidates=function(peer){
    if (peer&&peer.connection&&peer.remoteIceCandidates&&peer.remoteIceCandidates.length!==0) {
      for(var i=0;i<peer.remoteIceCandidates.length;i++){
        L.Logger.debug("remoteIce, length:" + remoteIceCandidates.length + ", current:" +i);
        if(peer.state===PeerState.CONNECTED||peer.state===PeerState.CONNECTING){
          peer.connection.addIceCandidate(remoteIceCandidates[i],onAddIceCandidateSuccess,onAddIceCandidateFailure);
        }
      }
      peer.remoteIceCandidates=[];
    }
  };

  var drainPendingStreams=function(peer){
    L.Logger.debug('Draining pending streams.');
    if(peer.connection){
      L.Logger.debug('Peer connection is ready for draining pending streams.');
      for(var i=0;i<peer.pendingStreams.length;i++){
        var stream=peer.pendingStreams[i];
        // OnNegotiationNeeded event will be triggered immediately after adding stream to PeerConnection in FireFox.
        // And OnNegotiationNeeded handler will execute drainPendingStreams. To avoid add the same stream multiple times,
        // shift it from pending stream list before adding it to PeerConnection.
        peer.pendingStreams.shift();
        if(!stream.mediaStream){  // The stream has been closed. Skip it.
          continue;
        }
        bindStreamAndPeer(stream, peer);
        if(!stream.onClose){
          stream.onClose=function(){onLocalStreamEnded(stream);};/*jshint ignore:line*/ //Function within a loop.
        }
        peer.connection.addStream(stream.mediaStream);
        L.Logger.debug('Added stream to peer connection.');
        sendStreamType(stream,peer);
        L.Logger.debug('Sent stream type.');
      }
      peer.pendingStreams=[];
      for(var j=0;j<peer.pendingUnpublishStreams.length;j++){
        if(!peer.pendingUnpublishStreams[j].mediaStream){
          continue;
        }
        peer.connection.removeStream(peer.pendingUnpublishStreams[j].mediaStream);
        L.Logger.debug('Remove stream.');
      }
      peer.pendingUnpublishStreams=[];
    }
  };

  var drainPendingMessages=function(peer){
    L.Logger.debug('Draining pendding messages.');
    var dc=peer.dataChannels[DataChannelLabel.MESSAGE];
    if(dc&&dc.readyState!=='closed'){
      for(var i=0;i<peer.pendingMessages.length;i++){
        dc.send(peer.pendingMessages[i]);
      }
      peer.pendingMessages=[];
    }
  };

  var bindStreamAndPeer=function(stream,peer){
    var streamId=stream.id();
    if(!streamPeers[streamId]){
      streamPeers[streamId]=[];
    }
    streamPeers[streamId].push(peer.id);
  };

  var createAndSendAnswer=function(peer){
    if(!peer.connection){
      L.Logger.error('Peer connection have not been created.');
      return;
    }
    drainPendingStreams(peer);
    peer.isNegotiationNeeded=false;
    peer.connection.createAnswer(function(desc) {
      desc.sdp = replaceSdp(desc.sdp);
      peer.connection.setLocalDescription(desc,function(){
        L.Logger.debug("Set local description successfully.");
        if(gab){
          gab.sendSignalMessage(peer.id, desc);
        }
        L.Logger.debug('Sent answer.');
      },function(errorMessage){
        L.Logger.error("Error occurred while setting local description. Error message:" + errorMessage);
      });
    },function(error){
      L.Logger.error('Create answer failed. Message: '+error);
    });
  };

  /**
   * @function addStreamToRoom
   * @instance
   * @desc Add a stream or streams to a room
   * @private
   * @param {array} streams A Woogeen.Stream or an array of Woogeen.Stream.
   * @param {string} roomId Room ID.
   */
  var addStreamToRoom=function(streams, roomId){ /*jshint ignore:line*/ //addStreamToRoom is defined but never used.
    if(!streams||!roomId){
      return;
    }
    if(!roomStreams[roomId]){
      roomStreams[roomId]=[];
    }
    var streamsInRoom=roomStreams[roomId];
    if(isArray(streams)){
      streamsInRoom=streamsInRoom.concat(streams);
    }
    else{
      streamsInRoom.push(streams);
    }
  };

  /**
   * @function deleteStreamFromRoom
   * @instance
   * @desc Delete a stream froom a room
   * @private
   * @param {Woogeen.Stream} stream An instance of Woogeen.Stream
   * @param {string} roomId Room ID
   */
  var deleteStreamFromRoom=function(stream,roomId){ /*jshint ignore:line*/ //deleteStreamFromRoom is defined but never used.
    if(!stream||!roomId){
      return;
    }
    if(!roomStreams[roomId]){
      return;
    }
    var savedStreams=roomStreams[roomId];
    for(var i=0;i<savedStreams.length;i++){
      if(stream.getID()===savedStreams[i].getID()){
        savedStreams.splice(i,1);
        break;
      }
    }
  };

  var contains = function (arr,obj){
    for(var i=0;i<arr.length;i++){
        if(arr[i] === obj){
        return i;
        }
    }
    return -1;
  };
/**
   * @function publish
   * @instance
   * @desc This function publishes the local stream to the remote client.<br><b>Remarks:</b><br>This function should be called after invite or joinRoom. Streams in publish queue will be added in remote side soon.
   * @memberOf Woogeen.PeerClient
   * @param {stream} stream Local stream. An instance of Woogeen.Stream.
   * @param {string} targetId Remote peer's ID or roomToken.
   * @param {function} successCallback callback function to be invoked if stream is added.
   * @param {function} failureCallback callback function to be invoked if error occurred.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.invite('user2');
p2p.publish(localStream,'user1');
</script>
*/
  var publish=function(stream, targetId, successCallback, failureCallback){
    if(!(stream instanceof Woogeen.LocalStream && stream.mediaStream)||!targetId){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }
    doPublish(stream,targetId, successCallback, failureCallback);
  };

  /**
   * @function doPublish
   * @instance
   * @desc Publish stream to peer
   * @private
   * @param {stream} stream Local stream. A instance of Woogeen.Stream.
   * @param {string} targetId Remote peer's ID or roomToken.
   */
  var doPublish=function(streams, targetId, successCallback, failureCallback){
    L.Logger.debug('Publish to: '+targetId);

    var peerId=getPeerId(targetId);
    if(!peerId){
      if(room&&successCallback){
        successCallback();
      }
      else if(!room&&failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }

    if(!peers[peerId]){
      createPeer(peerId);
    }
    var peer=peers[peerId];

    var multipleStreams = (peer.publishedStreams.length+peer.pendingStreams.length>0);
    var sameMultipleMediaSourcesPlan = ((peer.remoteSideSupportsUnifiedPlan&&supportsUnifiedPlan)||peer.remoteSideSupportsPlanB&&supportsPlanB);
    if(multipleStreams&&!sameMultipleMediaSourcesPlan){
      L.Logger.warning('Cannot publish more than one streams if local and remote use different multiple media sources plan.');
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_UNSUPPORTED_METHOD);
      }
      return;
    }

    // Check peer state
    switch (peer.state){
      case PeerState.OFFERED:
      case PeerState.MATCHED:
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        break;
      default:
        L.Logger.warning('Cannot publish stream in this state: '+peer.state);
        if(failureCallback){
          failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
        }
        return;
    }
    // Publish stream or streams
    if(contains(peer.publishedStreams,streams)>-1){
      if(failureCallback){
        failureCallback("The stream has been published.");
      }
      return;
    }
    else{
      peer.publishedStreams.push(streams);
    }
    if(isArray(streams)){
      peer.pendingStreams=peer.pendingStreams.concat(streams);
    }
    else if(streams){
      peer.pendingStreams.push(streams);
    }
    switch (peer.state){
      case PeerState.CONNECTING:
      case PeerState.CONNECTED:
        if(peer.pendingStreams.length>0){
          drainPendingStreams(peer);
        }
        break;
      default:
        L.Logger.debug('Unexpected peer state: '+peer.state);
        if(failureCallback){
          failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
        }
        return;
    }
    if(successCallback){
      successCallback();
    }
  };

/**
   * @function unpublish
   * @instance
   * @desc This function revokes a local stream's publish.<br><b>Remarks:</b><br>This stream will be removed on remote side if unpublish successfully.
   * @memberOf Woogeen.PeerClient
   * @param {stream} stream Local stream. An instance of Woogeen.Stream.
   * @param {string} targetId Remote Peer's ID.
   * @param {function} successCallback callback function to be invoked if stream is unpublished.
   * @param {function} failureCallback callback function to be invoked if error occurred.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.invite('user2');
p2p.publish(localStream,'user1');
p2p.unpublish(localStream,'user1');
</script>
*/
  var unpublish=function(stream, targetId, successCallback, failureCallback){
    L.Logger.debug('Unpublish stream.');
    if(!(stream instanceof Woogeen.LocalStream)){
      L.Logger.warning('Invalid argument stream');
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }

    var peerId=getPeerId(targetId);
    if(!peerId){
      if(room&&successCallback){  // Joined room and waiting for another one.
        successCallback();
      }
      else if(!room&&failureCallback){
        L.Logger.warning('Invalid argument targetId');
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }

    if(!peers[peerId] || contains(peers[peerId].publishedStreams,stream)<0){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }
    var peer=peers[peerId];
    if(navigator.mozGetUserMedia || !peer.remoteSideSupportsRemoveStream){
      L.Logger.error('Unpublish is not supported on FireFox.');
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_UNSUPPORTED_METHOD);
      }
      return;
    }
    var i=contains(peer.publishedStreams,stream);
    peer.publishedStreams.splice(i,1);
    peer.pendingUnpublishStreams.push(stream);
    if (peer.state === PeerState.CONNECTED){
      drainPendingStreams(peer);
    }
    if(successCallback){
      successCallback();
    }
  };

  /**
    * @function sendStreamType
    * @instance
    * @desc Send video type to remote clientInformation
    * @memberOf Woogeen.PeerClient
    * @private
    * @param {stream} stream Local stream. A instance of Woogeen.Stream.
    */
  var sendStreamType=function(stream,peer){
    if(stream!==null) {
      var type='audio';
      if(stream.isScreen()) {
        type='screen';
        stream.hide=function(){  // bind hide() because hide() is invoked before dispose mediaStream.
          L.Logger.debug('Unpublish screen sharing.');
          unpublish(stream,peer.id);
        };
      }else if(stream.hasVideo()) {
        type='video';
      }
      if(gab){
        gab.sendStreamType(peer.id, {streamId:stream.mediaStream.id, type:type});
      }
    }
  };
/**
   * @function deny
   * @instance
   * @desc This function denies a remote client's invitation.
   * @memberOf Woogeen.PeerClient
   * @param {string} uid Remote user's ID.
   * @param {function} successCallback callback function to be invoked if server received deny message.
   * @param {function} failureCallback callback function to be invoked if error occurred. Parameter: error.
   * @example
<script type="text/JavaScript">
var p2p=new Woogeen.PeerClient();
p2p.connect({host:'http://61.152.239.56:8095/',token:'user1'});
p2p.deny('user2');
</script>
*/
  var deny=function(peerId, successCallback, failureCallback){
    if(peers[peerId]&&peers[peerId].state===PeerState.PENDING){
      if(!gab&&failureCallback){
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
        return;
      }
      gab.sendChatDenied(peerId, successCallback, function(errCode){
        if(failureCallback){
          failureCallback(Woogeen.Error.getErrorByCode(errCode));
        }
      });
      delete peers[peerId];
    }else{
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      }
    }
  };

/**
   * @function stop
   * @instance
   * @desc This function stops the connection with specified remote user. <br><b>Remarks:</b><br> If peerId is unspecified, it will stop all P2P connections.
   * @memberOf Woogeen.PeerClient
   * @param {string} uid Remote user's ID.
   * @param {function} successCallback callback function to be invoked if the session is stopped.
   * @param {function} failureCallback callback function to be invoked if error occurred. Parameter: error.
   * @example
<script type="text/JavaScript">
p2p.stop();
</script>
*/
  var stop=function(peerId, successCallback, failureCallback){
    if(!gab){
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
      }
      return;
    }
    if(peerId){  // Stop chat with peerId
      var peer=peers[peerId];
      if(!peer){
        if(failureCallback){
          L.Logger.warning('Invalid target ID for stopping chat.');
          failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
        }
        return;
      }
      gab.sendChatStopped(peer.id);
      stopChatLocally(peer, myId);
      delete peers[peerId];
    }else{  // Stop all chats
      for(var peerIndex in peers){
        var peer_all=peers[peerIndex];
        gab.sendChatStopped(peer_all.id);
        stopChatLocally(peer_all, myId);
        delete peers[peer_all.id];
      }
    }
    if(successCallback){
      successCallback();
    }
  };

  var stopChat=function(chatId, successCallback, failureCallback){ /*jshint ignore:line*/ //stopChat is defined but never used.
    var chat=chats[chatId];
    if(chat){
      var peer=chat.peer;
      stop(peer.id);
      if(!gab){
        if(failureCallback){
          failureCallback(Woogeen.Error.P2P_CONN_CLIENT_NOT_INITIALIZED);
        }
        return;
      }
      gab.sendLeaveRoom(chatId);
      delete chats[chatId];
    }
    if(successCallback){
      successCallback();
    }
  };

/**
   * @function getConnectionStats
   * @instance
   * @desc This function returns connection statistics to a remote client. More details about [connection status](@ref status).
   * @memberOf Woogeen.PeerClient
   * @param {string} targetId Remote user's ID.
   * @param {function} successCallback callback function to be invoked when statistics is available
   * @param {function} failureCallback callback function to be invoked when statistics is not available
   * @example
<script type="text/JavaScript">
var successcallback=function(stats){
  console.log("stats:"+JSON.stringify(stats));
}
var failurecallback=function(msg){
  console.log("error getting stats:"+msg);
}
p2p.getConnectionStats($('#target-uid').val(), successcallback, failurecallback);
</script>
*/
  var getConnectionStats=function(targetId, successCallback, failureCallback){
    var peerId=getPeerId(targetId);
    var peer=peers[peerId];
    if(!peer||(!peer.connection)||(peer.state!==PeerState.CONNECTED)){
      if(failureCallback){
        failureCallback("failed to get peerconnection statistics");
      }
      return;
    }
    if(!successCallback){
      // If user doesn't provide a success callback, no reason to getStats().
      return;
    }
    peer.connection.getStats(function(stats){
      if(window.navigator.appVersion.indexOf("Trident") > -1){
        successCallback(stats);
      } else {
        successCallback(Woogeen.Common.parseStats(stats));
      }
    }, function(err){
      if(failureCallback){
        failureCallback(err);
      }
    });
  };

/**
   * @function getAudioLevels
   * @instance
   * @desc This function returns audio output levels associated with current peer client. More details about [audio levels](@ref audiolevel).
   * @memberOf Woogeen.PeerClient
   * @param {string} targetId Remote user's ID.
   * @param {function} successCallback callback function to be invoked when audio level information is available.
   * @param {funciton} failureCallback callback function to be invoked when fail to get the audio level information.
   * @example
<script type="text/JavaScript">
var successcallback=function(levels){
  console.log("current level"+JSON.stringify(levels));
}
var failurecallback=function(msg){
  console.log("error getting audio levels:"+msg);
}
p2p.getAudioLevels($('#target-uid').val(), successcallback, failurecallback);
</script>
*/
  var getAudioLevels=function(targetId, successCallback, failureCallback){
    var peerId=getPeerId(targetId);
    var peer=peers[peerId];
    if(!peer||(!peer.connection)||(peer.state!==PeerState.CONNECTED)){
      failureCallback("Invalid peer connection status.");
    }
    getPeerConnectionAudioLevels(peer.connection, successCallback, failureCallback);/*jshint ignore:line*/
  };

/**
   * @function send
   * @instance
   * @desc This function sends message data to a remote client.
   * @memberOf Woogeen.PeerClient
   * @param {string} message Message to be sent to remote user.
   * @param {string} targetId Remote user's ID.
   * @param {function} successCallback callback function to be invoked if the message is sent.
   * @param {function} failureCallback callback function to be invoked if error occurred. Parameter: error.
   * @example
<script type="text/JavaScript">
p2p.send($('#data').val(), $('#target-uid').val());
</script>
*/
  var send=function(message,targetId, successCallback, failureCallback){
    if(message.length>65535){
      L.Logger.warning("Message too long. Max size: 65535.");
      if(failureCallback){
        failureCallback(Woogeen.Error.P2P_CLIENT_ILLEGAL_ARGUMENT);
      }
      return;
    }
    doSendData(message,getPeerId(targetId), successCallback, failureCallback);
  };

  //Data channel send data
  var doSendData=function(message,peerId, successCallback, failureCallback){
    var peer=peers[peerId];
    if(!peer||peer.state!==PeerState.CONNECTED){
      if(failureCallback){
        L.Logger.error("Invalid peer state.");
        failureCallback(Woogeen.Error.P2P_CLIENT_INVALID_STATE);
      }
      return;
    }
    // If data channel is ready, send it. Otherwise, cache it in message queue.
    var dc=peer.dataChannels[DataChannelLabel.MESSAGE];
    if(dc&&dc.readyState==='open'){
      dc.send(message);
    }else{
      peer.pendingMessages.push(message);
      createDataChannel(peerId);
    }
    if(successCallback){
      successCallback();
    }
  };

  //DataChannel handler.
  var onDataChannelMessage=function(peer,event){
     var dataEvent = new Woogeen.DataEvent({type:'data-received', senderId:peer.id, data:event.data});
     that.dispatchEvent(dataEvent);
  };

  var onDataChannelOpen=function(peer,event){
     L.Logger.debug("Data Channel is opened");
     if(event.target.label===DataChannelLabel.MESSAGE){
       L.Logger.debug('Data channel for messages is opened.');
       drainPendingMessages(peer);
     }
  };

  var onDataChannelClose=function(peerId){
    L.Logger.debug('Data Channel for '+peerId+' is closed.');
  };

  var onLocalStreamEnded=function(stream){
    var peerIds=streamPeers[stream.getID()];
    if(peerIds){
      for(var i=0;i<peerIds.length;i++){
        unpublish(stream, peerIds[i]);
      }
    }
  };

  //codec preference setting.
  var replaceSdp = function(sdp) {
    sdp = setMaxBW(sdp); // set vide band width
    return sdp;
  };

  var setMaxBW = function (sdp) {
    var mLineReg = /m=video.*\r\n/;
    var mLineElement = sdp.match(mLineReg);
    if (mLineElement && mLineElement.length) {
      var tempString = mLineElement[0] + "b=AS:" + (spec ? spec.maxVideoBW : 500) + "\r\n";
      sdp = sdp.replace(mLineElement[0], tempString);
    }
    return sdp;
  };

  /**
   * @function getPeerConnection
   * @instance
   * @desc Get PeerConnection for a specified remote client.
   * @private
   * @param targetId peerId or roomToken.
   */
  var getPeerConnection = function(targetId){  /*jshint ignore:line*/ //getPeerConnection is defined but never used.
    var peerId=getPeerId(targetId);
    var peer=peers[peerId];
    if(!peer){
      return null;
    }
    return peer.connection;
  };

  that.connect=connect;
  that.disconnect=disconnect;
  that.invite=invite;
  that.inviteWithStream=inviteWithStream;
  that.publish=publish;
  that.unpublish=unpublish;
  that.deny=deny;
  that.accept=accept;
  that.acceptWithStream=acceptWithStream;
  that.stop=stop;
  that.send=send;
  that.getConnectionStats=getConnectionStats;
  that.getAudioLevels=getAudioLevels;

  return that;
};
