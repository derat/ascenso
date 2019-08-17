// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  Logger,
  LogFunc,
  LogFuncResult,
  LogRecord,
  makeKeyPrefix,
  queuedKeySuffix,
  sendingKeySuffix,
  lastActiveKeySuffix,
} from './logger';

// Data passed from Logger to the "Log" Cloud Function.
class CloudFuncData {
  constructor(public now: number, public records: LogRecord[]) {}
}

// Constructs a new LogRecord with the supplied timestamp and code.
// Other fields are set to arbitrary hardcoded values.
function newRecord(time: number, code: string): LogRecord {
  return {
    time,
    severity: 'INFO',
    code,
    payload: { foo: 'bar' },
    token: 'auth',
  };
}

// Simulates the "Log" Cloud Function and synchronizes interactions between
// Logger and tests.
class Endpoint {
  // Resolve and reject functions for the promise returned to Logger via _log().
  _logResolve?: (data: LogFuncResult) => void;
  _logReject?: (data: LogFuncResult) => void;
  // Resolve function for the promise returned via handleCall().
  _handleCallResolve?: (data?: CloudFuncData) => void;

  // Data received from Logger via _log().
  _receivedData?: CloudFuncData;
  // Whether _log() should report success to Logger.
  _logResult: boolean = true;

  // Implementation of the "Log" Cloud Function. Saves the supplied data so it
  // can be passed to the test and returns a promise that will be fulfilled once
  // the test has called handleCall.
  _log(data?: any): Promise<LogFuncResult> {
    return new Promise((resolve, reject) => {
      if (this._logResolve) {
        throw new Error('Log function called again before handleCall');
      }
      this._logResolve = resolve;
      this._logReject = reject;
      this._receivedData = data;
      this._maybeResolvePromises();
    });
  }

  // Called by tests to indicate the response that should be supplied to Logger.
  // The returned promise will be resolved with the data that Logger passed to
  // _log().
  handleCall(succeed: boolean): Promise<CloudFuncData> {
    return new Promise(resolve => {
      if (this._handleCallResolve) {
        throw new Error('handleCall called again before log function');
      }
      this._handleCallResolve = resolve;
      this._logResult = succeed;
      this._maybeResolvePromises();
    });
  }

  // Resolves the promises returned to Logger and the test if both sides are
  // ready (i.e. Logger has called _log() and the test has called handleCall()).
  // Does nothing otherwise.
  _maybeResolvePromises() {
    if (!this._logResolve || !this._logReject || !this._handleCallResolve) {
      return;
    }

    this._logResult
      ? this._logResolve({ data: { msg: 'Success' } })
      : this._logReject({ data: { msg: 'Intentional failure' } });
    this._handleCallResolve(this._receivedData);

    this._logResolve = undefined;
    this._logReject = undefined;
    this._handleCallResolve = undefined;
    this._receivedData = undefined;
  }

  // Returns the Cloud Function callable that should be passed to Logger.
  getLogFunc(): LogFunc {
    return this._log.bind(this);
  }
}

