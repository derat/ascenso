// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase } from '@/firebase/mock';

import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';
import { createLocalVue, mount, Wrapper } from '@vue/test-utils';
import flushPromises from 'flush-promises';

import { getValue } from '@/testutil';
import routes from '@/router/routes';
import Toolbar from './Toolbar.vue';

Vue.use(Vuetify);

describe('Toolbar', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();

    // Avoid Vuetify log spam: https://github.com/vuetifyjs/vuetify/issues/3456
    const el = document.createElement('div');
    el.setAttribute('data-app', 'true');
    document.body.appendChild(el);

    // See https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html.
    const localVue = createLocalVue();
    localVue.use(VueRouter);
    const router = new VueRouter({ mode: 'abstract', routes });
    wrapper = mount(Toolbar, { localVue, router });
  });

  function findRef(ref: string): Wrapper<Vue> {
    return wrapper.find({ ref });
  }

  it('toggles the navigation drawer when the icon is clicked', () => {
    const drawer = findRef('drawer');
    expect(getValue(drawer)).toBeFalsy();

    const icon = findRef('toolbarIcon');
    icon.trigger('click');
    expect(getValue(drawer)).toBeTruthy();

    icon.trigger('click');
    expect(getValue(drawer)).toBeFalsy();
  });

  it('prompts before signing out', async () => {
    const dialog = findRef('signOutDialog');
    expect(getValue(dialog)).toBeFalsy();
    expect(MockFirebase.currentUser).toBeTruthy();

    // Open the navigation drawer and click the last tile.
    // Use vm.$emit instead of trigger: // https://stackoverflow.com/q/52058141
    findRef('toolbarIcon').trigger('click');
    const tiles = wrapper.findAll({ name: 'v-list-tile' });
    tiles.at(tiles.length - 1).vm.$emit('click');

    // Click the confirm button in the dialog.
    expect(getValue(dialog)).toBeTruthy();
    findRef('confirmSignOutButton').trigger('click');
    await flushPromises();

    // The user should be signed out and we should navigate to the login view.
    expect(MockFirebase.currentUser).toBeNull();
    expect(wrapper.vm.$route.name).toBe('login');
  });

  // TODO: Ideally we'd also test that the navigation links work, but doing so
  // is beyond me. After I call trigger('click') on one of the v-list-tile
  // elements in the navigation drawer, wrapper.vm.$route and
  // router.currentRoute are both empty objects. This is probably an issue
  // related to router-link (which v-list-tile extends), since navigation works
  // in the signout test when it's triggered by $router.replace().
});
