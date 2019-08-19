// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase, MockUser } from '@/firebase/mock';

import { mount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
Vue.use(Vuetify);

import i18n from '@/plugins/i18n';

import flushPromises from 'flush-promises';

import { ClimbState, Team, User } from '@/models';
import { deepCopy, getValue } from '@/testutil';
import Profile from './Profile.vue';

// Hardcoded test data to insert into Firestore.
const userID = '123';
const userName = 'Test User';

const otherUserID = '456';
const otherUserName = 'Other User';

const teamID = 'test-team';
const teamName = 'Our Team';
const teamInvite = '123456';

// User docs as a non-member and member of the team.
const userPath = `users/${userID}`;
const singleUserDoc: User = { name: userName, climbs: { r1: ClimbState.LEAD } };
const joinedUserDoc: User = { name: userName, team: teamID };

// Team docs with zero, one, or two users.
const teamPath = `teams/${teamID}`;
const emptyTeamDoc: Team = { name: teamName, invite: teamInvite, users: {} };
const nonFullTeamDoc: Team = {
  name: teamName,
  invite: teamInvite,
  users: { [userID]: { name: userName, climbs: { r1: ClimbState.LEAD } } },
};
const fullTeamDoc: Team = {
  name: teamName,
  invite: teamInvite,
  users: {
    [userID]: { name: userName, climbs: { r1: ClimbState.LEAD } },
    [otherUserID]: { name: otherUserName, climbs: { r2: ClimbState.TOP_ROPE } },
  },
};

const invitePath = `invites/${teamInvite}`;
const inviteDoc = { team: teamID };

describe('Profile', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();
  });

  // Initializes Firestore with the supplied documents and mounts |wrapper|.
  // Note that the Profile view is initialized asynchronously (since it waits
  // for promises indicating that the user and team docs are loaded to be
  // fulfilled before marking it ready and displaying the full UI), so tests
  // must be marked async and use 'await' when calling this method:
  // https://vue-test-utils.vuejs.org/guides/testing-async-components.html
  async function init(userDoc: User, teamDoc?: Team) {
    MockFirebase.currentUser = new MockUser(userID, userName);
    MockFirebase.setDoc(userPath, userDoc);
    if (teamDoc) {
      MockFirebase.setDoc(teamPath, teamDoc);
      MockFirebase.setDoc(invitePath, inviteDoc);
    }

    // Use mount() instead of shallowMount() so that templates around v-btn
    // elements will be expanded.
    wrapper = mount(Profile, { mocks: MockFirebase.mountMocks, i18n });

    // Avoid Vuetify log spam: https://github.com/vuetifyjs/vuetify/issues/3456
    const el = document.createElement('div');
    el.setAttribute('data-app', 'true');
    document.body.appendChild(el);

    await flushPromises();
  }

  // Returns a vue-test-utils Wrapper object for the component under |wrapper|
  // (i.e. the main view) identified by |ref|, which should've been assigned to
  // the element via a 'ref' attribute in the template.
  function findRef(ref: string): Wrapper<Vue> {
    return wrapper.find({ ref });
  }

  // Validates the v-form component wrapped by |w|.
  function validateForm(w: Wrapper<Vue>) {
    (w.vm as any).validate();
  }

  it("supports changing the user's name", async () => {
    await init(singleUserDoc);

    const field = findRef('userNameField');
    expect(getValue(field)).toEqual(userName);

    const newName = 'Some Other Name';
    field.vm.$emit('change', newName);
    await flushPromises();

    expect(getValue(field)).toEqual(newName);
    const newUserDoc = deepCopy(singleUserDoc);
    newUserDoc.name = newName;
    expect(MockFirebase.getDoc(userPath)).toEqual(newUserDoc);
  });

  it("updates the user's name in their team", async () => {
    await init(joinedUserDoc, nonFullTeamDoc);
    const newName = 'Some Other Name';
    findRef('userNameField').vm.$emit('change', newName);
    await flushPromises();

    // The name should be updated both in the user doc and in the team doc.
    const newUserDoc = deepCopy(joinedUserDoc);
    newUserDoc.name = newName;
    expect(MockFirebase.getDoc(userPath)).toEqual(newUserDoc);

    const newTeamDoc = deepCopy(nonFullTeamDoc);
    newTeamDoc.users[userID].name = newName;
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);
  });

  it("supports changing the team's name", async () => {
    await init(joinedUserDoc, nonFullTeamDoc);
    const field = findRef('teamNameField');
    expect(getValue(field)).toEqual(teamName);

    const newName = 'New Team Name';
    field.vm.$emit('change', newName);
    await flushPromises();

    expect(getValue(field)).toEqual(newName);
    const newTeamDoc = deepCopy(nonFullTeamDoc);
    newTeamDoc.name = newName;
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);
  });

  it('removes excessive whitespace from user and team names', async () => {
    await init(joinedUserDoc, nonFullTeamDoc);

    // Set user and team teams with weird spacing.
    const userField = findRef('userNameField');
    userField.vm.$emit('change', '\r\n Sissy\t Spacek \n  ');
    const teamField = findRef('teamNameField');
    teamField.vm.$emit('change', ' \t Space  \nCadets  \v');
    await flushPromises();

    // Runs of one or more whitespace characters should be replaced by single
    // spaces in both the text fields and the Firestore docs.
    const newUserName = 'Sissy Spacek';
    expect(getValue(userField)).toEqual(newUserName);
    const expUserDoc = deepCopy(joinedUserDoc);
    expUserDoc.name = newUserName;
    expect(MockFirebase.getDoc(userPath)).toEqual(expUserDoc);

    const newTeamName = 'Space Cadets';
    expect(getValue(teamField)).toEqual(newTeamName);
    const newTeamDoc = deepCopy(nonFullTeamDoc);
    newTeamDoc.name = newTeamName;
    newTeamDoc.users[userID].name = newUserName;
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);
  });

  it("doesn't show team info when the user isn't on a team", async () => {
    await init(singleUserDoc);
    expect(findRef('teamNameField').exists()).toBe(false);
    expect(wrapper.find('.member-name').exists()).toBe(false);
  });

  it('displays a list of team members', async () => {
    await init(joinedUserDoc, fullTeamDoc);
    expect(wrapper.findAll('.member-name').wrappers.map(w => w.text())).toEqual(
      [userName, otherUserName]
    );
  });

  it("supports showing invite code when team isn't full", async () => {
    await init(joinedUserDoc, nonFullTeamDoc);

    // The dialog should initially be hidden.
    const dialog = findRef('inviteDialog');
    expect(getValue(dialog)).toBeFalsy();

    // When the button is clicked, the dialog should be shown and it should
    // contain the invite code.
    const button = findRef('inviteButton');
    expect(button.attributes('disabled')).toBeFalsy();
    button.trigger('click');
    expect(getValue(dialog)).toBeTruthy();
    expect(wrapper.find('.invite-code').text()).toBe(teamInvite);
  });

  it('disables the invite button when team is full', async () => {
    await init(joinedUserDoc, fullTeamDoc);
    expect(findRef('inviteButton').attributes('disabled')).toBeTruthy();
  });

  it("doesn't show invite button when not on a team", async () => {
    await init(singleUserDoc);
    expect(findRef('inviteButton').exists()).toBe(false);
  });

  it('lets the user leave their team', async () => {
    await init(joinedUserDoc, fullTeamDoc);

    // The dialog should initially be hidden.
    const dialog = findRef('leaveDialog');
    expect(getValue(dialog)).toBeFalsy();

    // Click the button to show the dialog and then confirm we want to leave.
    const button = findRef('leaveButton');
    expect(button.exists()).toBe(true);
    button.trigger('click');
    expect(getValue(dialog)).toBeTruthy();
    findRef('confirmLeaveButton').trigger('click');
    await flushPromises();
    expect(getValue(dialog)).toBeFalsy();

    // The team doc should be updated to not contain the user.
    const newTeamDoc = deepCopy(fullTeamDoc);
    delete newTeamDoc.users[userID];
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);

    // The user doc should be updated to not list the team and to hold the
    // user's climbs.
    expect(MockFirebase.getDoc(userPath)).toEqual(singleUserDoc);
  });

  it('supports creating a new team', async () => {
    await init(singleUserDoc);

    // Click the button to display the initially-hidden dialog.
    const dialog = findRef('createDialog');
    expect(getValue(dialog)).toBeFalsy();
    findRef('createButton').trigger('click');
    expect(getValue(dialog)).toBeTruthy();
    const confirmButton = findRef('confirmCreateButton');
    expect(confirmButton.attributes('disabled')).toBeTruthy();

    // Create a new team and wait for async Firestore writes to finish.
    // Manually calling the form's validate() method is gross, but the button
    // appears to be left disabled otherwise. Ditto for setting |createTeamName|
    // directly -- calling setProps({ value: newTeamName }) on the field's
    // wrapper doesn't appear to update its model.
    const newTeamName = 'Created Team';
    wrapper.vm.$data.createTeamName = newTeamName;
    validateForm(findRef('createForm'));
    expect(confirmButton.attributes('disabled')).toBeFalsy();
    confirmButton.trigger('click');
    await flushPromises();

    // The user doc should be updated to contain the ID of the new team, and its
    // climbs should be wiped.
    const userDoc = MockFirebase.getDoc(userPath) as User;
    const newTeamID = userDoc.team;
    expect(userDoc).toEqual({ name: singleUserDoc.name, team: newTeamID });

    // A team doc should be created with the new ID, and it should now contain
    // the user's climbs and a copy of their name from the user doc.
    const teamDoc = MockFirebase.getDoc(`teams/${newTeamID}`) as Team;
    const newInvite = teamDoc.invite;
    expect(teamDoc).toEqual({
      name: newTeamName,
      invite: newInvite,
      users: { [userID]: { name: userName, climbs: singleUserDoc.climbs } },
    });

    // A document should be created to point from the invite code to the team
    // ID, too.
    expect(MockFirebase.getDoc(`invites/${newInvite}`)).toEqual({
      team: newTeamID,
    });

    // The create dialog should be dismissed, and a dialog showing the invite
    // code should be automatically displayed.
    expect(getValue(dialog)).toBeFalsy();
    expect(getValue(findRef('inviteDialog'))).toBeTruthy();
    expect(wrapper.find('.invite-code').text()).toBe(newInvite);

    // The main view should be updated to show the team roster now.
    expect(wrapper.findAll('.member-name').wrappers.map(w => w.text())).toEqual(
      [userName]
    );
  });

  it('supports joining an existing team', async () => {
    await init(singleUserDoc, emptyTeamDoc);

    // Click the button to display the initially-hidden dialog.
    const dialog = findRef('joinDialog');
    expect(getValue(dialog)).toBeFalsy();
    findRef('joinButton').trigger('click');
    expect(getValue(dialog)).toBeTruthy();
    const confirmButton = findRef('confirmJoinButton');
    expect(confirmButton.attributes('disabled')).toBeTruthy();

    // Enter the invite code and click the join button.
    wrapper.vm.$data.joinInviteCode = teamInvite;
    validateForm(findRef('joinForm'));
    expect(confirmButton.attributes('disabled')).toBeFalsy();
    confirmButton.trigger('click');
    await flushPromises();

    // The user doc should be updated to contain the ID of the team, and its
    // climbs should be moved to the team doc.
    expect(MockFirebase.getDoc(userPath)).toEqual({
      name: singleUserDoc.name,
      team: teamID,
    });
    expect(MockFirebase.getDoc(teamPath)).toEqual(nonFullTeamDoc);

    // The dialog should be dismissed and the main view should be updated to
    // show the team roster.
    expect(getValue(dialog)).toBeFalsy();
    expect(wrapper.findAll('.member-name').wrappers.map(w => w.text())).toEqual(
      [userName]
    );
  });

  it('disallows joining a full team', async () => {
    const teamDoc = deepCopy(emptyTeamDoc);
    teamDoc.users = { a: { name: 'a' }, b: { name: 'b' } };
    await init(singleUserDoc, teamDoc);

    // Try to join a team that already has two members.
    findRef('joinButton').trigger('click');
    wrapper.vm.$data.joinInviteCode = teamInvite;
    validateForm(findRef('joinForm'));
    findRef('confirmJoinButton').trigger('click');
    await flushPromises();

    // The dialog should still be shown and the docs should be unchanged.
    expect(getValue(findRef('joinDialog'))).toBeTruthy();
    expect(MockFirebase.getDoc(userPath)).toEqual(singleUserDoc);
    expect(MockFirebase.getDoc(teamPath)).toEqual(teamDoc);

    // TODO: Also check that an error is displayed once the UI does that, and
    // add some way to check logged error codes to verify that the error is
    // reported.
  });

  it('disallows joining a team using an invalid invite code', async () => {
    await init(singleUserDoc);

    // Enter an unregistered invite code.
    findRef('joinButton').trigger('click');
    wrapper.vm.$data.joinInviteCode = '987654';
    validateForm(findRef('joinForm'));
    findRef('confirmJoinButton').trigger('click');
    await flushPromises();

    // The dialog should still be shown and the user doc should be unchanged.
    expect(getValue(findRef('joinDialog'))).toBeTruthy();
    expect(MockFirebase.getDoc(userPath)).toEqual(singleUserDoc);

    // TODO: Check error UI and reporting here too.
  });
});
