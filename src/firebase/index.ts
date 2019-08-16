// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file initializes Firebase and exports various Firebase-related objects
// so they can be used by components.

import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';
import 'firebase/functions';

import { Logger } from './logger';

firebase.initializeApp({
  apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
  authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
  projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VUE_APP_FIREBASE_APP_ID,
});

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
