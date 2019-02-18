// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * @class ConferenceInfo
 * @classDesc Information for a conference.
 * @memberOf Owt.Conference
 * @hideconstructor
 */
export class ConferenceInfo {
  // eslint-disable-next-line require-jsdoc
  constructor(id, participants, remoteStreams, myInfo) {
    /**
     * @member {string} id
     * @instance
     * @memberof Owt.Conference.ConferenceInfo
     * @desc Conference ID.
     */
    this.id = id;
    /**
     * @member {Array<Owt.Conference.Participant>} participants
     * @instance
     * @memberof Owt.Conference.ConferenceInfo
     * @desc Participants in the conference.
     */
    this.participants = participants;
    /**
     * @member {Array<Owt.Base.RemoteStream>} remoteStreams
     * @instance
     * @memberof Owt.Conference.ConferenceInfo
     * @desc Streams published by participants. It also includes streams published by current user.
     */
    this.remoteStreams = remoteStreams;
    /**
     * @member {Owt.Base.Participant} self
     * @instance
     * @memberof Owt.Conference.ConferenceInfo
     */
    this.self = myInfo;
  }
}
