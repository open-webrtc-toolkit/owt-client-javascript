var TestClient = function(userName, serverURL, config) {
  this.serverURL = serverURL;
  this.userName = userName;
  this.localStream = undefined;
  this.publication = undefined;
  this.RTCStatsReport = undefined;
  this.RTCStatsReportList = [];
  this.timeList = []
  if(!config){
    config = {}
  }
  const signaling = new SignalingChannel();
  this.peerClient = new Owt.P2P.P2PClient(config,signaling);
  this.serverURL = serverURL || "http://10.239.44.127:8095/";
  console.log('serverURL:'+this.serverURL);
  this.userName = userName || "userName" + new Date().getTime();
  console.log('userName:'+this.userName);
  this.request = {};
  this.request["createLocal_success"] = 0;
  this.request["createLocal_failed"] = 0;
  this.request["connect_success"] = 0;
  this.request["connect_failed"] = 0;
  this.request["publish_success"] = 0
  this.request["publish_failed"] = 0;
  this.request["send_success"] = 0;
  this.request["send_failed"] = 0;
  this.request["stop_success"] = 0;
  this.request["stop_failed"] = 0;
  this.request["p2pclient_getStats_success"] = 0;
  this.request["p2pclient_getStats_failed"] = 0;
  this.request["publication_getStats_success"] = 0;
  this.request["publication_getStats_failed"] = 0;
  this.request["checkgetStats_success"] =  0;
  this.request["checkgetStats_failed"] = 0;
  this.request["server-disconnected_success"] = 0;
  this.request["streamadded_success"] = 0;
  this.request["data-received_success"] = 0;
  this.request["publication_end_success"] = 0;
  this.request["streamended_success"] = 0;
}

