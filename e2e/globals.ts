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
};