describe('Logger', () => {
  // Logger name.
  const name = 'test';

  // Simulates the Cloud Function.
  let endpoint: Endpoint;
  // Object being tested.
  let logger: Logger;

  // Time returned by logger._now(), as milliseconds since the epoch.
  let now: number;
  // State returned by logger._online().
  let online: boolean;
  // Mock implementation of window.addEventListener.
  let addEventListenerMock: jest.Mock;

  beforeEach(() => {
    // Capture calls to window.addEventListener.
    addEventListenerMock = jest.fn();
    window.addEventListener = addEventListenerMock;

    localStorage.clear();
    now = 1;
    online = true;
    endpoint = new Endpoint();
    createLogger(5);
  });

  // Creates a new Logger with the supplied logging interval.
  // The |logFunc| argument can be supplied to pass a promised logging function
  // to the Logger instead of passing |endpoint|'s function.
  function createLogger(intervalMs: number, logFunc?: Promise<LogFunc>) {
    logger = new Logger(
      name,
      logFunc || endpoint.getLogFunc(),
      intervalMs,
      () => now,
      () => online
    );
  }

  // Sends relevant fields of the supplied record to logger.log.
  function sendRecord(rec: LogRecord) {
    logger.log(rec.severity, rec.code, rec.payload, rec.token);
  }

  // Calls all listeners previously passed to window.addEventListener for event
  // |name|. At present, doesn't actually send them an event or handle removed
  // listeners.
  function callListeners(name: string) {
    for (let i = 0; i < addEventListenerMock.mock.calls.length; i++) {
      const call = addEventListenerMock.mock.calls[i];
      if (call[0] == name) call[1]();
    }
  }

  it('sends individual records', done => {
    const rec1 = newRecord(now, 'first');
    const rec2 = newRecord(now + 1, 'second');

    // Send the first record and report success.
    sendRecord(rec1);
    endpoint
      .handleCall(true)
      .then(data => {
        // Advance the time and send a second record.
        expect(data).toEqual(new CloudFuncData(now, [rec1]));
        expect(logger.isSendScheduled()).toBe(false);
        now++;
        sendRecord(rec2);
        return endpoint.handleCall(true);
      })
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec2]));
        expect(logger.isSendScheduled()).toBe(false);
        done();
      });
  });

  it('batches multiple records', done => {
    const rec1 = newRecord(now, 'first');
    const rec2 = newRecord(now, 'second');
    const rec3 = newRecord(now, 'third');

    // Send all three records without yielding and check that they're passed in
    // a single call.
    sendRecord(rec1);
    sendRecord(rec2);
    sendRecord(rec3);
    endpoint.handleCall(true).then(data => {
      expect(data).toEqual(new CloudFuncData(now, [rec1, rec2, rec3]));
      expect(logger.isSendScheduled()).toBe(false);
      done();
    });
  });

  it('retries on failure', done => {
    const rec = newRecord(now, 'code');

    // Log a single record. Make the cloud function fail twice before
    // succeeding.
    sendRecord(rec);
    endpoint
      .handleCall(false)
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec]));
        now++;
        return endpoint.handleCall(false);
      })
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec]));
        now++;
        return endpoint.handleCall(true);
      })
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec]));
        expect(logger.isSendScheduled()).toBe(false);
        done();
      });
  });

  it('tolerates bad data in localStorage', done => {
    const rec1 = newRecord(now, 'first');
    const rec2 = newRecord(now, 'second');

    sendRecord(rec1);
    endpoint
      .handleCall(true)
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec1]));
        // Find the 'queued' localStorage item and write junk into it. It's
        // supposed to contain an array of LogRecord objects.
        Object.keys(localStorage).forEach(key => {
          if (key.endsWith('.' + queuedKeySuffix)) {
            localStorage.setItem(key, 'bad data');
          }
        });
        // When the logger is asked to send another record, it should ignore the
        // bad data that it sees in local storage. It's important that it
        // doesn't throw an exception, as the logger is also used to report
        // exceptions.
        sendRecord(rec2);
        return endpoint.handleCall(true);
      })
      .then(data => {
        expect(data).toEqual(new CloudFuncData(now, [rec2]));
        expect(logger.isSendScheduled()).toBe(false);
        done();
      });
  });

  it('sends records abandoned by previous instance', done => {
    // Set localStorage items to simulate a previous instance having left behind
    // a queued record and an in-flight record a minute ago.
    const oldPrefix = makeKeyPrefix(name, '12345');
    const lastActiveKey = oldPrefix + lastActiveKeySuffix;
    localStorage.setItem(lastActiveKey, '1');

    const queuedRec = newRecord(now, 'queued');
    const queuedKey = oldPrefix + queuedKeySuffix;
    localStorage.setItem(queuedKey, JSON.stringify([queuedRec]));

    const sendingRec = newRecord(now, 'sending');
    const sendingKey = oldPrefix + sendingKeySuffix;
    localStorage.setItem(sendingKey, JSON.stringify([sendingRec]));

    // When a new instance is created, it should send the old records and clear
    // the local storage entries.
    now = 60_000;
    createLogger(5);
    endpoint.handleCall(true).then(data => {
      expect(data).toEqual(new CloudFuncData(now, [sendingRec, queuedRec]));
      expect(logger.isSendScheduled()).toBe(false);
      expect(localStorage.getItem(lastActiveKey)).toBeNull();
      expect(localStorage.getItem(queuedKey)).toBeNull();
      expect(localStorage.getItem(sendingKey)).toBeNull();
      done();
    });
  });

  it("cleans up after previous instance that didn't leave records", () => {
    // Set localStorage items to simulate a previous instance exiting cleanly.
    const oldPrefix = makeKeyPrefix(name, '12345');
    const lastActiveKey = oldPrefix + lastActiveKeySuffix;
    localStorage.setItem(lastActiveKey, '1');

    // When a new logger is created, it should delete the old last-active item,
    // and also be able to tolerate not finding any records belonging to it.
    now = 60_000;
    createLogger(5);
    expect(localStorage.getItem(lastActiveKey)).toBeNull();
    expect(logger.isSendScheduled()).toBe(false);
  });

  it('defers sending records while offline', done => {
    // Logger shouldn't schedule sending records while offline.
    online = false;
    const rec = newRecord(now, 'code');
    sendRecord(rec);
    expect(logger.isSendScheduled()).toBe(false);

    // Simulate the browser coming online.
    now++;
    online = true;
    callListeners('online');

    // The record should be sent now.
    endpoint.handleCall(true).then(data => {
      expect(data).toEqual(new CloudFuncData(now, [rec]));
      expect(logger.isSendScheduled()).toBe(false);
      done();
    });
  });

  it('defers logging when passed a promise', done => {
    // Give the logger a promise for a log function.
    createLogger(
      5,
      new Promise(resolve => {
        resolve(endpoint.getLogFunc());
      })
    );

    // Sending shouldn't be scheduled initially since the logger doesn't have a
    // log function yet (since it's still waiting on the promise).
    const rec = newRecord(now, 'code');
    sendRecord(rec);
    expect(logger.isSendScheduled()).toBe(false);

    // After the promise is resolved, the record should be sent.
    endpoint.handleCall(true).then(data => {
      expect(data).toEqual(new CloudFuncData(now, [rec]));
      expect(logger.isSendScheduled()).toBe(false);
      done();
    });
  });
});
