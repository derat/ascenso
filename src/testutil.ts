// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// This file contains random junk. The only requirement for something being here
// is that it's used by more than one testing-related file.

import { Wrapper } from '@vue/test-utils';
import Vue from 'vue';

// Returns a deep copy of |data| (which must be serializable to JSON).
export function deepCopy(data: any) {
  return JSON.parse(JSON.stringify(data));
}

// Returns the 'value' attribute from the Vuetify component wrapped by |w|.
// TODO: Is there any way to avoid this 'as any' cast? I'm not
// sure that there are TypeScript types for all Vuetify components:
// https://github.com/vuetifyjs/vuetify/issues/5962
export function getValue(w: Wrapper<Vue>): any {
  return (w.vm as any).value;
}
