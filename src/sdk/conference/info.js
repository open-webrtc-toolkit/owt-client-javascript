// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * @class ConferenceInfo
 * @classDesc Information for a conference.
 * @memberOf Oms.Conference
 * @hideconstructor
 */
export class ConferenceInfo {
  // eslint-disable-next-line require-jsdoc
  constructor(id, participants, remoteStreams, myInfo) {
    /**
     * @member {string} id
     * @instance
     * @memberof Oms.Conference.ConferenceInfo
     * @desc Conference ID.
     */
    this.id = id;
    /**
     * @member {Array<Oms.Conference.Participant>} participants
     * @instance
     * @memberof Oms.Conference.ConferenceInfo
     * @desc Participants in the conference.
     */
    this.participants = participants;
    /**
     * @member {Array<Oms.Base.RemoteStream>} remoteStreams
     * @instance
     * @memberof Oms.Conference.ConferenceInfo
     * @desc Streams published by participants. It also includes streams published by current user.
     */
    this.remoteStreams = remoteStreams;
    /**
     * @member {Oms.Base.Participant} self
     * @instance
     * @memberof Oms.Conference.ConferenceInfo
     */
    this.self = myInfo;
  }
}
