// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '@mdi/font/css/materialdesignicons.css';

import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import colors from 'vuetify/lib/util/colors';
import i18n from '@/plugins/i18n';

Vue.use(Vuetify);

export default new Vuetify({
  lang: {
    // Make Vuetify use vue-i18n for translations:
    // https://vuetifyjs.com/en/customization/internationalization
    t: (key, ...params) => i18n.t(key, params),
  },
  theme: {
    themes: {
      light: {
        primary: colors.blue.darken1,
        secondary: colors.amber.base,
        error: colors.deepOrange.base,
      },
    },
  },
});
