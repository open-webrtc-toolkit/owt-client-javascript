// Copyright (C) <2017> Intel Corporation
//
// SPDX-License-Identifier: Apache-2.0

'use strict';

import * as base from './base.js';
import * as p2p from './p2p.js';
import * as conference from './conference.js'
mocha.checkLeaks();
mocha.globals(['jQuery']);
mocha.run();
