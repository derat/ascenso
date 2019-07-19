import Vue from 'vue';
import VueRouter from 'vue-router';

import './plugins/vuetify';
import { firestorePlugin } from 'vuefire';

import { auth } from './firebase';

import App from './App.vue';
import router from './router';

Vue.config.productionTip = false;

// Uncomment to turn on performance tracing.
//Vue.config.performance = true;

Vue.use(VueRouter);
Vue.use(firestorePlugin);

// Defer Vue initialization until Firebase has determined if the user has
// authenticated or not. Otherwise, router.beforeEach may end up trying to
// inspect Firebase's auth state before it's been initialized.
let app = null;
auth.onAuthStateChanged(() => {
  if (!app) {
    app = new Vue({
      router,
      render: h => h(App),
    }).$mount('#app');
  }
});
