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

import { ClimbState, Team, User } from '@/models.ts';
import { deepCopy } from '@/testutil.ts';
import Profile from './Profile.vue';

// Hardcoded test data to insert into Firestore.
const userID = '123';
const userName = 'Test User';
const userPath = `users/${userID}`;

const otherUserID = '456';
const otherUserName = 'Other User';

const teamID = 'test-team';
const teamName = 'Our Team';
const teamInvite = '123456';
const teamPath = `teams/${teamID}`;

const singleUserDoc: User = { name: userName, climbs: { r1: ClimbState.LEAD } };
const joinedUserDoc: User = { name: userName, team: teamID };

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

describe('Routes', () => {
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
    if (teamDoc) MockFirebase.setDoc(teamPath, teamDoc);

    // Use mount() instead of shallowMount() so that templates around v-btn
    // elements will be expanded.
    wrapper = mount(Profile, { mocks: MockFirebase.mountMocks, i18n });

    // Avoid Vuetify log spam: https://github.com/vuetifyjs/vuetify/issues/3456
    const el = document.createElement('div');
    el.setAttribute('data-app', 'true');
    document.body.appendChild(el);

    await flushPromises();
  }

  it("supports changing the user's name", async () => {
    await init(singleUserDoc);

    // TODO: Is there any way to avoid these 'as any' casts? I'm not
    // sure that there are TypeScript types for all Vuetify components:
    // https://github.com/vuetifyjs/vuetify/issues/5962
    const field = wrapper.find({ ref: 'userNameField' });
    expect((field.vm as any).value).toEqual(userName);

    const newName = 'Some Other Name';
    field.vm.$emit('change', newName);

    expect((field.vm as any).value).toEqual(newName);
    const newUserDoc = deepCopy(singleUserDoc);
    newUserDoc.name = newName;
    expect(MockFirebase.getDoc(userPath)).toEqual(newUserDoc);
  });

  it("updates the user's name in their team", async () => {
    await init(joinedUserDoc, nonFullTeamDoc);
    const newName = 'Some Other Name';
    wrapper.find({ ref: 'userNameField' }).vm.$emit('change', newName);

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
    const field = wrapper.find({ ref: 'teamNameField' });
    expect((field.vm as any).value).toEqual(teamName);

    const newName = 'New Team Name';
    field.vm.$emit('change', newName);

    expect((field.vm as any).value).toEqual(newName);
    const newTeamDoc = deepCopy(nonFullTeamDoc);
    newTeamDoc.name = newName;
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);
  });

  it("doesn't show team info when the user isn't on a team", async () => {
    await init(singleUserDoc);
    expect(wrapper.find({ ref: 'teamNameField' }).exists()).toBe(false);
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
    const dialog = wrapper.find({ ref: 'inviteDialog' });
    expect((dialog.vm as any).value).toBeFalsy();

    // When the button is clicked, the dialog should be shown and it should
    // contain the invite code.
    const button = wrapper.find({ ref: 'inviteButton' });
    expect(button.attributes('disabled')).toBeFalsy();
    button.trigger('click');
    expect((dialog.vm as any).value).toBeTruthy();
    expect(wrapper.find('.invite-code').text()).toBe(teamInvite);
  });

  it('disables the invite button when team is full', async () => {
    await init(joinedUserDoc, fullTeamDoc);
    expect(
      wrapper.find({ ref: 'inviteButton' }).attributes('disabled')
    ).toBeTruthy();
  });

  it("doesn't show invite button when not on a team", async () => {
    await init(singleUserDoc);
    expect(wrapper.find({ ref: 'inviteButton' }).exists()).toBe(false);
  });

  it('lets the user leave their team', async () => {
    await init(joinedUserDoc, fullTeamDoc);

    // The dialog should initially be hidden.
    const dialog = wrapper.find({ ref: 'leaveDialog' });
    expect((dialog.vm as any).value).toBeFalsy();

    // Click the button to show the dialog and then confirm we want to leave.
    const button = wrapper.find({ ref: 'leaveButton' });
    expect(button.exists()).toBe(true);
    button.trigger('click');
    expect((dialog.vm as any).value).toBeTruthy();
    wrapper.find({ ref: 'confirmLeaveButton' }).trigger('click');
    await flushPromises();
    expect((dialog.vm as any).value).toBeFalsy();

    // The team doc should be updated to not contain the user.
    const newTeamDoc = deepCopy(fullTeamDoc);
    delete newTeamDoc.users[userID];
    expect(MockFirebase.getDoc(teamPath)).toEqual(newTeamDoc);

    // The user doc should be updated to not list the team and to hold the
    // user's climbs.
    expect(MockFirebase.getDoc(userPath)).toEqual(singleUserDoc);
  });

  // TODO: Write tests for creating and joining teams.
});
