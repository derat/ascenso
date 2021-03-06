// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { Component } from 'vue-property-decorator';
import { logDebug } from '@/log';

@Component
export default class Perf extends Vue {
  constructed: DOMHighResTimeStamp;
  eventTimestamps: Record<string, DOMHighResTimeStamp> = {};
  loggedReady = false;

  constructor() {
    super();
    this.constructed = window.performance.now();
  }

  // Records timestamps when the Vue and its components are mounted.
  // This is a lifecycle hook and shouldn't be called manually.
  mounted() {
    this.recordEvent('mounted');
    // Also report when child components have been mounted:
    // https://vuejs.org/v2/api/#mounted
    this.$nextTick(() => this.recordEvent('rendered'));
  }

  // Records a timestamp for an event identified by |name|. Views using this
  // mixin should call this to report significant events.
  recordEvent(name: string) {
    this.eventTimestamps[name] = window.performance.now();
  }

  // Adds a 'ready' timestamp and reports performance data. Views using this
  // mixin should call this once when they are fully loaded. |extraData| will
  // be included in the log record.
  logReady(code: string, extraData: Record<string, any> = {}) {
    if (this.loggedReady) return;

    this.recordEvent('ready');

    // Construct a payload mapping from event name to elapsed time in
    // milliseconds.
    const payload: Record<string, any> = { view: {} };
    for (const name of Object.keys(this.eventTimestamps)) {
      payload.view[name] = Math.round(
        this.eventTimestamps[name] - this.constructed
      );
    }
    for (const key of Object.keys(extraData)) payload[key] = extraData[key];
    logDebug(code, payload);

    this.loggedReady = true;
  }
}
