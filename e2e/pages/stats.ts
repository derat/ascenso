// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

module.exports = {
  elements: {},
  commands: {
    // Invokes |callback| with the name and value of the requested stat.
    // |cardIndex| is the zero-based index of the card to check.
    // |statIndex| is the zero-based index of the stat within the card.
    getStat(
      isTeam: boolean,
      cardIndex: number,
      statIndex: number,
      callback: (name: string, value: string) => void
    ) {
      const prefix = `.${isTeam ? 'team' : 'user'}-card-${cardIndex} `;
      const nameSel = prefix + `span:nth-of-type(${2 * statIndex + 1})`;
      const valueSel = prefix + `span:nth-of-type(${2 * statIndex + 2})`;

      return this.waitForElementVisible(nameSel).getText(nameSel, nameRes =>
        this.waitForElementVisible(valueSel).getText(valueSel, valueRes =>
          callback(nameRes.value, valueRes.value)
        )
      );
    },
  },
};
