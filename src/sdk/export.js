// Copyright (C) <2018> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

import * as base from './base/export.js';
import * as p2p from './p2p/export.js';
import * as conference from './conference/export.js';

/**
 * Base objects for both P2P and conference.
 * @namespace Oms.Base
 */
export const Base = base;

/**
 * P2P WebRTC connections.
 * @namespace Oms.P2P
 */
export const P2P = p2p;

/**
 * WebRTC connections with conference server.
 * @namespace Oms.Conference
 */
export const Conference = conference;
