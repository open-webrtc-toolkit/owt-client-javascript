// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

export class ConferenceInfo {
  constructor(id, participants, remoteStreams, myInfo) {
    this.id = id;
    this.participants = participants;
    this.remoteStreams = remoteStreams;
    this.self = myInfo;
  }
}
