// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

/**
 * @class Participant
 * @memberOf Ics.Conference
 * @classDesc The Participant defines a participant in a conference.
 * @extends Ics.Base.EventDispatcher
 * Events:
 *
 * | Event Name      | Argument Type    | Fired when       |
 * | ----------------| ---------------- | ---------------- |
 * | left            | Event            | The participant left the conference. |
 *
 * @hideconstructor
 */
export class Participant {
  constructor(id, role, userId) {
    /**
     * @member {string} id
     * @instance
     * @memberof Ics.Conference.Participant
     * @desc The ID of the participant. It varies when a single user join different conferences.
     */
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id
    });
    /**
     * @member {string} role
     * @instance
     * @memberof Ics.Conference.Participant
     */
    Object.defineProperty(this, 'role', {
      configurable: false,
      writable: false,
      value: role
    });
    /**
     * @member {string} userId
     * @instance
     * @memberof Ics.Conference.Participant
     * @desc The user ID of the participant. It can be integrated into existing account management system.
     */
    Object.defineProperty(this, 'userId', {
      configurable: false,
      writable: false,
      value: userId
    });
  }
}
