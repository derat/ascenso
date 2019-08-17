// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file constructs and exports the VueRouter used for routing between
// different views.

import VueRouter from 'vue-router';
import { getAuth } from '@/firebase';

import Login from '@/views/Login.vue';
import Profile from '@/views/Profile.vue';
import Routes from '@/views/Routes.vue';
import Scoreboard from '@/views/Scoreboard.vue';
import Statistics from '@/views/Statistics.vue';

const router = new VueRouter({
  mode: 'history',
  routes: [
    {
      name: 'login',
      path: '/login',
      component: Login,
    },
    {
      name: 'profile',
      path: '/profile',
      component: Profile,
      meta: { auth: true },
    },
    {
      name: 'routes',
      path: '/routes',
      component: Routes,
      meta: { auth: true },
    },
    {
      name: 'scores',
      path: '/scores',
      component: Scoreboard,
      meta: { auth: true },
    },
    {
      name: 'stats',
      path: '/stats',
      component: Statistics,
      meta: { auth: true },
    },
    {
      path: '*',
      redirect: '/login',
    },
  ],
});

router.beforeEach((to, from, next) => {
  getAuth().then(auth => {
    const loggedIn = !!auth.currentUser;
    const needsAuth = to.matched.some(record => record.meta.auth);
    const isLoginPage = to.matched.some(record => record.name == 'login');

    if (needsAuth && !loggedIn) {
      next('login');
    } else if (isLoginPage && loggedIn) {
      next('routes');
    } else {
      next();
    }
  });
});

export default router;
