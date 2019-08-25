// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {
    wrapper: '#login-wrapper',
    startButton: 'button[data-provider-id=password]',
    emailInput: 'input[name=email]',
    passwordInput: 'input[name=password]',
    nextButton: 'button.firebaseui-id-submit',
  },
  commands: {
    // Signs in using |email| and |password| and blocks until the login page is
    // no longer loaded.
    signIn(email: string, password: string) {
      return this.waitForElementVisible('@startButton')
        .click('@startButton')
        .waitForElementVisible('@emailInput')
        .setValue('@emailInput', email)
        .waitForElementVisible('@nextButton')
        .click('@nextButton')
        .waitForElementVisible('@passwordInput')
        .setValue('@passwordInput', password)
        .waitForElementVisible('@nextButton')
        .click('@nextButton')
        .waitForElementNotPresent('@wrapper');
    },
  },
};
