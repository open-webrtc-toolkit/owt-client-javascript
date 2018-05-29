// Copyright © 2017 Intel Corporation. All Rights Reserved.

import * as EventModule from '../base/event.js';

'use strict';

/**
 * @class Participant
 * @memberOf Ics.Conference
 * @classDesc The Participant defines a participant in a conference.
 * Events:
 *
 * | Event Name      | Argument Type      | Fired when       |
 * | ----------------| ------------------ | ---------------- |
 * | left            | Ics.Base.IcsEvent  | The participant left the conference. |
 *
 * @extends Ics.Base.EventDispatcher
 * @hideconstructor
 */
export class Participant extends EventModule.EventDispatcher {
  constructor(id, role, userId) {
    super();
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
