// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  MockFirebase,
  MockAuthUI,
  MockEmailAuthProviderID,
  MockGoogleAuthProviderID,
} from '@/firebase/mock';

import { createLocalVue, mount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';

import flushPromises from 'flush-promises';

import routes from '@/router/routes';
import Login from './Login.vue';

Vue.use(Vuetify);

describe('Login', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();
    MockAuthUI.reset();

    // See https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html.
    const localVue = createLocalVue();
    localVue.use(VueRouter);
    const router = new VueRouter({ mode: 'abstract', routes });
    wrapper = mount(Login, {
      localVue,
      router,
      mocks: MockFirebase.mountMocks,
    });

    // Let tests call flushPromises() themselves so they can set
    // MockAuthUI.pendingRedirect as needed.
  });

  // Returns true if the container holding the login UI is shown.
  function isContainerShown() {
    return wrapper.find({ ref: 'container' }).element.style.display != 'none';
  }

  it('calls AuthUI.start when mounted', async () => {
    await flushPromises();
    expect(MockAuthUI.containerID).toBeTruthy();
    expect(wrapper.contains(MockAuthUI.containerID!)).toBe(true);
    expect(MockAuthUI.config!.signInOptions).toEqual([
      MockGoogleAuthProviderID,
      MockEmailAuthProviderID,
    ]);
  });

  it('displays the UI when not logged in', async () => {
    MockAuthUI.pendingRedirect = false;
    await flushPromises();
    expect(isContainerShown()).toBe(true);
  });

  it('creates user doc and goes to profile after first login', async () => {
    MockAuthUI.pendingRedirect = true;
    await flushPromises();

    // The UI shouldn't be shown when we redirect back to the page.
    expect(isContainerShown()).toBe(false);

    // Simulate signin completing successfully.
    MockAuthUI.config!.callbacks!.signInSuccessWithAuthResult!();
    await flushPromises();

    // A document containing the user's name should be created and we should
    // switch to the profile view.
    const user = MockFirebase.currentUser!;
    expect(MockFirebase.getDoc(`users/${user.uid}`)).toEqual({
      name: user.displayName,
    });
    expect(wrapper.vm.$route.name).toBe('profile');
  });

  it('goes to routes view after subsequent logins', async () => {
    MockAuthUI.pendingRedirect = true;
    await flushPromises();
    expect(isContainerShown()).toBe(false);

    // Create a user doc to simulate the user previously having signed in.
    const user = MockFirebase.currentUser!;
    MockFirebase.setDoc(`users/${user.uid}`, { name: user.displayName });

    MockAuthUI.config!.callbacks!.signInSuccessWithAuthResult!();
    await flushPromises();
    expect(wrapper.vm.$route.name).toBe('routes');
  });
});