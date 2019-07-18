import Vue from 'vue';
import VueRouter from 'vue-router';
import firebase from 'firebase';
import './plugins/vuetify';

import App from './App.vue';
import router from './router';
import firebaseConfig from './firebase';

Vue.config.productionTip = false;

Vue.use(VueRouter);

// Defer Vue initialization until Firebase has determined if the user has
// authenticated or not. Otherwise, router.beforeEach may end up trying to
// inspect Firebase's auth state before it's been initialized.
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
