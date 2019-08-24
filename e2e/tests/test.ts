// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Selectors used for accessing elements in various components.
const LOGIN_START_BUTTON = 'button[data-provider-id=password]';
const LOGIN_EMAIL_INPUT = 'input[name=email]';
const LOGIN_PASSWORD_INPUT = 'input[name=password]';
const LOGIN_NEXT_BUTTON = 'button.firebaseui-id-submit';

const PROFILE_USER_NAME_FIELD = '#profile-user-name-field';
const PROFILE_TEAM_NAME_FIELD = '#profile-team-name-field';
const PROFILE_TEAM_MEMBER_DIV = 'div.member-name';
const PROFILE_CREATE_BUTTON = '#profile-create-button';
const PROFILE_CREATE_NAME_FIELD = '#profile-create-name-field';
const PROFILE_CREATE_CONFIRM_BUTTON = '#profile-create-confirm-button';
const PROFILE_INVITE_BUTTON = '#profile-invite-button';
const PROFILE_INVITE_CODE_DIV = 'div.invite-code';
const PROFILE_INVITE_DISMISS_BUTTON = '#profile-invite-dismiss-button';
const PROFILE_LEAVE_BUTTON = '#profile-leave-button';
const PROFILE_LEAVE_CONFIRM_BUTTON = '#profile-leave-confirm-button';
const PROFILE_JOIN_BUTTON = '#profile-join-button';
const PROFILE_JOIN_CODE_FIELD = '#profile-join-code-field';
const PROFILE_JOIN_CONFIRM_BUTTON = '#profile-join-confirm-button';

const TOOLBAR_MENU_ICON = '#toolbar-menu-icon';
const TOOLBAR_NAV_ROUTES = '#toolbar-nav-routes';

module.exports = {
  Test: function(browser) {
    if (!process.env.E2E_URL) throw new Error('E2E_URL undefined');

    const userName = 'My Name';
    const teamName = 'My Team';
    const newTeamName = 'Updated Team';

    // Assigned after creating team. To read this, pass a function to perform()
    // to ensure that the post-assignment value is seen.
    let inviteCode;

    // setValue() doesn't clear the existing value in a v-text-field, and
    // clearValue() doesn't seem to work either, so use this garbage instead.
    // Possibly related: https://github.com/nightwatchjs/nightwatch/issues/1132
    browser.setVTextFieldValue = function(sel: string, value: string) {
      return this.sendKeys(sel, [browser.Keys.CONTROL, 'a'])
        .sendKeys(sel, browser.Keys.DELETE)
        .sendKeys(sel, value.split(''));
    };

    browser
      .perform(() => console.log('Logging in'))
      .url(process.env.E2E_URL)
      .waitForElementVisible(LOGIN_START_BUTTON)
      .click(LOGIN_START_BUTTON)
      .waitForElementVisible(LOGIN_EMAIL_INPUT)
      .setValue(LOGIN_EMAIL_INPUT, process.env.E2E_EMAIL)
      .waitForElementVisible(LOGIN_NEXT_BUTTON)
      .click(LOGIN_NEXT_BUTTON)
      .waitForElementVisible(LOGIN_PASSWORD_INPUT)
      .setValue(LOGIN_PASSWORD_INPUT, process.env.E2E_PASSWORD)
      .waitForElementVisible(LOGIN_NEXT_BUTTON)
      .click(LOGIN_NEXT_BUTTON)
      // Timeouts here may indicate that another test instance already signed in
      // with the E2E test user account after this instance deleted the user
      // from Firestore, so we were sent to the routes page instead of the
      // profile. Disable test concurrency to prevent this from happening.
      .waitForElementVisible(PROFILE_USER_NAME_FIELD)
      .assert.urlContains('/profile');

    browser
      .perform(() => console.log("Changing user's name"))
      .setVTextFieldValue(PROFILE_USER_NAME_FIELD, userName);

    browser
      .perform(() => console.log('Creating team'))
      .click(PROFILE_CREATE_BUTTON)
      .setValue(PROFILE_CREATE_NAME_FIELD, teamName)
      .click(PROFILE_CREATE_CONFIRM_BUTTON)
      .waitForElementVisible(PROFILE_INVITE_CODE_DIV)
      .getText(PROFILE_INVITE_CODE_DIV, res => {
        inviteCode = res.value;
      })
      .click(PROFILE_INVITE_DISMISS_BUTTON)
      .waitForElementVisible(PROFILE_TEAM_NAME_FIELD)
      .assert.value(PROFILE_TEAM_NAME_FIELD, teamName)
      .assert.containsText(PROFILE_TEAM_MEMBER_DIV, userName);

    browser
      .perform(() => console.log("Changing team's name"))
      .setVTextFieldValue(PROFILE_TEAM_NAME_FIELD, newTeamName);

    browser
      .perform(() => console.log('Showing invite code'))
      .waitForElementVisible(PROFILE_INVITE_BUTTON)
      .click(PROFILE_INVITE_BUTTON)
      .waitForElementVisible(PROFILE_INVITE_CODE_DIV)
      .perform(function() {
        this.assert.containsText(PROFILE_INVITE_CODE_DIV, inviteCode);
      })
      .click(PROFILE_INVITE_DISMISS_BUTTON);

    browser
      .perform(() => console.log('Leaving team'))
      .waitForElementVisible(PROFILE_LEAVE_BUTTON)
      .click(PROFILE_LEAVE_BUTTON)
      .waitForElementVisible(PROFILE_LEAVE_CONFIRM_BUTTON)
      .click(PROFILE_LEAVE_CONFIRM_BUTTON);

    browser
      .perform(() => console.log('Joining team'))
      .waitForElementVisible(PROFILE_JOIN_BUTTON)
      .click(PROFILE_JOIN_BUTTON)
      .waitForElementVisible(PROFILE_JOIN_CODE_FIELD)
      .perform(function() {
        this.setValue(PROFILE_JOIN_CODE_FIELD, inviteCode);
      })
      .waitForElementVisible(PROFILE_JOIN_CONFIRM_BUTTON)
      .click(PROFILE_JOIN_CONFIRM_BUTTON)
      .waitForElementVisible(PROFILE_TEAM_NAME_FIELD)
      .assert.value(PROFILE_TEAM_NAME_FIELD, newTeamName)
      .assert.containsText(PROFILE_TEAM_MEMBER_DIV, userName);

    browser
      .perform(() => console.log('Climbing some routes'))
      .click(TOOLBAR_MENU_ICON)
      .waitForElementVisible(TOOLBAR_NAV_ROUTES)
      .click(TOOLBAR_NAV_ROUTES);
    // TODO: Check that routes are actually shown, set states, etc.

    // Uncommenting this can be helpful for debugging after a failure.
    //browser.pause(10000);

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
  },
};
