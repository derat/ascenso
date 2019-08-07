// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import firebase from 'firebase/app';
type HttpsCallable = firebase.functions.HttpsCallable;

// LogRecord describes an individual record object sent to the "Log" Cloud
// Function.
interface LogRecord {
  time: number;
  severity: string;
  code: string;
  token?: string;
  payload: Record<string, any>;
}

// Logger sends messages to the "Log" Cloud Function.
export class Logger {
  logFunc: HttpsCallable;

  constructor(logFunc: HttpsCallable) {
    this.logFunc = logFunc;
  }

  // Sends a log record to the Cloud Function.
  // severity is a case-insensitive Severity level from
  // https://godoc.org/cloud.google.com/go/logging#pkg-constants, e.g. 'INFO'.
  // code uniquely identifies the type of event, e.g. 'load_app' or
  // 'set_user_name'.
  // payload contains structured data describing the event, e.g.
  // {userAgent: 'Foo'}.
  // If token is supplied, it contains a Firebase auth token that can be used to
  // derive the UID of the current user.
  log(
    severity: string,
    code: string,
    payload: Record<string, any>,
    token?: string
  ) {
    const record: LogRecord = {
      time: new Date().getTime(),
      severity,
      code,
      payload,
    };
    if (token) record.token = token;

    // TODO: Batch multiple records and send them all at once.
    this.logFunc([record]).then(null, err => {
      console.log('Failed to log', record, ':', err);
    });
  }
}
