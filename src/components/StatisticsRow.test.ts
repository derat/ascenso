// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { shallowMount } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';

import StatisticsRow from './StatisticsRow.vue';

Vue.use(Vuetify);

describe('StatisticsRow', () => {
  it('displays the supplied data', () => {
    const name = 'The Name';
    const value = 12345;
    const wrapper = shallowMount(StatisticsRow, {
      propsData: { name, value },
    });
    expect(wrapper.find('.row').text()).toEqual(`${name} ${value}`);
  });
});
