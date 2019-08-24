// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const axios = require('axios');
const querystring = require('querystring');

// Global hooks can be defined here.
module.exports = {
  before: async () => {
    if (!process.env.E2E_EMAIL) throw new Error('E2E_EMAIL undefined');
    console.log(`Deleting user ${process.env.E2E_EMAIL}`);

    // Axios sends JSON-encoded form parameters by default, but Go expects
    // URL-encoded params. See
    // https://github.com/axios/axios#using-applicationx-www-form-urlencoded-format.
    await axios.post(
      process.env.E2E_TEST_FUNC_URL,
      querystring.stringify({
        action: 'deleteUser',
        email: process.env.E2E_EMAIL,
      })
    );
  },

  afterEach: (browser, done) => {
    browser
      .getLog('browser', entries => {
        console.log('\nBrowser console:');
        for (const entry of entries) {
          // Log entry messages start with URLs like this (but much longer):
          //
          // webpack-internal:///./foo!./bar!./src/views/Login.vue?vue&type=script&lang=ts&
          //
          // We chop off everything before the last path in the list and then
          // remove its leading './' and query string.
          let msg = entry.message
            .replace(/^webpack-internal:\/\/\//, '')
            .replace(/^(\S+!)/, '')
            .replace(/^\.\//, '')
            .replace(/^([^?]+)\?\S+/, '$1');

          // After the path and a line:column like "55:18", there appears to be
          // a JSON string containing the actual message. Try to unescape it so
          // we don't write a bunch of annoying backslash-escaped double quotes.
          try {
            const match = msg.match(/^\S+ \S+ /);
            if (match) {
              const prefix = match[0];
              msg = prefix + JSON.parse(msg.substr(prefix.length));
            }
          } catch {}

          console.log(`[${entry.level}] ${entry.timestamp}: ${msg}`);
        }
      })
      .end();
    done();
  },
};
