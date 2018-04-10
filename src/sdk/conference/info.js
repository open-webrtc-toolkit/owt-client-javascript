// Copyright © 2017 Intel Corporation. All Rights Reserved.
'use strict';

/**
 * @class ConferenceInfo
 * @classDesc Information for a conference.
 * @memberOf Ics.Conference
 * @hideconstructor
 */
export class ConferenceInfo {
  constructor(id, participants, remoteStreams, myInfo) {
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Conference.ConferenceInfo
     * @desc Conference ID.
     */
    this.id = id;
    /**
     * @member {Array<Ics.Conference.Participant>} participants
     * @instance
     * @memberof Ics.Conference.ConferenceInfo
     * @desc Participants in the conference.
     */
    this.participants = participants;
    /**
     * @member {Array<Ics.Base.RemoteStream>} remoteStreams
     * @instance
     * @memberof Ics.Conference.ConferenceInfo
     * @desc Streams published by participants. It also includes streams published by current user.
     */
    this.remoteStreams = remoteStreams;
    /**
     * @member {Ics.Base.Participant} self
     * @instance
     * @memberof Ics.Conference.ConferenceInfo
     */
    this.self = myInfo;
  }
}
