// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file exports various Firebase-related objects so they can be used by
// components. init.ts must be imported before this file in dev and prod to call
// firebase.initializeApp().

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';
type DocumentReference = firebase.firestore.DocumentReference;

import Vue from 'vue';

import { Logger } from './logger';

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
          return;
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

enum LogDest {
  STACKDRIVER,
  CONSOLE,
  NONE,
}

const isProd = process.env.NODE_ENV == 'production';
const isDev = process.env.NODE_ENV == 'development';
const isTest = process.env.NODE_ENV == 'test';

// Modify this to control where logs are sent in dev mode.
let devLogDest = LogDest.NONE;

// Returns an appropriate function to pass to the default Logger.
function getLogFunc(): firebase.functions.HttpsCallable {
  if (isProd || (isDev && devLogDest == LogDest.STACKDRIVER)) {
    return firebase.functions().httpsCallable('Log');
  }
  if (isDev && devLogDest == LogDest.CONSOLE) {
    return (data?: any) => {
      console.log(data);
      return new Promise(resolve => resolve({ data: {} }));
    };
  }
  return () => new Promise(resolve => resolve({ data: {} }));
}

const defaultLogger = new Logger('log', getLogFunc());

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
    if (!isTest) console.error(e);
  } else {
    log('ERROR', code, errorOrPayload);
    if (!isTest) console.error('Error code ' + code + ':', errorOrPayload);
  }
}