TestClient.prototype = {
  debug: function(title, msg) {
    console.log("TestClient DEBUG MESSAGE: ");
    console.log(title, msg);
  },

  isIE: function() {
          if (!!window.ActiveXObject || "ActiveXObject" in window)
            return true;
          else
            return false;
  },

  createLocalStream: function(resolution,fps) {
    var that = this;
    var videoConstraintsForCamera
    var audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(Owt.Base.AudioSourceInfo.MIC);
    videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(Owt.Base.VideoSourceInfo.CAMERA);
    videoConstraintsForCamera.resolution = resolution
    videoConstraintsForCamera.frameRate = fps
    let mediaStream;
    Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base.StreamConstraints(audioConstraintsForMic, videoConstraintsForCamera)).then(stream=>{
      mediaStream=stream;
      localStream = new Owt.Base.LocalStream(mediaStream, new Owt.Base.StreamSourceInfo('mic', 'camera'));
      that.localStream = localStream;
      var hasVideo = that.hasVideo(localStream)
      var hasAudio = that.hasAudio(localStream)
      if(hasVideo && hasAudio){
        that.debug("Create stream success");
        that.request["createLocal_success"]++
      }else{
        console.log("hasVideo is "+hasVideo +" and hasAudio is "+hasAudio);
        that.request["createLocal_failed"]++
      }
      that.request["localStreamId"] = localStream.id;
      that.debug("Create stream id:", localStream.id);
    }, err=>{
          console.error('Failed to create MediaStream, '+err);
          that.request["createLocal_failed"]++;
    });
  },

  createLocalStreamVideoOnly: function(resolution,fps) {
    var that = this;
    var videoConstraintsForCamera
    videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(Owt.Base.VideoSourceInfo.CAMERA);
    videoConstraintsForCamera = new Owt.Base.VideoTrackConstraints(Owt.Base.VideoSourceInfo.CAMERA);
    videoConstraintsForCamera.resolution = resolution
    videoConstraintsForCamera.frameRate = fps
    let mediaStream;
    Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base.StreamConstraints(false, videoConstraintsForCamera)).then(stream=>{
      mediaStream=stream;
      localStream = new Owt.Base.LocalStream(mediaStream, new Owt.Base.StreamSourceInfo('mic', 'camera'));
      that.debug("Create stream", "success");
      that.localStream = localStream;
      var hasVideo = that.hasVideo(localStream)
      var hasAudio = that.hasAudio(localStream)
      if(hasVideo && !hasAudio){
        that.request["createLocal_success"]++
      }else{
        console.log("HasVideo is "+hasVideo +" and hasAudio is "+hasAudio);
        that.request["createLocal_failed"]++
      }
      that.request["localStreamId"] = localStream.id;
      that.debug("Create stream id:", localStream.id);
    }, err=>{
          console.error('Failed to create MediaStream, '+err);
          that.request["createLocal_failed"]++;
    });
  },

  createLocalStreamAudioOnly: function() {
    var that = this;
    const audioConstraintsForMic = new Owt.Base.AudioTrackConstraints(Owt.Base.AudioSourceInfo.MIC);
    let mediaStream;
    Owt.Base.MediaStreamFactory.createMediaStream(new Owt.Base.StreamConstraints(audioConstraintsForMic, false)).then(stream=>{
      mediaStream=stream;
      localStream = new Owt.Base.LocalStream(mediaStream, new Owt.Base.StreamSourceInfo('mic', 'camera'));
      that.debug("create stream", "success");
      that.localStream = localStream;
      var hasVideo = that.hasVideo(localStream)
      var hasAudio = that.hasAudio(localStream)
      if(!hasVideo && hasAudio){
        that.request["createLocal_success"]++
      }else{
        console.log("HasVideo is "+hasVideo +" and hasAudio is "+hasAudio);
        that.request["createLocal_failed"]++
      }
      that.request["localStreamId"] = localStream.id;
      that.debug("Create stream id:", localStream.id);
    }, err=>{
          console.error('Failed to create MediaStream, '+err);
          that.request["createLocal_failed"]++;
    });
  },

  bindDefaultListener: function(types) {
    var i = 0,
      count = types.length,
      that = this;
    while (i < count) {
      var str = types[i];
      this.peerClient.addEventListener(str, function(e) {
        that.debug(str + "_success", e);
        that.request[str + "_success"]++;
      });
      i++;
    }
  },

  bindListener: function(type, seccessCallBack, errCallBack) {
    this.peerClient.addEventListener(type, seccessCallBack, errCallBack);
  },

  replaceAllowedRemoteIds : function(id){
    this.peerClient.allowedRemoteIds = id
  },

  connect: function(serverip,userName) {
    var that = this;
    var ip,name;
    if(typeof(serverip) === "undefined"){
      ip = this.serverURL
    }else{
      ip = serverip
    }
    if(typeof(userName) === "undefined"){
      name = this.userName
    }else{
      name = userName
    }
    this.peerClient.connect({
      host: ip,
      token: name
    }).then(()=>{
      that.debug("Connect peer", "success");
      that.request["connect_success"]++;
    },err=>{
      that.debug("Connect peer", "failed");
      that.request["connect_failed"]++;
    });
  },

  disconnect: function() {
    var that = this;
    this.peerClient.disconnect()
  },

  publish: function(peerId) {
    var that = this;
    this.peerClient.publish(peerId,this.localStream).then(publication=>{
      that.publication = publication;
      if(publication.stop!==undefined){
        that.request["publish_success"]++;
      }else{
        that.request["publish_failed"]++
      }
      that.publication.addEventListener("ended", ()=>{
        that.request["publication_end_success"]++
      });
    },err=>{
      console.log(err)
      that.request["publish_failed"]++;
    });
  },

  unpublish: function() {
    var that = this;
    this.publication.stop()
  },

  send: function(peerid, msg) {
    var that = this;
    this.peerClient.send(peerid, msg).then(()=>{
        that.debug("Send success:", "send to user: " + peerid + " success");
        that.request["send_success"]++;
    },err=>{
        that.debug("Send fail:", "send to user: " + peerid + " failed");
        that.request["send_failed"]++;
    });
  },

  stop: function(id) {
    var that = this;
    this.peerClient.stop(id);
  },

  close: function() {
      for(const track of localStream.mediaStream.getTracks()){
          track.stop();
      }
  },

  hasVideo: function(stream){
    var result = false;
    if(stream.mediaStream.getVideoTracks().length != 0){
      result = true
    }
    return result
  },

  hasAudio: function(stream){
    var result = false;
    if(stream.mediaStream.getAudioTracks().length != 0){
      result = true
    }
    return result
  },

};

TestClient.prototype.constructor = TestClient;