// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {},
  commands: {
    // Toggles the route listing for |areaID|.
    toggleArea(areaID: string) {
      const expand = `#routes-expand-${areaID}`;
      return this.waitForElementVisible(expand).click(expand);
    },
    // Sets |routeID|'s state. |climberIndex| should be 0 for the first climber
    // on the team and 1 for the second, and |menuIndex| is the 0-based index of
    // the item to click in the dropdown (e.g. 0 for 'Lead').
    setClimbState(routeID: string, climberIndex: number, menuIndex: number) {
      const button = buttonSelector(routeID, climberIndex);
      const item = `.climb-state-list a:nth-of-type(${menuIndex + 1})`;
      return this.waitForElementVisible(button)
        .click(button)
        .waitForElementVisible(item)
        .click(item);
    },
    // Invokes |callback| with the text in |button|.
    getClimbButtonText(
      routeID: string,
      climberIndex: number,
      callback: (text: string) => void
    ) {
      const button = buttonSelector(routeID, climberIndex);
      return this.waitForElementVisible(button).getText(button, res =>
        callback(res.value)
      );
    },
  },
};

// Returns a selector for the requested climb dropdown button.
const buttonSelector = (routeID, buttonIndex: number) =>
  `#routes-route-${routeID} button:nth-of-type(${buttonIndex + 1})`;
