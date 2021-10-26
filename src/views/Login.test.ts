// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  MockFirebase,
  MockAuthUI,
  MockEmailAuthProviderID,
  MockGoogleAuthProviderID,
} from '@/firebase/mock';

import { mount, Wrapper } from '@vue/test-utils';
import { setUpVuetifyTesting, newVuetifyMountOptions } from '@/testutil';
import Vue from 'vue';
import VueRouter from 'vue-router';
import flushPromises from 'flush-promises';

import routes from '@/router/routes';
import Login from './Login.vue';

setUpVuetifyTesting();

describe('Login', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(() => {
    MockFirebase.reset();
    MockAuthUI.reset();
  });

  // Let tests mount the view themselves so they can set |pendingRedirect|.
  function mountView() {
    wrapper = mount(
      Login,
      newVuetifyMountOptions({
        router: new VueRouter({ mode: 'abstract', routes }),
        mocks: MockFirebase.mountMocks,
      })
    );
  }

  function isSpinnerShown() {
    return wrapper.find({ ref: 'spinner' }).exists();
  }

  it('calls AuthUI.start when mounted', async () => {
    mountView();
    expect(MockAuthUI.containerID).toBeTruthy();
    expect(wrapper.contains(MockAuthUI.containerID!)).toBe(true);
    expect(MockAuthUI.config!.signInOptions).toEqual([
      MockGoogleAuthProviderID,
      MockEmailAuthProviderID,
    ]);
  });

  it("doesn't display the spinner when not logged in", async () => {
    MockAuthUI.pendingRedirect = false;
    mountView();
    expect(isSpinnerShown()).toBe(false);
  });

  it('creates user doc and goes to profile after first login', async () => {
    MockAuthUI.pendingRedirect = true;
    mountView();

    // The spinner should be shown when we redirect back to the page.
    expect(isSpinnerShown()).toBe(true);

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

  it('uses default name if display name is unset', async () => {
    // Simulate the display name being unset, which happens during email signin.
    const user = MockFirebase.currentUser!;
    user.displayName = null;
    MockAuthUI.pendingRedirect = true;
    mountView();

    MockAuthUI.config!.callbacks!.signInSuccessWithAuthResult!();
    await flushPromises();

    // The Firestore rules don't permit missing names, so the view should use a
    // fallback.
    expect(MockFirebase.getDoc(`users/${user.uid}`)).toEqual({
      name: 'Unknown Climber',
    });
  });

  it('goes to routes view after subsequent logins', async () => {
    MockAuthUI.pendingRedirect = true;
    mountView();
    expect(isSpinnerShown()).toBe(true);

    // Create a user doc to simulate the user previously having signed in.
    const user = MockFirebase.currentUser!;
    MockFirebase.setDoc(`users/${user.uid}`, { name: user.displayName });

    MockAuthUI.config!.callbacks!.signInSuccessWithAuthResult!();
    await flushPromises();
    expect(wrapper.vm.$route.name).toBe('routes');
  });
});
