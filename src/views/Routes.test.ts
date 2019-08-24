// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase, MockUser } from '@/firebase/mock';

import { mount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
Vue.use(Vuetify);

import flushPromises from 'flush-promises';

import {
  ClimbState,
  ClimberInfo,
  SetClimbStateEvent,
  SortedData,
  Team,
  User,
} from '@/models.ts';

import Routes from './Routes.vue';
import RouteList from '@/components/RouteList.vue';

// Hardcoded test data to insert into Firestore.
const testUID = '123';
const testName = 'Test User';
const otherUID = '456';
const otherName = 'Other User';
const teamID = 'test-team';
const sortedData: SortedData = {
  areas: [
    {
      name: 'Area 1',
      id: 'a1',
      routes: [
        { id: 'r1', name: 'Route 1', grade: '5.10a', lead: 10, tr: 5 },
        { id: 'r2', name: 'Route 2', grade: '5.7', lead: 6, tr: 3 },
      ],
    },
    {
      name: 'Area 2',
      id: 'a2',
      routes: [{ id: 'r3', name: 'Route 3', grade: '5.12c', lead: 20, tr: 10 }],
    },
  ],
};
const userDoc: User = {
  name: testName,
  team: teamID,
};
const teamDoc: Team = {
  name: 'Test Team',
  invite: '123456',
  users: {
    [testUID]: {
      name: testName,
      climbs: { r1: ClimbState.LEAD, r2: ClimbState.TOP_ROPE },
    },
    [otherUID]: {
      name: otherName,
      climbs: { r2: ClimbState.LEAD },
    },
  },
};

describe('Routes', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(async () => {
    MockFirebase.reset();
    MockFirebase.currentUser = new MockUser(testUID, testName);
    MockFirebase.setDoc('global/sortedData', sortedData);
    MockFirebase.setDoc(`users/${testUID}`, userDoc);
    MockFirebase.setDoc(`teams/${teamID}`, teamDoc);

    wrapper = mount(Routes, { mocks: MockFirebase.mountMocks });
    await flushPromises();
  });

  it('displays all areas', () => {
    expect(wrapper.findAll('.area').wrappers.map(w => w.text())).toEqual(
      sortedData.areas.map(a => a.name)
    );
  });

  it('passes data to route lists', () => {
    const routeLists = wrapper.findAll(RouteList).wrappers;
    expect(routeLists.map(w => w.props('routes'))).toEqual(
      sortedData.areas.map(a => a.routes)
    );

    // Each RouteList should be passed the same ClimberInfos.
    const climberInfos = [testUID, otherUID].sort().map((uid, i) => {
      const user = teamDoc.users[uid];
      const color = (Routes as any).climbColors[i];
      return new ClimberInfo(user.name, user.climbs, color);
    });
    expect(routeLists.map(w => w.props('climberInfos'))).toEqual(
      sortedData.areas.map(a => climberInfos)
    );
  });

  it('updates climb states', async () => {
    // Simulate the first climber leading the third route and the second climber
    // undoing their lead of the second route.
    const routeLists = wrapper.findAll(RouteList).wrappers;
    routeLists[1].vm.$emit(
      'set-climb-state',
      new SetClimbStateEvent(0, 'r3', ClimbState.LEAD)
    );
    routeLists[0].vm.$emit(
      'set-climb-state',
      new SetClimbStateEvent(1, 'r2', ClimbState.NOT_CLIMBED)
    );
    await flushPromises();

    const expected = JSON.parse(JSON.stringify(teamDoc));
    expected.users[testUID].climbs.r3 = ClimbState.LEAD;
    expected.users[otherUID].climbs = {};

    // The team doc in Firestore should be updated.
    expect(MockFirebase.getDoc(`teams/${teamID}`)).toEqual(expected);

    // Check that one of the RouteLists also got the updated climb states.
    expect(
      routeLists[0].props('climberInfos').map((ci: ClimberInfo) => ci.states)
    ).toEqual([
      expected.users[testUID].climbs,
      expected.users[otherUID].climbs,
    ]);
  });
});
