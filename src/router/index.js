// This file constructs and exports the VueRouter used for routing between
// different views.

import VueRouter from 'vue-router';
import firebase from 'firebase';

import Login from '@/views/Login.vue';
import Routes from '@/views/Routes.vue';
import Scoreboard from '@/views/Scoreboard.vue';
import Statistics from '@/views/Statistics.vue';

const router = new VueRouter({
  routes: [
    {
      name: 'login',
      path: '/login',
      component: Login,
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
  const user = firebase.auth().currentUser;
  const needsAuth = to.matched.some(record => record.meta.auth);
  const isLoginPage = to.matched.some(record => record.name == 'login');

  if (needsAuth && !user) {
    next('login');
  } else if (isLoginPage && user) {
    next('routes');
  } else {
    next();
  }
});

export default router;
