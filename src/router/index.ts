// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file constructs and exports the VueRouter used for routing between
// different views.

import VueRouter from 'vue-router';
import { getAuth } from '@/firebase';
import routes from './routes';

const router = new VueRouter({ mode: 'history', routes });

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
