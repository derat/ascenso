// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { mount, Wrapper } from '@vue/test-utils';
import { setUpVuetifyTesting, newVuetifyMountOptions } from '@/testutil';

import ClimbDropdown from './ClimbDropdown.vue';
import RouteList from './RouteList.vue';
import { ClimbState, ClimberInfo, SetClimbStateEvent } from '@/models';

setUpVuetifyTesting();

describe('RouteList', () => {
  // Hardcoded test data.
  const climberInfos = [
    new ClimberInfo('AB', { r1: ClimbState.LEAD }, 'red'),
    new ClimberInfo('CD', { r2: ClimbState.TOP_ROPE }, 'blue'),
  ];
  const routes = [
    { id: 'r1', name: 'Route 1', grade: '5.10a', lead: 10, tr: 5 },
    { id: 'r2', name: 'Route 2', grade: '5.8', lead: 6, tr: 3, mpId: 123 },
    { id: 'r3', name: 'Route 3', grade: '5.12c', lead: 20, tr: 10, height: 55 },
  ];

  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    // If we use shallowMount() instead, dynamically-computed CSS classes don't
    // appear to be applied, and classList returns bogus items like '[object'
    // and 'Object]'.
    wrapper = mount(
      RouteList,
      newVuetifyMountOptions({ propsData: { climberInfos, routes } })
    );
  });

  // Returns an array of arrays of dropdowns for each route.
  function getRouteDropdowns() {
    return wrapper
      .findAll({ name: 'v-list-item' })
      .wrappers.map(w => w.findAll(ClimbDropdown).wrappers);
  }

  it('displays route information', () => {
    // For reasons that I don't understand, using a {name: 'v-list-item-title'}
    // selector here doesn't match anything, although {name: 'v-list-item}'}
    // matches the tiles. So, use class names for all of these.
    expect(wrapper.findAll('.name').wrappers.map(w => w.text())).toEqual(
      routes.map(r => r.name)
    );
    expect(wrapper.findAll('.mp-icon').wrappers.map(w => w.text())).toEqual([
      'info',
    ]);
    expect(wrapper.findAll('.grade').wrappers.map(w => w.text())).toEqual(
      routes.map(r => r.grade)
    );
    expect(wrapper.findAll('.height').wrappers.map(w => w.text())).toEqual([
      '55 ft (17m)',
    ]);
    expect(wrapper.findAll('.points').wrappers.map(w => w.text())).toEqual(
      routes.map(r => `${r.lead} (${r.tr})`)
    );
  });

  it('passes information to climb dropdowns', () => {
    const rd = getRouteDropdowns();
    expect(rd.map(r => r.map(d => d.props('state')))).toEqual([
      [ClimbState.LEAD, ClimbState.NOT_CLIMBED],
      [ClimbState.NOT_CLIMBED, ClimbState.TOP_ROPE],
      [ClimbState.NOT_CLIMBED, ClimbState.NOT_CLIMBED],
    ]);
    expect(rd.map(r => r.map(d => d.props('color')))).toEqual([
      [climberInfos[0].color, climberInfos[1].color],
      [climberInfos[0].color, climberInfos[1].color],
      [climberInfos[0].color, climberInfos[1].color],
    ]);
    expect(rd.map(r => r.map(d => d.props('label')))).toEqual([
      [climberInfos[0].initials, climberInfos[1].initials],
      [climberInfos[0].initials, climberInfos[1].initials],
      [climberInfos[0].initials, climberInfos[1].initials],
    ]);
  });

  it('handles a single climber', () => {
    const climber = climberInfos[0];
    wrapper.setProps({ climberInfos: [climber] });

    const rd = getRouteDropdowns();
    expect(rd.map(r => r.map(d => d.props('state')))).toEqual([
      [ClimbState.LEAD],
      [ClimbState.NOT_CLIMBED],
      [ClimbState.NOT_CLIMBED],
    ]);
    expect(rd.map(r => r.map(d => d.props('color')))).toEqual([
      [climber.color],
      [climber.color],
      [climber.color],
    ]);
    expect(rd.map(r => r.map(d => d.props('label')))).toEqual([
      [climber.initials],
      [climber.initials],
      [climber.initials],
    ]);
  });

  it('emits events for climb state changes', () => {
    // Simulate various ClimbDropdown components emitting update:state events
    // and verify that the RouteList emits corresponding set-climb-state events.
    const rd = getRouteDropdowns();
    rd[0][0].vm.$emit('update:state', ClimbState.TOP_ROPE);
    rd[1][1].vm.$emit('update:state', ClimbState.NOT_CLIMBED);
    rd[2][0].vm.$emit('update:state', ClimbState.LEAD);
    expect(wrapper.emitted('set-climb-state')).toEqual([
      [new SetClimbStateEvent(0, 'r1', ClimbState.TOP_ROPE)],
      [new SetClimbStateEvent(1, 'r2', ClimbState.NOT_CLIMBED)],
      [new SetClimbStateEvent(0, 'r3', ClimbState.LEAD)],
    ]);
  });

  it('deemphasizes filtered routes', () => {
    // By default, no routes should be filtered out.
    const filtered = () =>
      wrapper.findAll('.filtered').wrappers.map(w => w.find('.grade').text());
    expect(filtered()).toEqual([]);

    // Set a max that excludes the hardest route.
    wrapper.setProps({ maxGrade: '5.11a' });
    expect(filtered()).toEqual(['5.12c']);

    // Add a max that excludes the easiest route.
    wrapper.setProps({ minGrade: '5.9' });
    expect(filtered()).toEqual(['5.8', '5.12c']);

    // Set a range that filters out all routes.
    wrapper.setProps({ minGrade: '5.14a', maxGrade: '5.14c' });
    expect(filtered()).toEqual(['5.10a', '5.8', '5.12c']);

    // Set a range that includes all routes.
    wrapper.setProps({ minGrade: '5.5', maxGrade: '5.13a' });
    expect(filtered()).toEqual([]);
  });
});
