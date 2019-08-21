// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exports methods that can be used to load different parts of
// Firebase asynchronously.

// Loads the core Firebase library asynchronously.
// Outside code should only call this if it needs access to Firebase's weird
// constant values, e.g. firebase.auth.GoogleAuthProvider or
// firebase.firestore.FieldValue.delete().
export function getFirebase() {
  return import(/* webpackChunkName: "firebase-app" */ 'firebase/app');
}

// Loads Firebase auth asynchronously.
export function getAuth(): Promise<firebase.auth.Auth> {
  return Promise.all([
    import(/* webpackChunkName: "firebase-init" */ './init'),
    import(/* webpackChunkName: "firebase-auth" */ 'firebase/auth'),
  ]).then(([init, _]) => init.app.auth());
}

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

// Loads Cloud Firestore asynchronously.
export function getFirestore(): Promise<firebase.firestore.Firestore> {
  return Promise.all([
    import(/* webpackChunkName: "firebase-init" */ './init'),
    import(/* webpackChunkName: "firebase-firestore" */ 'firebase/firestore'),
  ]).then(([init, _]) => {
    // Enable persistence the first time the module is loaded:
    // https://firebase.google.com/docs/firestore/manage-data/enable-offline
    if (persistence == FirestorePersistence.UNINITIALIZED) {
      persistence = FirestorePersistence.INITIALIZING;
      init.app
        .firestore()
        .enablePersistence({ synchronizeTabs: true })
        .then(() => {
          persistence = FirestorePersistence.ENABLED;
        })
        .catch(err => {
          persistence = FirestorePersistence.DISABLED;
          import('@/log').then(log => {
            log.logError('firestore_persistence_failed', err);
          });
        });
    }

    return init.app.firestore();
  });
}

// Loads Cloud Functions asynchronously.
export function getFunctions(): Promise<firebase.functions.Functions> {
  return Promise.all([
    import(/* webpackChunkName: "firebase-init" */ './init'),
    import(/* webpackChunkName: "firebase-functions" */ 'firebase/functions'),
  ]).then(([init, _]) => init.app.functions());
}

// Loads FirebaseUI asynchronously. Note that this isn't part of the core
// Firebase library.
export function getFirebaseUI() {
  return import(/* webpackChunkName: "firebaseui" */ 'firebaseui');
}
