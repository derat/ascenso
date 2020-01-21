// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {
    localePicker: '#toolbar-locale-picker',
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
    changeLocale(index: number) {
      const img = `.flag-container>:nth-child(${index + 1})`;
      return (
        this.clickNavElement('@localePicker')
          .waitForElementVisible(img)
          .click(img)
          // We need to click outside of the navigation drawer to dismiss it, so
          // just use an arbitrary large offset from the menu icon in the upper-left
          // corner of the window.
          .moveToElement('@menuIcon', 500, 0, () => {
            this.api.mouseButtonClick(0);
          })
      );
    },
    signOut() {
      return this.clickNavElement('@signOut')
        .waitForElementVisible('@signOutConfirmButton')
        .click('@signOutConfirmButton')
        .waitForElementNotPresent('@signOutConfirmButton');
    },
  },
};
