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
import 'firebase/functions';
type DocumentReference = firebase.firestore.DocumentReference;

import Vue from 'vue';

import { Logger } from './logger';

import config from './config';
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

// getUser returns the firebase.auth.User for the currently-logged in user.
// An error is thrown if the user is not logged in.
export function getUser() {
  if (!auth.currentUser) {
    throw new Error('No current user');
  }
  return auth.currentUser;
}

// DocRefs contains references to documents in the 'users' and (optionally)
// 'teams' collections and is returned by bindUserAndTeamDocs.
interface DocRefs {
  user: DocumentReference;
  team: DocumentReference | null;
}

// Returns a promise that is satisfied once document snapshot(s) are loaded.
// The user and team documents (if present) are bound to properties named
// userProp and teamProp on view.
export function bindUserAndTeamDocs(
  view: Vue,
  userId: string,
  userProp: string,
  teamProp: string
): Promise<DocRefs> {
  return new Promise((resolve, reject) => {
    const userRef = db.collection('users').doc(userId);
    view.$bind(userProp, userRef).then(
      userSnap => {
        if (!userSnap.team) {
          resolve({ user: userRef, team: null });
        }
        const teamRef = db.collection('teams').doc(userSnap.team);
        view.$bind(teamProp, teamRef).then(() => {
          resolve({ user: userRef, team: teamRef });
        });
      },
      err => {
        reject(err);
      }
    );
  });
}

// Change this to true to send logs to Stackdriver in dev environments.
// By default, we only send logs in production.
const logForDev = false;

// Only log to Stackdriver in production environments.
const defaultLogger = new Logger(
  'log',
  process.env.NODE_ENV == 'production' ||
  (logForDev && process.env.NODE_ENV == 'dev')
    ? firebase.functions().httpsCallable('Log')
    : () => new Promise(resolve => resolve({ data: {} }))
);

// Helper function that sends a log message to Stackdriver.
// See the Logger class's log method for more details.
function log(severity: string, code: string, payload: Record<string, any>) {
  if (!auth.currentUser) {
    defaultLogger.log(severity, code, payload);
    return;
  }

  auth.currentUser
    .getIdToken()
    .then(
      token => defaultLogger.log(severity, code, payload, token),
      err => console.log('Failed to get ID token:', err)
    );
}

// Sends a record to Stackdriver with DEBUG severity.
export function logDebug(code: string, payload: Record<string, any>) {
  log('DEBUG', code, payload);
}

// Sends a record to Stackdriver with INFO severity.
export function logInfo(code: string, payload: Record<string, any>) {
  log('INFO', code, payload);
}

// Sends a record to Stackdriver with ERROR severity.
// If an Error object is passed, its fields are automatically extracted.
// The error or payload is also logged via console.error.
export function logError(
  code: string,
  errorOrPayload: Error | Record<string, any>
) {
  if (errorOrPayload instanceof Error) {
    const e: Error = errorOrPayload;
    log('ERROR', code, { message: e.message, name: e.name, stack: e.stack });
    console.error(e);
  } else {
    log('ERROR', code, errorOrPayload);
    console.error('Error code ' + code + ':', errorOrPayload);
  }
}
