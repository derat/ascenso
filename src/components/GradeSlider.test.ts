// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { mount, Wrapper } from '@vue/test-utils';
import { setUpVuetifyTesting, newVuetifyMountOptions } from '@/testutil';

import GradeSlider from './GradeSlider.vue';
import { GradeIndexes } from '@/models';

setUpVuetifyTesting();

describe('GradeSlider', () => {
  let wrapper: Wrapper<Vue>;

  // Initializes |wrapper| with the supplied properties.
  function init(value: [string, string], min: string, max: string) {
    const propsData = { value, min, max };
    wrapper = mount(GradeSlider, newVuetifyMountOptions({ propsData }));
  }

  // Updates |wrapper|'s v-range-slider to span the supplied grades.
  function setSlider(min: string, max: string) {
    wrapper.setData({
      sliderValue: [GradeIndexes[min], GradeIndexes[max]],
    });
  }

  it('emits events when slider is changed', () => {
    init(['5.6', '5.11a'], '5.5', '5.12a');
    setSlider('5.8', '5.10a');
    setSlider('5.9', '5.10c');
    expect(wrapper.emitted('input')).toEqual([
      [['5.8', '5.10a']],
      [['5.9', '5.10c']],
    ]);
  });

  it('updates slider when value property is changed', () => {
    init(['5.5', '5.12a'], '5.5', '5.12a');
    wrapper.setProps({ value: ['5.8', '5.11c'] });
    expect(wrapper.find({ ref: 'slider' }).props('value')).toEqual([
      GradeIndexes['5.8'],
      GradeIndexes['5.11c'],
    ]);
  });
});
