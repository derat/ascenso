// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// ClimbState describes whether and how a climber has climbed a route.
export const ClimbState = Object.freeze({
  NOT_CLIMBED: 0,
  LEAD: 1,
  TOP_ROPE: 2,
});

// ClimberInfo contains information about a climber.
export const ClimberInfo = class {
  // name contains the climber's name.
  // states maps from route ID to ClimbState.
  // color contains a color string to use in climb drop-down menus.
  constructor(name, states, color) {
    this.name = name;
    this.states = states;
    this.color = color;
  }
};
