// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

import * as EventModule from '../base/event.js';

'use strict';

/**
 * @class Participant
 * @memberOf Oms.Conference
 * @classDesc The Participant defines a participant in a conference.
 * Events:
 *
 * | Event Name      | Argument Type      | Fired when       |
 * | ----------------| ------------------ | ---------------- |
 * | left            | Oms.Base.OmsEvent  | The participant left the conference. |
 *
 * @extends Oms.Base.EventDispatcher
 * @hideconstructor
 */
export class Participant extends EventModule.EventDispatcher {
  constructor(id, role, userId) {
    super();
    /**
     * @member {string} id
     * @instance
     * @memberof Oms.Conference.Participant
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
     * @memberof Oms.Conference.Participant
     */
    Object.defineProperty(this, 'role', {
      configurable: false,
      writable: false,
      value: role
    });
    /**
     * @member {string} userId
     * @instance
     * @memberof Oms.Conference.Participant
     * @desc The user ID of the participant. It can be integrated into existing account management system.
     */
    Object.defineProperty(this, 'userId', {
      configurable: false,
      writable: false,
      value: userId
    });
  }
}
