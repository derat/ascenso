// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exposes Cloud-Firestore-related functionality from Firebase.

import firebase from 'firebase/app';
import 'firebase/firestore';
import './init';

export const db = firebase.firestore();

// See https://firebase.google.com/docs/firestore/manage-data/enable-offline.
db.enablePersistence().catch(function(err) {
  if (err.code == 'failed-precondition') {
    console.log('Firestore persistence unavailable (multiple tabs open)');
  } else if (err.code == 'unimplemented') {
    console.log('Firestore persistence unsupported by browser');
  }
});
