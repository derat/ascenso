// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file should be imported before index.ts by non-test code to initialize
// Firebase using the non-checked-in parameters in config.ts.
//
// This can't live in index.ts (which is imported by code that's tested) because
// then CI blows up due to a missing config.ts.

import firebase from 'firebase/app';
import config from './config';
firebase.initializeApp(config);
