// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exposes Cloud-Function-related functionality from Firebase.

import firebase from 'firebase/app';
import 'firebase/functions';
import './init';

export const functions = firebase.functions();
