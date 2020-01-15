// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {
    userNameField: '#profile-user-name-field',
    teamNameField: '#profile-team-name-field',
    teamMembersDiv: '#profile-team-members',
    createButton: '#profile-create-button',
    createNameField: '#profile-create-name-field',
    createConfirmButton: '#profile-create-confirm-button',
    inviteButton: '#profile-invite-button',
    inviteCodeDiv: 'div.invite-code',
    inviteDismissButton: '#profile-invite-dismiss-button',
    leaveButton: '#profile-leave-button',
    leaveConfirmButton: '#profile-leave-confirm-button',
    joinButton: '#profile-join-button',
    joinCodeField: '#profile-join-code-field',
    joinConfirmButton: '#profile-join-confirm-button',
  },
  commands: {
    setUserName(name: string) {
      // prettier isn't living up to its name here.
      return this.waitForElementVisible('@userNameField').setVTextFieldValue(
        '@userNameField',
        name
      );
    },
    setTeamName(name: string) {
      return this.waitForElementVisible('@teamNameField').setVTextFieldValue(
        '@teamNameField',
        name
      );
    },
    // The following methods open dialogs, interact with them, and then dismiss
    // them. Each initially ended with a call to waitForElementNotVisible() on
    // the dismiss button, but this seems to cause occasional failures of the
    // form "Timed out while waiting for element ___ to be present for ___
    // milliseconds. - expected 'not visible' but got: 'not found'". See e.g.
    // https://travis-ci.org/derat/ascenso/jobs/636081607.
    //
    // This likely happens because of the odd Nightwatch design decision
    // described at https://github.com/nightwatchjs/nightwatch/issues/1731,
    // where waitForElementNotVisible() asserts the element is initially present
    // in the DOM. I suspect that in some cases, Vue is removing the button from
    // the DOM before Nightwatch asserts that it exists.
    //
    // Unfortunately, using waitForElementNotPresent() instead doesn't work
    // here, since Vue also sometimes appears to leave the no-longer-visible
    // button in the DOM instead of cleaning it up immediately.
    //
    // To avoid this mess, we instead wait for an opposing button to become
    // visible in the main Profile page. For example, after creating a team, we
    // wait for the "Leave team" button to show up.
    createTeam(teamName: string, inviteCodeFunc: (code: string) => void) {
      return this.waitForElementVisible('@createButton')
        .click('@createButton')
        .setVTextFieldValue('@createNameField', teamName)
        .click('@createConfirmButton')
        .waitForElementVisible('@inviteCodeDiv')
        .getText('@inviteCodeDiv', res => inviteCodeFunc(res.value))
        .click('@inviteDismissButton')
        .waitForElementVisible('@leaveButton', 20_000);
    },
    joinTeam(inviteCode: string) {
      return this.waitForElementVisible('@joinButton')
        .click('@joinButton')
        .waitForElementVisible('@joinCodeField')
        .setVTextFieldValue('@joinCodeField', inviteCode)
        .waitForElementVisible('@joinConfirmButton')
        .click('@joinConfirmButton')
        .waitForElementVisible('@leaveButton', 20_000);
    },
    leaveTeam() {
      return this.waitForElementVisible('@leaveButton')
        .click('@leaveButton')
        .waitForElementVisible('@leaveConfirmButton')
        .click('@leaveConfirmButton')
        .waitForElementVisible('@joinButton', 20_000);
    },
    showInviteCode(inviteCodeFunc: (code: string) => void) {
      return this.waitForElementVisible('@inviteButton')
        .click('@inviteButton')
        .waitForElementVisible('@inviteCodeDiv')
        .getText('@inviteCodeDiv', res => inviteCodeFunc(res.value))
        .click('@inviteDismissButton');
    },
    checkUserOnTeam(userName: string, teamName: string) {
      this.waitForElementVisible('@teamNameField').assert.value(
        '@teamNameField',
        teamName
      );
      this.expect.element('@teamMembersDiv').text.to.contain(userName);
      return this;
    },
    // setValue() doesn't clear the existing value in a v-text-field, and
    // clearValue() doesn't seem to work either, so use this garbage instead.
    // Possibly related: https://github.com/nightwatchjs/nightwatch/issues/1132
    setVTextFieldValue(sel: string, value: string) {
      // I'm sometimes seeing input characters get scrambled, e.g. in
      // https://travis-ci.org/derat/ascenso/jobs/587196209, '088523' somehow
      // got entered as '082358'. Send each key separately and pause
      // between them to try to avoid this.
      const delayMs = 5;
      const send = keys => this.pause(delayMs).sendKeys(sel, keys);
      send([this.api.Keys.CONTROL, 'a']);
      send(this.api.Keys.DELETE);
      for (const ch of value.split('')) send(ch);
      return this;
    },
  },
};
