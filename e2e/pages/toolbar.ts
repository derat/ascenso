// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {
    menuIcon: '#toolbar-menu-icon',
    routes: '#toolbar-routes',
    stats: '#toolbar-stats',
    profile: '#toolbar-profile',
    signOut: '#toolbar-sign-out',
    signOutConfirmButton: '#toolbar-sign-out-confirm-button',
  },
  commands: {
    // Opens the navigation drawer and clicks the supplied element.
    clickNavElement(element: string) {
      return this.waitForElementVisible('@menuIcon')
        .click('@menuIcon')
        .waitForElementVisible(element)
        .click(element);
    },
    signOut() {
      return this.clickNavElement('@signOut')
        .waitForElementVisible('@signOutConfirmButton')
        .click('@signOutConfirmButton')
        .waitForElementNotPresent('@signOutConfirmButton');
    },
  },
};
