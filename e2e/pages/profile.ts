// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {
    userNameField: '#profile-user-name-field',
    teamNameField: '#profile-team-name-field',
    teamMemberDiv: 'div.member-name',
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
    createTeam(teamName: string, inviteCodeFunc: (code: string) => void) {
      return this.waitForElementVisible('@createButton')
        .click('@createButton')
        .setVTextFieldValue('@createNameField', teamName)
        .click('@createConfirmButton')
        .waitForElementVisible('@inviteCodeDiv')
        .getText('@inviteCodeDiv', res => inviteCodeFunc(res.value))
        .click('@inviteDismissButton');
    },
    joinTeam(inviteCode: string) {
      return this.waitForElementVisible('@joinButton')
        .click('@joinButton')
        .waitForElementVisible('@joinCodeField')
        .setVTextFieldValue('@joinCodeField', inviteCode)
        .waitForElementVisible('@joinConfirmButton')
        .click('@joinConfirmButton');
    },
    leaveTeam() {
      return this.waitForElementVisible('@leaveButton')
        .click('@leaveButton')
        .waitForElementVisible('@leaveConfirmButton')
        .click('@leaveConfirmButton');
    },
    showInviteCode(inviteCodeFunc: (code: string) => void) {
      return this.waitForElementVisible('@inviteButton')
        .click('@inviteButton')
        .waitForElementVisible('@inviteCodeDiv')
        .getText('@inviteCodeDiv', res => inviteCodeFunc(res.value))
        .click('@inviteDismissButton');
    },
    checkUserOnTeam(userName: string, teamName: string) {
      return this.waitForElementVisible('@teamNameField')
        .assert.value('@teamNameField', teamName)
        .assert.containsText('@teamMemberDiv', userName);
    },
    // setValue() doesn't clear the existing value in a v-text-field, and
    // clearValue() doesn't seem to work either, so use this garbage instead.
    // Possibly related: https://github.com/nightwatchjs/nightwatch/issues/1132
    setVTextFieldValue(sel: string, value: string) {
      return this.sendKeys(sel, [this.api.Keys.CONTROL, 'a'])
        .sendKeys(sel, this.api.Keys.DELETE)
        .sendKeys(sel, value.split(''));
    },
  },
};
