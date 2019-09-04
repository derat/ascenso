// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { MockFirebase } from '@/firebase/mock';
import { shallowMount, Wrapper } from '@vue/test-utils';
import Vue from 'vue';
import flushPromises from 'flush-promises';

import { SortedData } from '@/models.ts';
import Print from './Print.vue';

const sortedData: SortedData = {
  areas: [
    {
      name: 'Area 1',
      id: 'a1',
      routes: [
        { id: 'r1', name: 'Route 1', grade: '5.10a', lead: 10, tr: 5 },
        { id: 'r2', name: 'Route 2', grade: '5.7', lead: 6, tr: 3 },
      ],
    },
    {
      name: 'Area 2',
      id: 'a2',
      routes: [{ id: 'r3', name: 'Route 3', grade: '5.12c', lead: 20, tr: 10 }],
    },
    {
      name: 'Area 3',
      id: 'a3',
      routes: [
        { id: 'r4', name: 'Route 4', grade: '5.11a', lead: 16, tr: 8 },
        { id: 'r5', name: 'Route 5', grade: '5.9', lead: 9, tr: 5 },
        { id: 'r6', name: 'Route 6', grade: '5.8', lead: 8, tr: 4 },
      ],
    },
  ],
};

describe('Print', () => {
  let wrapper: Wrapper<Vue>;

  beforeEach(async () => {
    MockFirebase.reset();
    MockFirebase.setDoc('global/sortedData', sortedData);
    wrapper = shallowMount(Print, { mocks: MockFirebase.mountMocks });
    await flushPromises();
  });

  it('displays areas and routes', () => {
    const tables = wrapper.findAll('table');
    const getText = (sel: string): string[][] =>
      tables.wrappers.map(t => t.findAll(sel).wrappers.map(td => td.text()));
    expect(getText('tr td:nth-child(1)')).toEqual([
      ['Area 1', 'Route 1 5.10a', 'Route 2 5.7', 'Area 2', 'Route 3 5.12c'],
      ['Area 3', 'Route 4 5.11a', 'Route 5 5.9', 'Route 6 5.8'],
    ]);
    expect(getText('tr td:nth-child(2)')).toEqual([
      ['Lead', '☐ 10', '☐ 6', 'Lead', '☐ 20'],
      ['Lead', '☐ 16', '☐ 9', '☐ 8'],
    ]);
    expect(getText('tr td:nth-child(4)')).toEqual([
      ['Lead', '☐ 10', '☐ 6', 'Lead', '☐ 20'],
      ['Lead', '☐ 16', '☐ 9', '☐ 8'],
    ]);
    expect(getText('tr td:nth-child(6)')).toEqual([
      ['TR', '☐ 5', '☐ 3', 'TR', '☐ 10'],
      ['TR', '☐ 8', '☐ 5', '☐ 4'],
    ]);
  });
});
