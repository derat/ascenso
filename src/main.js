import Vue from 'vue';
import VueRouter from 'vue-router';

import './plugins/vuetify';

import firebase from "firebase";
import firebaseConfig from "./firebase";

import App from './App.vue';
import Climbs from './components/Climbs.vue';
import Login from './components/Login.vue';
import Scoreboard from './components/Scoreboard.vue';
import Statistics from './components/Statistics.vue';

Vue.config.productionTip = false;

Vue.use(VueRouter);

const router = new VueRouter({
  routes: [
    {
      name: 'login',
      path: '/login',
      component: Login,
      meta: { forbidAuth: true },
    },
    {
      name: 'routes',
      path: '/routes',
      component: Climbs,
      meta: { requireAuth: true },
    },
    {
      name: 'scores',
      path: '/scores',
      component: Scoreboard,
      meta: { requireAuth: true },
    },
    {
      name: 'stats',
      path: '/stats',
      component: Statistics,
      meta: { requireAuth: true },
    },
    {
      path: '*',
      redirect: '/login',
    },
  ],
});

router.beforeEach((to, from, next) => {
  const user = firebase.auth().currentUser;
  const requireAuth = to.matched.some(record => record.meta.requireAuth);
  const forbidAuth = to.matched.some(record => record.meta.forbidAuth);

  if (requireAuth && !user) {
    next('login');
  } else if (forbidAuth && user) {
    next('routes');
  } else {
    next();
  }
});

// Defer Vue initialization until Firebase has determined if the user has
// authenticated or not. Otherwise, the router.beforeEach code above may end up
// trying to inspect Firebase's auth state before it's been initialized.
let app = null;
firebase.initializeApp(firebaseConfig);
firebase.auth().onAuthStateChanged(() => {
  if (!app) {
    app = new Vue({
      router,
      render: h => h(App),
    }).$mount('#app');
  }
});
