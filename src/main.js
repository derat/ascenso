import Vue from 'vue';
import VueRouter from 'vue-router';

import './plugins/vuetify';

import App from './App.vue';

import Climbs from './components/Climbs.vue';
import Scoreboard from './components/Scoreboard.vue';
import Statistics from './components/Statistics.vue';

Vue.config.productionTip = false;

Vue.use(VueRouter);

const router = new VueRouter({
  routes: [
    { name: 'routes', path: '/routes', component: Climbs },
    { name: 'scores', path: '/scores', component: Scoreboard },
    { name: 'stats', path: '/stats', component: Statistics },
    // Redirect to /routes by default.
    { path: '*', redirect: '/routes' },
  ],
});

new Vue({
  router,
  render: h => h(App),
}).$mount('#app');
