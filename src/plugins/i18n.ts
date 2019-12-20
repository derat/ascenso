// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import VueI18n from 'vue-i18n';

import en from '@/locale/en';
import es from '@/locale/es';

Vue.use(VueI18n);

export default new VueI18n({
  // TODO: Make this selectable in the UI.
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, es },
});
