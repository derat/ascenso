// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { mount } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';

import ClimbDropdown from './ClimbDropdown.vue';
import { ClimbState } from '@/models.ts';

Vue.use(Vuetify);

const factory = (props = {}) => {
  // Avoid Vuetify log spam: https://github.com/vuetifyjs/vuetify/issues/3456
  const el = document.createElement('div');
  el.setAttribute('data-app', 'true');
  document.body.appendChild(el);

  // We need to use mount() rather than shallowMount() to expand the template
  // within ClimbDropdown that contains the button.
  return mount(ClimbDropdown, {
    propsData: props,
    // attachToDocument is needed to avoid the following error:
    // [Vue warn]: Error in nextTick: "TypeError: Cannot read property
    // 'insertBefore' of null"
    attachToDocument: true,
  });
};

describe('ClimbDropdown', () => {
  it('emits events when clicked', () => {
    const wrapper = factory({ state: ClimbState.NOT_CLIMBED });
    const clickItem = (index: number) => {
      // Click the button first to instantiate the menu.
      wrapper.find({ name: 'v-btn' }).trigger('click');
      // Strangely, using 'trigger' instead of 'vm.$emit' doesn't work here:
      // https://stackoverflow.com/q/52058141
      wrapper
        .findAll({ name: 'v-list-tile' })
        .at(index)
        .vm.$emit('click');
    };

    // Click some menu items and check that the correct events are emitted.
    // The event name is generated by vue-property-decorator's @PropSync.
    clickItem(1);
    clickItem(0);
    clickItem(2);
    clickItem(0);
    expect(wrapper.emitted('update:state')).toEqual([
      [ClimbState.TOP_ROPE],
      [ClimbState.LEAD],
      [ClimbState.NOT_CLIMBED],
      [ClimbState.LEAD],
    ]);
  });
});

describe('ClimbDropdown', () => {
  it('displays expected text in button', () => {
    const label = 'ABC';
    const wrapper = factory({ state: ClimbState.LEAD, label });
    const button = wrapper.find({ name: 'v-btn' });
    expect(button.text()).toEqual('L');
    wrapper.setProps({ state: ClimbState.TOP_ROPE });
    expect(button.text()).toEqual('TR');
    wrapper.setProps({ state: ClimbState.NOT_CLIMBED });
    expect(button.text()).toEqual(label);
  });
});

describe('ClimbDropdown', () => {
  it('uses expected color in button', () => {
    const color = 'red';
    const wrapper = factory({ state: ClimbState.LEAD, color });
    const button = wrapper.find({ name: 'v-btn' });
    const getLightenClass = () =>
      button.classes().find(c => c.startsWith('lighten'));

    // For the lead state, we should use the color without lightening it.
    // The 'color' attribute is mapped to an identically-named class.
    expect(button.classes(color)).toBe(true);
    expect(getLightenClass()).toBeUndefined();

    // For the top-rope state, we should use a lightened version of the color.
    wrapper.setProps({ state: ClimbState.TOP_ROPE });
    expect(button.classes(color)).toBe(true);
    expect(getLightenClass()).toBeTruthy();

    // For the unclimbed state, we should use gray.
    wrapper.setProps({ state: ClimbState.NOT_CLIMBED });
    expect(button.classes('grey')).toBe(true);
    expect(button.classes(color)).toBe(false);
  });
});