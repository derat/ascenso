// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { LocaleMessages } from 'vue-i18n';

import enUs from './en-US';
import esPr from './es-PR';

test('same strings are translated to each locale', () => {
  // Map from a translated string's identifier (e.g. 'cancelButton') to the
  // number of placeholders in it.
  type LocaleGroup = Record<string, number>;
  // Map from a group (e.g. '$vuetify' or 'Profile') to its strings.
  type LocaleInfo = Record<string, LocaleGroup>;

  // Returns a summary of the translated strings for the supplied locale.
  const getLocaleInfo = (messages: LocaleMessages) => {
    const info: LocaleInfo = {};
    for (const groupName of Object.keys(messages)) {
      const group: LocaleGroup = (info[groupName] = {});

      // Don't examine Vuetify's strings since we don't control them.
      if (groupName == '$vuetify') continue;

      // Count the number of parameters in each translated string.
      for (const id of Object.keys(messages[groupName])) {
        const msg = messages[groupName][id].toString();
        group[id] = (msg.match(/{[^}]+}/g) || []).length;
      }
    }
    return info;
  };

  expect(getLocaleInfo(enUs)).toEqual(getLocaleInfo(esPr));
});
