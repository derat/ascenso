// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { Logger, LogFunc } from './logger';
import { getAuth, getFunctions } from '@/firebase';

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
function getLogFunc(): LogFunc | Promise<LogFunc> {
  if (isProd || (isDev && devLogDest == LogDest.STACKDRIVER)) {
    // Return a promise so that importing this module doesn't require
    // synchronously loading bulky Firebase code.
    return getFunctions().then(functions => functions.httpsCallable('Log'));
  }
  if (isDev && devLogDest == LogDest.CONSOLE) {
    return data => {
      for (const rec of data.records) {
        console.log(`${rec.severity} ${rec.code}:`, rec.payload);
      }
      return Promise.resolve({ data: {} });
    };
  }
  return () => Promise.resolve({ data: {} });
}

const defaultLogger = new Logger('log', getLogFunc());

// Helper function that sends a log message to Stackdriver.
// See the Logger class's log method for more details.
function log(severity: string, code: string, payload: Record<string, any>) {
  getAuth()
    .then(auth => {
      const user = auth.currentUser;
      if (!user) {
        defaultLogger.log(severity, code, payload);
        return;
      }
      user
        .getIdToken()
        .then(
          token => defaultLogger.log(severity, code, payload, token),
          err => console.log('Failed to get ID token:', err)
        );
    })
    .catch(err => {
      console.error(`Failed to import Firebase auth code: ${err}`);
    });
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
