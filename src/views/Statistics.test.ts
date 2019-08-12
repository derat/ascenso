// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import MockFirebase from '@/firebase/mock';

import { shallowMount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
Vue.use(Vuetify);

import { ClimbState, Statistic } from '@/models.ts';
import Statistics from './Statistics.vue';
import StatisticsList from '@/components/StatisticsList.vue';

describe('Statistics', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();

    const uid = MockFirebase.currentUser!.uid;
    const userName = MockFirebase.currentUser!.displayName;
    MockFirebase.setDoc('global/indexedData', {
      routes: {
        r1: { area: 'a1', lead: 10, tr: 5 },
        r2: { area: 'a2', lead: 16, tr: 8 },
      },
    });
    MockFirebase.setDoc(`users/${uid}`, {
      team: 'test-team',
      name: userName,
    });
    MockFirebase.setDoc('teams/test-team', {
      team: 'Test Team',
      users: {
        [uid]: {
          name: userName,
          climbs: { r1: ClimbState.LEAD, r2: ClimbState.TOP_ROPE },
        },
        'other-uid': {
          name: 'Another User',
          climbs: { r2: ClimbState.LEAD },
        },
      },
    });
    wrapper = shallowMount(Statistics, {
      mocks: MockFirebase.mountMocks,
    });
  });

  it('displays statistics for a team', () => {
    const cardStats: Statistic[][] = wrapper
      .findAll(StatisticsList)
      .wrappers.map(w => w.props('items'));
    expect(cardStats).toEqual([
      // Team tab.
      [new Statistic('Total points', 34)],
      [
        new Statistic('Total climbs', 3, [
          new Statistic('Lead', 2),
          new Statistic('Top-rope', 1),
        ]),
        new Statistic('Areas climbed', 2),
      ],
      // Individual tab.
      [new Statistic('Total points', 18)],
      [
        new Statistic('Total climbs', 2, [
          new Statistic('Lead', 1),
          new Statistic('Top-rope', 1),
        ]),
        new Statistic('Areas climbed', 2),
      ],
    ]);
  });
});
