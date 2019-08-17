// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exports methods that can be used to load different parts of
// Firebase asynchronously.

// Loads the core Firebase library asynchronously.
// Outside code should only call this if it needs access to Firebase's weird
// constant values, e.g. firebase.auth.GoogleAuthProvider or
// firebase.firestore.FieldValue.Delete().
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

// Tracks whether first-time Firestore setup has been performed.
let initializedFirestore = false;

// Loads Cloud Firestore asynchronously.
export function getFirestore(): Promise<firebase.firestore.Firestore> {
  return Promise.all([
    import(/* webpackChunkName: "firebase-init" */ './init'),
    import(/* webpackChunkName: "firebase-firestore" */ 'firebase/firestore'),
  ]).then(([init, _]) => {
    if (!initializedFirestore) {
      // Enable persistence the first time the module is loaded:
      // https://firebase.google.com/docs/firestore/manage-data/enable-offline
      init.app
        .firestore()
        .enablePersistence()
        .catch(err => {
          import('@/log').then(log => {
            // 'failed-precondition' means that multiple tabs are open.
            // 'unimplemented' means a lack of browser support.
            log.logError('firestore_persistence_failed', err);
          });
        });
      initializedFirestore = true;
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
