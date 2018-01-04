// Copyright © 2017 Intel Corporation. All Rights Reserved.

'use strict';

export class Participant {
  constructor(id, role, userId) {
    Object.defineProperty(this, 'id', {
      configurable: false,
      writable: false,
      value: id
    });
    Object.defineProperty(this, 'role', {
      configurable: false,
      writable: false,
      value: role
    });
    Object.defineProperty(this, 'userId', {
      configurable: false,
      writable: false,
      value: userId
    });
  }
}
