// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase } from '@/firebase/mock';

import Vue from 'vue';
import VueRouter from 'vue-router';
import { mount, Wrapper } from '@vue/test-utils';
import {
  setUpVuetifyTesting,
  newVuetifyMountOptions,
  getValue,
} from '@/testutil';
import flushPromises from 'flush-promises';

import routes from '@/router/routes';
import Toolbar from './Toolbar.vue';

setUpVuetifyTesting();

describe('Toolbar', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();
    wrapper = mount(
      Toolbar,
      newVuetifyMountOptions({
        router: new VueRouter({ mode: 'abstract', routes }),
      })
    );
  });

  function findRef(ref: string): Wrapper<Vue> {
    return wrapper.findComponent({ ref });
  }

  it('toggles the navigation drawer when the icon is clicked', async () => {
    const drawer = findRef('drawer');
    expect(getValue(drawer)).toBeFalsy();

    const icon = findRef('toolbarIcon');
    await icon.trigger('click');
    expect(getValue(drawer)).toBeTruthy();

    await icon.trigger('click');
    expect(getValue(drawer)).toBeFalsy();
  });

  it('prompts before signing out', async () => {
    const dialog = findRef('signOutDialog');
    expect(getValue(dialog)).toBeFalsy();
    expect(MockFirebase.currentUser).toBeTruthy();

    // Open the navigation drawer and click the last item.
    // Use vm.$emit instead of trigger: https://stackoverflow.com/q/52058141
    await findRef('toolbarIcon').trigger('click');
    const items = wrapper.findAllComponents({ name: 'v-list-item' });
    await items.at(items.length - 1).vm.$emit('click');

    // Click the confirm button in the dialog.
    expect(getValue(dialog)).toBeTruthy();
    await findRef('signOutConfirmButton').trigger('click');
    await flushPromises();

    // The user should be signed out and we should navigate to the login view.
    expect(MockFirebase.currentUser).toBeNull();
    expect(wrapper.vm.$route.name).toBe('login');
  });

  // TODO: Ideally we'd also test that the navigation links work, but doing so
  // is beyond me. After I call trigger('click') on one of the v-list-item
  // elements in the navigation drawer, wrapper.vm.$route and
  // router.currentRoute are both empty objects. This is probably an issue
  // related to router-link (which v-list-item extends), since navigation works
  // in the signout test when it's triggered by $router.replace().
});
