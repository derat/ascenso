// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file. 

import Vue from 'vue';
import VueI18n from 'vue-i18n';

Vue.use(VueI18n);

const messages = {
  en: {
    yourName: 'Your Name',
    individual: 'Individual',
    team: 'Team',
  }, 
  es: {
    yourName: 'Tu Nombre',
    individual: 'Individual',
    team: 'Grupo',
  }
};

export default new VueI18n({
  locale: 'en',
  fallbackLocale: 'es',
  messages,
});

