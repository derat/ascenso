// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { mount } from '@vue/test-utils';
import { setUpVuetifyTesting, newVuetifyMountOptions } from '@/testutil';

import { Statistic } from '@/models';
import StatisticsList from './StatisticsList.vue';
import StatisticsRow from './StatisticsRow.vue';

setUpVuetifyTesting();

describe('StatisticsList', () => {
  it('creates rows for supplied statistics', () => {
    // Pass nested statistics.
    const items = [
      new Statistic('a', 1, [
        new Statistic('b', 2, [new Statistic('c', 3), new Statistic('d', 4)]),
      ]),
      new Statistic('e', 5),
    ];
    // Use mount() instead of shallowMount() so that child components will be
    // instantiated rather than mocked.
    const wrapper = mount(
      StatisticsList,
      newVuetifyMountOptions({ propsData: { items } })
    );
    expect(
      wrapper.findAll(StatisticsRow).wrappers.map(row => row.text())
    ).toEqual(['a 1', 'b 2', 'c 3', 'd 4', 'e 5']);
  });
});
