// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { shallowMount } from '@vue/test-utils';
import { setUpVuetifyTesting, newVuetifyMountOptions } from '@/testutil';

import StatisticsRow from './StatisticsRow.vue';

setUpVuetifyTesting();

describe('StatisticsRow', () => {
  it('displays the supplied data', () => {
    const name = 'The Name';
    const value = 12345;
    const wrapper = shallowMount(
      StatisticsRow,
      newVuetifyMountOptions({
        propsData: { name, value },
      })
    );
    expect(wrapper.find('.stats-row').text()).toEqual(`${name} ${value}`);
  });
});
