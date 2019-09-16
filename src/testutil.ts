// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains random junk. The only requirement for something being here
// is that it's used by more than one testing-related file.

import { createLocalVue, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import Vuetify from 'vuetify';
import VueRouter from 'vue-router';

// Returns a deep copy of |data| (which must be serializable to JSON).
export function deepCopy(data: any) {
  return JSON.parse(JSON.stringify(data));
}

// Performs common setup needed for testing Vuetify components. This function
// should be called once at the beginning of each test file.
export function setUpVuetifyTesting() {
  Vue.use(Vuetify);

  // Avoid Vuetify log spam: https://github.com/vuetifyjs/vuetify/issues/3456
  // I believe that Vuetify uses the data-app element to attach floating UI
  // elements such as menus.
  if (!document.getElementById('data-app')) {
    const el = document.createElement('div');
    el.setAttribute('data-app', 'true');
    document.body.appendChild(el);
  }
}

// Returns a new options object to pass to mount() or shallowMount() when
// instantiating a Vuetify component for unit tests. If |baseOptions| is
// supplied, its properties are included in the returned object.
export function newVuetifyMountOptions(baseOptions?: Object): Object {
  // See https://vue-test-utils.vuejs.org/guides/using-with-vue-router.html.
  const localVue = createLocalVue();
  if (baseOptions && baseOptions.hasOwnProperty('router')) {
    localVue.use(VueRouter);
  }

  return Object.assign(
    {
      localVue,
      vuetify: new Vuetify(),
    },
    baseOptions
  );
}

// Returns the 'value' attribute from the Vuetify component wrapped by |w|.
// TODO: Is there any way to avoid this 'as any' cast? I'm not
// sure that there are TypeScript types for all Vuetify components:
// https://github.com/vuetifyjs/vuetify/issues/5962
export function getValue(w: Wrapper<Vue>): any {
  return (w.vm as any).value;
}
