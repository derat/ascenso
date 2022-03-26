// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase, MockUser } from '@/firebase/mock';

import firebase from 'firebase/app';
import 'firebase/firestore';

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
import Routes, { formatDuration, getNextTimeout } from './Routes.vue';
import RouteList from '@/components/RouteList.vue';

setUpVuetifyTesting();

// Durations in milliseconds.
const sec = 1000;
const min = 60 * sec;
const hour = 60 * min;
const day = 24 * hour;
const week = 7 * day;

// Hardcoded test data to insert into Firestore.
const testUID = '123';
const testName = 'Test User';
const testUserPath = `users/${testUID}`;
const otherUID = '456';
const otherName = 'Other User';
const teamID = 'test-team';
const teamPath = `teams/${teamID}`;

const sortedData: SortedData = {
  areas: [
    {
      name: 'Area 1',
      id: 'a1',
      routes: [
        { id: 'r1', name: 'Route 1', grade: '5.10a', lead: 10, tr: 5 },
        { id: 'r2', name: 'Route 2', grade: '5.7', lead: 6, tr: 3 },
      ],
      mpId: '123',
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
    MockFirebase.setDoc('global/config', {});
    MockFirebase.setDoc('global/sortedData', sortedData);
    MockFirebase.setDoc(testUserPath, userDoc);
    MockFirebase.setDoc(teamPath, teamDoc);

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
    expect(wrapper.findAll('.area').wrappers.map((w) => w.text())).toEqual(
      sortedData.areas.map((a) => a.name)
    );
    expect(wrapper.findAll('.mp-icon').wrappers.map((w) => w.text())).toEqual([
      'info',
    ]);
  });

  it('passes route and climber data to route lists', () => {
    const routeLists = wrapper.findAll(RouteList).wrappers;
    expect(routeLists.map((w) => w.props('routes'))).toEqual(
      sortedData.areas.map((a) => a.routes)
    );

    // Each RouteList should be passed the same ClimberInfos.
    const climberInfos = [testUID, otherUID].sort().map((uid, i) => {
      const user = teamDoc.users[uid];
      const color = (Routes as any).climbColors[i];
      return new ClimberInfo(user.name, user.climbs, color);
    });
    expect(routeLists.map((w) => w.props('climberInfos'))).toEqual(
      sortedData.areas.map((a) => climberInfos)
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
    expect(MockFirebase.getDoc(teamPath)).toEqual(expected);

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

  it('displays counts of available routes', () => {
    // r2 should be excluded since it's been climbed by both team members.
    const getCounts = () =>
      wrapper.findAll('.count').wrappers.map((w) => w.text());
    expect(getCounts()).toEqual(['1', '1']);

    // After clearing the climbs, all routes should be included.
    const td = deepCopy(teamDoc);
    for (const uid of Object.keys(td.users)) delete td.users[uid].climbs;
    MockFirebase.setDoc(teamPath, td);
    expect(getCounts()).toEqual(['2', '1']);

    // Set filters that don't exclude any climbs.
    const ud = deepCopy(userDoc);
    ud.filters = { minGrade, maxGrade };
    MockFirebase.setDoc(testUserPath, ud);
    expect(getCounts()).toEqual(['2', '1']);

    // Exclude the two easiest climbs, which are in the first area.
    ud.filters.minGrade = '5.10c';
    MockFirebase.setDoc(testUserPath, ud);
    expect(getCounts()).toEqual(['0', '1']);

    // Also exclude the hardest climb, in the second area.
    ud.filters.maxGrade = '5.10d';
    MockFirebase.setDoc(testUserPath, ud);
    expect(getCounts()).toEqual(['0', '0']);
  });

  it('displays time until competition starts and ends', () => {
    let nowMs = 1000; // arbitrary
    wrapper.setMethods({ getNowMs: () => nowMs });

    const bar = wrapper.find({ ref: 'timeMessageSystemBar' });
    expect(bar.isVisible()).toBe(false);

    MockFirebase.setDoc('global/config', {
      startTime: firebase.firestore.Timestamp.fromMillis(nowMs + hour),
      endTime: firebase.firestore.Timestamp.fromMillis(nowMs + 3 * hour),
    });
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toBe('60 minutes until competition starts');

    const advance = (ms: number) => {
      nowMs += ms;
      (wrapper.vm as any).updateTimeMessage();
    };

    advance(59 * min + 50 * sec);
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toBe('10 seconds until competition starts');

    advance(10 * sec);
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toBe('2 hours remaining');

    advance(hour + 59 * min + 59 * sec);
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toBe('1 second remaining');

    advance(sec);
    expect(bar.isVisible()).toBe(true);
    expect(bar.text()).toBe('Competition ended');
  });
});

test('formatDuration', () => {
  const f = (ms: number) => formatDuration(ms, 'en');

  // Short durations should be rounded to the nearest second.
  expect(f(0)).toBe('0 seconds');
  expect(f(499)).toBe('0 seconds');
  expect(f(500)).toBe('1 second');
  expect(f(1200)).toBe('1 second');
  expect(f(2000)).toBe('2 seconds');
  expect(f(min - sec)).toBe('59 seconds');
  expect(f(min)).toBe('1 minute');
  expect(f(min + 2 * sec)).toBe('1 minute, 2 seconds');
  expect(f(hour - sec)).toBe('59 minutes, 59 seconds');
  expect(f(hour)).toBe('60 minutes');

  // Durations longer than an hour should be rounded to the nearest minute.
  expect(f(hour + min)).toBe('1 hour, 1 minute');
  expect(f(hour + min + sec)).toBe('1 hour, 1 minute');
  expect(f(day - 31 * sec)).toBe('23 hours, 59 minutes');
  expect(f(day - 30 * sec)).toBe('24 hours');
  expect(f(day - sec)).toBe('24 hours');
  expect(f(day)).toBe('24 hours');

  // Durations longer than a day should be rounded to the hour.
  expect(f(day + sec)).toBe('1 day');
  expect(f(day + 30 * min)).toBe('1 day, 1 hour');
  expect(f(day + 23 * hour)).toBe('1 day, 23 hours');
  expect(f(2 * day)).toBe('2 days');
  expect(f(week - hour)).toBe('6 days, 23 hours');
  expect(f(week)).toBe('7 days');

  // Durations longer than a week should be rounded to the day.
  expect(f(week + hour)).toBe('1 week');
  expect(f(week + day)).toBe('1 week, 1 day');
  expect(f(2 * week)).toBe('2 weeks');
  expect(f(6 * week + 2 * day + hour + min + sec)).toBe('6 weeks, 2 days');
});

test('getNextTimeout', () => {
  const f = getNextTimeout;

  // For durations of an hour or less, we should update once per second.
  // If we're close enough to the next update that we'd already be displaying
  // its time, it should be skipped.
  expect(f(1)).toBe(1);
  expect(f(400)).toBe(400);
  expect(f(999)).toBe(999);
  expect(f(1000)).toBe(1000);
  expect(f(1300)).toBe(1300); // skip next update
  expect(f(1500)).toBe(500);
  expect(f(1999)).toBe(999);
  expect(f(2000)).toBe(sec);

  // Above an hour, we should update once per minute.
  expect(f(12 * hour)).toBe(min);
  expect(f(day)).toBe(min);

  // For durations over a day, we should update once per hour (or at the 1-day
  // mark if it's less than an hour away).
  expect(f(day + 50)).toBe(50); // wait until there's 1 day left
  expect(f(day + 5 * sec)).toBe(5 * sec); // wait until there's 1 day left
  expect(f(day + hour)).toBe(hour);
  expect(f(day + hour + 5 * min)).toBe(hour + 5 * min); // skip next update
  expect(f(day + hour + 30 * min)).toBe(30 * min);
  expect(f(week)).toBe(hour);

  // For durations over a week, we should update once per day (or at the 1-week
  // mark if it's less than a day away).
  expect(f(week + 50)).toBe(50); // wait until there's 1 week left
  expect(f(week + 10 * hour)).toBe(10 * hour); // wait until there's 1 week left
  expect(f(week + day)).toBe(day);
  expect(f(week + day + 11 * hour)).toBe(day + 11 * hour); // skip next update
  expect(f(week + day + 18 * hour)).toBe(18 * hour);
  expect(f(week + 2 * day)).toBe(day);
  expect(f(10 * week)).toBe(day);
});
