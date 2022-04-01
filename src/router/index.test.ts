// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase } from '@/firebase/mock';

// TODO: What's the right way to disable Vue's spammy messages across all tests?
// See discussion at https://forum.vuejs.org/t/5661 and
// https://github.com/vuejs/vue/pull/4907.
import Vue from 'vue';
Vue.config.productionTip = false;
Vue.config.devtools = false;

import flushPromises from 'flush-promises';
import router from './index';

describe('Router', () => {
  beforeEach(async () => {
    // Testing the router is tricky, since it's a singleton that persists across
    // tests. We do our best to reset it here by putting Firebase in a signed-in
    // state and going to the default landing page.
    MockFirebase.reset();
    // Avoid "NavigationDuplicated: Avoided redundant navigation to current
    // location: ..." errors if we're already at the routes page:
    // https://github.com/vuejs/vue-router/issues/2872#issuecomment-519073998
    router.replace('routes').catch(() => {});
    await flushPromises();
  });

  // Pushes route |name| and waits for navigation to finish.
  async function push(name: string) {
    router.push(name).catch(() => {}); // see above
    await flushPromises();
  }

  it('goes to requested pages', async () => {
    expect(router.currentRoute.name).toBe('routes');
    await push('stats');
    expect(router.currentRoute.name).toBe('stats');
    await push('profile');
    expect(router.currentRoute.name).toBe('profile');
    await push('routes');
    expect(router.currentRoute.name).toBe('routes');
  });

  it('goes to routes pages by default', async () => {
    // By default, we should go to the routes page.
    await push('/bogus');
    expect(router.currentRoute.name).toBe('routes');
  });

  it('prevents going to login page when logged in', async () => {
    // The login page should redirect to the routes page while logged in.
    await push('login');
    expect(router.currentRoute.name).toBe('routes');
  });

  it('always goes to login page when not logged in', async () => {
    // Simulate not being logged in and try to go to the stats page.
    // We should be sent to the login page instead.
    MockFirebase.currentUser = null;
    // It's important that the route that's used here ('stats') differs from the
    // current route ('routes'). Otherwise, router.beforeEach() won't be called.
    await push('stats');
    expect(router.currentRoute.name).toBe('login');

    // Other URLs should also go to the login page.
    await push('/bogus');
    expect(router.currentRoute.name).toBe('login');
  });
});
