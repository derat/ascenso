// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { shallowMount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';

import ClimbDropdown from './ClimbDropdown.vue';
import RouteList from './RouteList.vue';
import { ClimbState, ClimberInfo, SetClimbStateEvent } from '@/models.ts';

Vue.use(Vuetify);

describe('RouteList', () => {
  // Hardcoded test data.
  const climberInfos = [
    new ClimberInfo('AB', { r1: ClimbState.LEAD }, 'red'),
    new ClimberInfo('CD', { r2: ClimbState.TOP_ROPE }, 'blue'),
  ];
  const routes = [
    { id: 'r1', name: 'Route 1', grade: '5.10a', lead: 10, tr: 5 },
    { id: 'r2', name: 'Route 2', grade: '5.8', lead: 6, tr: 3 },
    { id: 'r3', name: 'Route 3', grade: '5.12c', lead: 20, tr: 10 },
  ];

  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    wrapper = shallowMount(RouteList, { propsData: { climberInfos, routes } });
  });

  // Returns an array of arrays of dropdowns for each route.
  function getRouteDropdowns() {
    return wrapper
      .findAll({ name: 'v-list-tile' })
      .wrappers.map(tile => tile.findAll(ClimbDropdown).wrappers);
  }

  it('displays route information', () => {
    // For reasons that I don't understand, using a {name: 'v-list-tile-title'}
    // selector here doesn't match anything, although {name: 'v-list-tile}'}
    // matches the tiles. So, use class names for all of these.
    expect(wrapper.findAll('.name').wrappers.map(w => w.text())).toEqual(
      routes.map(r => r.name)
    );
    expect(wrapper.findAll('.grade').wrappers.map(w => w.text())).toEqual(
      routes.map(r => r.grade)
    );
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
});
