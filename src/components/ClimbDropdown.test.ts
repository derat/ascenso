// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { shallowMount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
import ClimbDropdown from './ClimbDropdown.vue';

Vue.use(Vuetify);

describe('ClimbDropdown', () => {
  let wrapper: Wrapper<ClimbDropdown>;
  beforeAll(() => {
    wrapper = shallowMount(ClimbDropdown);
  });

  // TODO: Add real tests.
  it('is a Vue instance', () => {
    expect(wrapper.isVueInstance()).toBeTruthy();
  });
});
