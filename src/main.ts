// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { logError } from '@/log';
import { getAuth } from '@/firebase';

const isTestEnv = process.env.NODE_ENV == 'test';

// Install global error handlers as soon as possible. Don't install them when
// running tests, since we want errors to cause failures.
if (!isTestEnv) {
  // This function signature is weird: https://stackoverflow.com/q/20500190/
  window.onerror = function(
    eventOrMessage: string | Event,
    src?: string,
    line?: number
  ) {
    try {
      const message =
        eventOrMessage instanceof ErrorEvent
          ? eventOrMessage.message
          : eventOrMessage;
      logError('unhandled_error', { message, src, line });
    } catch (err) {
      console.log('Error handler generated error:', err);
    }
  };
  window.onunhandledrejection = function(event: PromiseRejectionEvent) {
    try {
      logError('unhandled_rejection', { reason: event.reason.toString() });
    } catch (err) {
      console.log('Rejection handler generated error:', err);
    }
  };
}

import Vue from 'vue';

if (!isTestEnv) {
  Vue.config.errorHandler = function(err: Error, vm: Vue, info: string) {
    try {
      logError('vue_error', err);
    } catch (e) {
      console.log('Vue error handler generated error:', err);
    }
  };
}

Vue.config.productionTip = false;
Vue.config.devtools = false;

// Uncomment to turn on performance tracing.
//Vue.config.performance = true;

import VueRouter from 'vue-router';
import { firestorePlugin } from 'vuefire';

Vue.use(VueRouter);
Vue.use(firestorePlugin);

import App from '@/App.vue';
// TODO: Do we actually need to use this? See
// https://vuetifyjs.com/en/customization/internationalization
import i18n from '@/plugins/i18n';
import vuetify from '@/plugins/vuetify';
import router from '@/router';

import '@/register-service-worker';

// Defer Vue initialization until Firebase has determined if the user has
// authenticated or not. Otherwise, router.beforeEach may end up trying to
// inspect Firebase's auth state before it's been initialized.
let app: Vue | null = null;
getAuth().then(auth => {
  auth.onAuthStateChanged(() => {
    if (!app) {
      app = new Vue({
        router,
        i18n,
        vuetify,
        render: h => h(App),
      }).$mount('#app');
    }
  });
});
