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

// Climbing grades in ascending order.
// TODO: Consider including '5.10-', '5.11+', etc., or at least having some way
// of mapping them to 5.10a/b, 5.11c/d, etc.
export const Grades = [
  '5.0',
  '5.1',
  '5.2',
  '5.3',
  '5.4',
  '5.5',
  '5.6',
  '5.7',
  '5.8',
  '5.9',
  '5.9+',
  '5.10a',
  '5.10b',
  '5.10c',
  '5.10d',
  '5.11a',
  '5.11b',
  '5.11c',
  '5.11d',
  '5.12a',
  '5.12b',
  '5.12c',
  '5.12d',
  '5.13a',
  '5.13b',
  '5.13c',
  '5.13d',
  '5.14a',
  '5.14b',
  '5.14c',
  '5.14d',
  '5.15a',
  '5.15b',
  '5.15c',
  '5.15d',
];

// Maps from each grade to its index in |Grades|.
// Presumably faster than calling Grades.indexOf().
export const GradeIndexes: Record<string, number> = Grades.reduce(
  (res: Record<string, number>, g: string, i: number) => {
    res[g] = i;
    return res;
  },
  {}
);

// SetClimbStateEvent is emitted in a 'set-climb-state' event by the RouteList
// component when the climb state for a route is changed.
export class SetClimbStateEvent {
  constructor(
    public index: number,
    public route: string,
    public state: ClimbState
  ) {}
}

// Area contains information about a climbing area.
// It appears in the global/indexedData and global/sortedData Firestore docs.
export interface Area {
  id?: string; // only in sortedData
  name: string;
  routes?: Route[]; // only in sortedData
  mpId?: string; // Mountain Project ID
}

// Route contains information about a climbing route.
// It appears in the global/indexedData and global/sortedData Firestore docs.
export interface Route {
  id?: string; // only in sortedData
  name: string;
  grade: string;
  area?: string; // only in indexedData
  lead: number;
  tr: number;
  mpId?: string; // Mountain Project ID
  height?: number; // in feet
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

// Config corresponds to the globals/config Firestore doc.
export interface Config {
  startTime?: firebase.firestore.Timestamp;
  endTime?: firebase.firestore.Timestamp;
}

// Team represents a document in the 'teams' collection.
export interface Team {
  name: string;
  invite: string;
  users: Record<string, TeamUserData>;
  abandoned?: boolean; // only if a user left after climbs were recorded
}

// Number of members on a complete team.
export const TeamSize = 2;

// TeamUserData represents a record in the 'users' field in a document in the
// 'teams' collection.
export interface TeamUserData {
  name: string;
  climbs: Record<string, ClimbState>;
  left?: boolean; // only if the user left the team after it was abandoned
}

// User represents a document in the 'users' collection.
export interface User {
  name: string;
  team?: string; // only if on a team
  filters?: UserFilterData; // only if non-empty
}

// UserFilterData represents route filter data inside User.
export interface UserFilterData {
  minGrade?: string; // only if not equal to easiest climb's grade
  maxGrade?: string; // only if not equal to hardest climb's grade
}
