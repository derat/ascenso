// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import firebase from 'firebase/app';

import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

// Make sure that we're not using the real Firebase in tests.
if (
  process.env.NODE_ENV == 'test' &&
  !Object.prototype.hasOwnProperty.call(firebase, 'mocked')
) {
  throw new Error("Test must import '@/firebase/mock' first");
}

export const app = firebase.initializeApp({
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
});

// Firestore persistence state.
export enum FirestorePersistence {
  UNINITIALIZED,
  INITIALIZING,
  ENABLED,
  DISABLED,
}

let persistence = FirestorePersistence.UNINITIALIZED;

// Returns the current state of Firestore persistence (i.e. offline support).
export function getFirestorePersistence() {
  return persistence;
}

// Enable persistence the first time the module is loaded:
// https://firebase.google.com/docs/firestore/manage-data/enable-offline
if (persistence == FirestorePersistence.UNINITIALIZED) {
  persistence = FirestorePersistence.INITIALIZING;
  app
    .firestore()
    .enablePersistence({ synchronizeTabs: true })
    .then(() => {
      persistence = FirestorePersistence.ENABLED;
    })
    .catch((err) => {
      persistence = FirestorePersistence.DISABLED;
      import('@/log').then((log) => {
        log.logError('firestore_persistence_failed', err);
      });
    });
}
