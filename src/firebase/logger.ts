// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import firebase from 'firebase/app';
type HttpsCallable = firebase.functions.HttpsCallable;

// LogRecord describes an individual record object sent to the "Log" Cloud
// Function. This is exported for testing.
export interface LogRecord {
  time: number;
  severity: string;
  code: string;
  token?: string;
  payload: Record<string, any>;
}

// Returns the localStorage key prefix that should be used by a Logger with the
// supplied name and ID. Exported for unit tests.
export function makeKeyPrefix(loggerName: string, loggerID: string) {
  return `${loggerName}.${loggerID}.`;
}

// localStorage key suffixes used for queued and in-flight log records and the
// logger's last-active time. Exported for unit tests.
export const queuedKeySuffix = 'queued';
export const sendingKeySuffix = 'sending';
export const lastActiveKeySuffix = 'lastActive';

// Returns true if running under a test.
const isTestEnv = () => process.env.NODE_ENV == 'test';

// Logger sends records to the "Log" Cloud Function.
export class Logger {
  _name: string;
  _logFunc: HttpsCallable;
  _nowFunc: () => number;
  _intervalMs: number;

  // Prefix used in local storage keys. See makeKeyPrefix().
  _storagePrefix: string;
  // Last time _sendQueued() was called, as milliseconds since the epoch.
  _lastSendTime: number = 0;
  // ID of timeout used to invoke _sendQueued().
  _sendTimeoutID: number = 0;

  // name identifies the logger and should be constant across app invocations.
  // logFunc invokes the "Log" Cloud Function.
  // intervalMs is the minimum interval between Cloud Function invocations.
  // nowFunc is called to get the current time as milliseconds since the epoch.
  constructor(
    name: string,
    logFunc: HttpsCallable,
    intervalMs = 10_000,
    nowFunc = () => new Date().getTime()
  ) {
    this._name = name;
    this._logFunc = logFunc;
    this._intervalMs = intervalMs;
    this._nowFunc = nowFunc;

    // Put a random ID in localStorage key names to prevent a huge mess if the
    // app is open in multiple tabs that are all sharing the same localStorage.
    const id = Math.random()
      .toString()
      .slice(2, 2 + 8);
    this._storagePrefix = makeKeyPrefix(name, id);

    this._claimAbandonedRecords();
    this._scheduleSend();
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
    const now = this._nowFunc();
    const record: LogRecord = {
      time: now,
      severity,
      code,
      payload,
    };
    if (token) record.token = token;

    this._updateLastActive(now);
    this._enqueueRecords([record]);
    this._scheduleSend();
  }

  // Sets the logger's last-active time in localStorage to now, a timestamp as
  // milliseconds since the epoch.
  _updateLastActive(now: number) {
    localStorage.setItem(
      this._storagePrefix + lastActiveKeySuffix,
      now.toString()
    );
  }

  // Returns records from localStorage identified by the given key suffix
  // (queuedKeySuffix or sendingKeySuffix).
  _getRecords(keySuffix: string, prefix?: string): LogRecord[] {
    const key = (prefix || this._storagePrefix) + keySuffix;
    const s = localStorage.getItem(key);
    if (!s) return [];
    try {
      return JSON.parse(s);
    } catch (err) {
      if (!isTestEnv()) console.error(`Failed to parse ${key}: ${err}`);
      return [];
    }
  }

  // Sets the localStorage key with the given suffix (queuedKeySuffix or
  // sendingKeySuffix) to contain the supplied records.
  _setRecords(keySuffix: string, records: LogRecord[], prefix?: string) {
    const key = (prefix || this._storagePrefix) + keySuffix;
    localStorage.setItem(key, JSON.stringify(records));
  }

  // Adds the supplied records to the queue.
  _enqueueRecords(records: LogRecord[]) {
    const queued = this._getRecords(queuedKeySuffix);
    queued.push(...records);
    this._setRecords(queuedKeySuffix, queued);
  }

  // Returns true if records are in-flight to the Cloud Function.
  _currentlySending(): boolean {
    return !!this._getRecords(sendingKeySuffix).length;
  }

  // Asynchronously sends all queued records to the Cloud Function.
  // Records are moved to the 'sending' state while in-flight.
  // Schedules another invocation of itself on failure.
  _sendQueued() {
    if (this._currentlySending()) {
      console.error('Already sending log records');
      return;
    }

    const now = this._nowFunc();
    this._sendTimeoutID = 0;
    this._lastSendTime = now;
    this._updateLastActive(now);

    // Periodically move any stale instances' records into the queue.
    this._claimAbandonedRecords();

    // Move the records from the queued state to the sending state.
    const records = this._getRecords(queuedKeySuffix);
    this._setRecords(sendingKeySuffix, records);
    this._setRecords(queuedKeySuffix, []);

    this._logFunc({ records, now })
      .catch(err => {
        // On failure, move the records back to the queue.
        this._enqueueRecords(records);
        if (!isTestEnv()) console.error('Failed sending log records:', err);
      })
      .finally(() => {
        this._setRecords(sendingKeySuffix, []);
        this._scheduleSend();
      });
  }

  // Schedules a call to _sendQueued().
  _scheduleSend() {
    if (this._sendTimeoutID || this._currentlySending()) return;
    // TODO: Check network status.
    if (!this._getRecords(queuedKeySuffix).length) return;

    let delayMs = 0;
    if (this._lastSendTime > 0) {
      const elapsedMs = this._nowFunc() - this._lastSendTime;
      delayMs = Math.max(this._intervalMs - elapsedMs, 0);
    }

    this._sendTimeoutID = setTimeout(this._sendQueued.bind(this), delayMs);
  }

  // Iterates over localStorage and claims ownership of records abandoned by
  // previous Logger instances.
  _claimAbandonedRecords() {
    Object.keys(localStorage).forEach(key => {
      // Look for other instances' last-active times.
      if (
        !key.startsWith(this._name + '.') ||
        !key.endsWith('.' + lastActiveKeySuffix)
      ) {
        return;
      }

      // If the other instance was recently active, leave its logs alone.
      const lastActive = parseInt(localStorage.getItem(key) || '0');
      if (!lastActive) return;
      const elapsed = this._nowFunc() - lastActive;
      if (elapsed < 2 * this._intervalMs) return;

      // Chop off the suffix to get '<name>.<id>.'.
      const prefix = key.slice(0, -lastActiveKeySuffix.length);

      // Enqueue the other instance's in-flight and queued records.
      const sending = this._getRecords(sendingKeySuffix, prefix);
      this._enqueueRecords(sending);
      const queued = this._getRecords(queuedKeySuffix, prefix);
      this._enqueueRecords(queued);

      // Clean up the old records.
      localStorage.removeItem(prefix + sendingKeySuffix);
      localStorage.removeItem(prefix + queuedKeySuffix);
      localStorage.removeItem(key);

      if (!isTestEnv()) {
        console.log(
          `Claimed ${sending.length} in-flight and ${queued.length} queued ` +
            `log record(s) with prefix "${prefix}"`
        );
      }
    });
  }
}
