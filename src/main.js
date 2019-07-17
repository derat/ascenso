import Vue from 'vue';
import VueRouter from 'vue-router';

import './plugins/vuetify';

import firebase from "firebase";
import firebaseConfig from "./firebase";

import App from './App.vue';
import Login from './components/Login.vue';
import Routes from './components/Routes.vue';
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
