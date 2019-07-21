// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file initializes Firebase and exports various objects so they can be
// used by components.
//
// This logic is intentionally kept separate from main.js to ensure that it can
// be initialized when it's imported by components. When this code was instead
// placed in main.js, there were issues caused (I think) by circular
// dependencies -- components' <script> elements were evaluated before main.js
// had been fully evaluated, resulting in 'auth' and 'db' being undefined at the
// top level of those <script> elements.

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

import config from './config.js';
firebase.initializeApp(config);

export const auth = firebase.auth();
export const db = firebase.firestore();

// See https://firebase.google.com/docs/firestore/manage-data/enable-offline.
db.enablePersistence().catch(function(err) {
  if (err.code == 'failed-precondition') {
    console.log('Firestore persistence unavailable (multiple tabs open)');
  } else if (err.code == 'unimplemented') {
    console.log('Firestore persistence unsupported by browser');
  }
});
