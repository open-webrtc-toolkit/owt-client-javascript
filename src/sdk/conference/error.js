// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

/**
 * @class ConferenceError
 * @classDesc The ConferenceError object represents an error in conference mode.
 * @memberOf Owt.Conference
 * @hideconstructor
 */
export class ConferenceError extends Error {
  // eslint-disable-next-line require-jsdoc
  constructor(message) {
    super(message);
  }
}
