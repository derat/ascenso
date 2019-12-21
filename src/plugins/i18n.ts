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
  // If you get bogus-seeming 'Fall back to translate the keypath ___ with "en"
  // language.' warnings even when the translation is defined, make sure that
  // you're passing parameters in an array rather than as args, e.g. use
  // $t('foo', [bar]) rather $t('foo', bar), since passing as args can
  // apparently trigger the warning. See
  // https://github.com/kazupon/vue-i18n/issues/89#issuecomment-344233814.
  fallbackLocale: 'en',
  messages: { en, es },
});
