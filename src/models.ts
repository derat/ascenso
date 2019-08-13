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
  initials: string;

  constructor(
    public name: string,
    public states: Record<string, ClimbState>,
    public color: string
  ) {
    this.initials = name
      .split(/\s+/, 3)
      .map(w => (w ? w[0] : ''))
      .join('')
      .toUpperCase();
  }
}

// Statistic contains a single item displayed in the Statistics view.
export class Statistic {
  constructor(
    public name: string,
    public value: number,
    public children?: Statistic[]
  ) {}
}

// SetClimbStateEvent is emitted in a 'set-climb-state' event by the RouteList
// component when the climb state for a route is changed.
export class SetClimbStateEvent {
  constructor(
    public index: number,
    public route: string,
    public state: ClimbState
  ) {}
}

// Config represents the global/config Firestore doc.
export interface Config {
  competitionName: string;
}

// Area contains information about a climbing area.
// It appears in the global/indexedData and global/SortedData Firestore docs.
export interface Area {
  name: string;
  routes?: Route[];
}

// Route contains information about a climbing route.
// It appears in the global/indexedData and global/SortedData Firestore docs.
export interface Route {
  id?: string;
  name: string;
  grade: string;
  area?: string;
  lead: number;
  tr: number;
}

// IndexedData corresponds to the global/indexedData Firestore doc.
export interface IndexedData {
  areas: Record<string, Area>;
  routes: Record<string, Route>;
}

// SortedData corresponds to the global/sortedData Firestore doc.
export interface SortedData {
  areas: Area[];
}

// Team represents a document in the 'teams' collection.
export interface Team {
  name: string;
  invite: string;
  users: Record<string, TeamUserData>;
}

// TeamUserData represents a record in the 'users' field in a document in the
// 'teams' collection.
export interface TeamUserData {
  name: string;
  climbs: Record<string, ClimbState>;
}

// User represents a document in the 'users' collection.
export interface User {
  name: string;
  team?: string;
  climbs?: Record<string, ClimbState>;
}
