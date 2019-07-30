// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ClimbState describes whether and how a climber has climbed a route.
export enum ClimbState {
  NOT_CLIMBED = 0,
  LEAD,
  TOP_ROPE,
}

// ClimberInfo contains information about a climber.
export class ClimberInfo {
  constructor(
    public name: string,
    public states: Record<string, ClimbState>,
    public color: string
  ) {}
}

// Statistic contains a single item displayed in the Statistics view.
export class Statistic {
  constructor(
    public name: string,
    public value: number,
    public children?: Statistic[]
  ) {}
}

// Area contains information about a climbing area.
// It appears in the globals/indexedData and globals/SortedData Firestore docs.
export interface Area {
  name: string;
  routes?: Route[];
}

// Route contains information about a climbing route.
// It appears in the globals/indexedData and globals/SortedData Firestore docs.
export interface Route {
  id?: string;
  name: string;
  grade: string;
  area?: string;
  lead: number;
  tr: number;
}

// IndexedData corresponds to the globals/indexedData Firestore doc.
export interface IndexedData {
  areas: Record<string, Area>;
  routes: Record<string, Route>;
}

// SortedData corresponds to the globals/sortedData Firestore doc.
export interface SortedData {
  areas: Area[];
}
