// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase, MockUser } from '@/firebase/mock';

import { mount, Wrapper } from '@vue/test-utils';
import {
  setUpVuetifyTesting,
  newVuetifyMountOptions,
  deepCopy,
  getValue,
} from '@/testutil';
import Vue from 'vue';
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

setUpVuetifyTesting();

// Hardcoded test data to insert into Firestore.
const testUID = '123';
const testName = 'Test User';
const testUserPath = `users/${testUID}`;
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

const minGrade = '5.7'; // from sortedData
const maxGrade = '5.12c'; // from sortedData

describe('Routes', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(async () => {
    MockFirebase.reset();
    MockFirebase.currentUser = new MockUser(testUID, testName);
    MockFirebase.setDoc('global/sortedData', sortedData);
    MockFirebase.setDoc(testUserPath, userDoc);
    MockFirebase.setDoc(`teams/${teamID}`, teamDoc);

    await mountView();
  });

  // Mounts the Routes view and updates |wrapper|.
  // Can be called by tests to remount after changing Firestore data.
  async function mountView() {
    wrapper = mount(
      Routes,
      newVuetifyMountOptions({
        mocks: MockFirebase.mountMocks,
      })
    );
    await flushPromises();
  }

  // Emits an event to display the filters dialog.
  // In reality, this event is emitted by the RoutesNav view.
  function showFiltersDialog() {
    wrapper.vm.$root.$emit('show-route-filters');
  }

  it('displays all areas', () => {
    expect(wrapper.findAll('.area').wrappers.map(w => w.text())).toEqual(
      sortedData.areas.map(a => a.name)
    );
  });

  it('passes route and climber data to route lists', () => {
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

  it('displays filters dialog', () => {
    const dialog = wrapper.find({ ref: 'filtersDialog' });
    expect(getValue(dialog)).toBeFalsy();
    showFiltersDialog();
    expect(getValue(dialog)).toBeTruthy();

    // The slider should cover the range of grades from the sortedData doc.
    const slider = wrapper.find({ ref: 'filtersGradeSlider' });
    expect(slider.props('min')).toBe(minGrade);
    expect(slider.props('max')).toBe(maxGrade);
    expect(slider.props('value')).toEqual([minGrade, maxGrade]);
    expect(wrapper.find({ ref: 'filtersGradeLabel' }).text()).toBe(
      `Grades: ${minGrade} to ${maxGrade}`
    );
  });

  it('loads previously-set filters', async () => {
    // Write custom filters to Firestore and remount the view.
    const doc = deepCopy(userDoc);
    doc.filters = { minGrade: '5.9', maxGrade: '5.11a' };
    MockFirebase.setDoc(testUserPath, doc);
    await mountView();

    // The slider should be initialized to the range from the user doc.
    showFiltersDialog();
    const slider = wrapper.find({ ref: 'filtersGradeSlider' });
    expect(slider.props('min')).toBe(minGrade);
    expect(slider.props('max')).toBe(maxGrade);
    expect(slider.props('value')).toEqual(['5.9', '5.11a']);
    expect(wrapper.find({ ref: 'filtersGradeLabel' }).text()).toBe(
      `Grades: 5.9 to 5.11a`
    );
  });

  it('saves filters to user doc', async () => {
    showFiltersDialog();
    const slider = wrapper.find({ ref: 'filtersGradeSlider' });
    slider.vm.$emit('input', ['5.9', '5.11a']);
    expect(wrapper.find({ ref: 'filtersGradeLabel' }).text()).toBe(
      `Grades: 5.9 to 5.11a`
    );
    const button = wrapper.find({ ref: 'applyFiltersButton' });
    button.trigger('click');
    await flushPromises();

    const doc = deepCopy(userDoc);
    doc.filters = { minGrade: '5.9', maxGrade: '5.11a' };
    expect(MockFirebase.getDoc(testUserPath)).toEqual(doc);

    // If the selected grades match the full range, the filters should be
    // cleared in the user doc.
    showFiltersDialog();
    slider.vm.$emit('input', [minGrade, maxGrade]);
    button.trigger('click');
    await flushPromises();

    delete doc.filters;
    expect(MockFirebase.getDoc(testUserPath)).toEqual(doc);
  });

  it('passes filters to route lists', () => {
    const routeList = wrapper.find(RouteList);
    expect(routeList.props('minGrade')).toBeUndefined();
    expect(routeList.props('maxGrade')).toBeUndefined();

    const doc = deepCopy(userDoc);
    doc.filters = { minGrade: '5.9', maxGrade: '5.11a' };
    MockFirebase.setDoc(testUserPath, doc);
    expect(routeList.props('minGrade')).toBe('5.9');
    expect(routeList.props('maxGrade')).toBe('5.11a');

    // If the filters match the easiest and hardest routes, we shouldn't bother
    // passing them to the route list.
    doc.filters = { minGrade, maxGrade };
    MockFirebase.setDoc(testUserPath, doc);
    expect(routeList.props('minGrade')).toBeUndefined();
    expect(routeList.props('maxGrade')).toBeUndefined();
  });
});
