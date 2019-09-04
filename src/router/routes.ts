// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains app route data passed to VueRouter's constructor.
// It lives in this file instead of index.ts so that unit tests can load it.

import Login from '@/views/Login.vue';
import Print from '@/views/Print.vue';
import Profile from '@/views/Profile.vue';
import Routes from '@/views/Routes.vue';
import Statistics from '@/views/Statistics.vue';

export default [
  {
    name: 'login',
    path: '/login',
    component: Login,
  },
  {
    name: 'print',
    path: '/print',
    component: Print,
    meta: { auth: false },
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
    name: 'stats',
    path: '/stats',
    component: Statistics,
    meta: { auth: true },
  },
  {
    path: '*',
    redirect: '/login',
  },
];
