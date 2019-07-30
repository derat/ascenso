// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { db } from '@/firebase';

// Returns a promise that is satisfied once document snapshot(s) are loaded.
export function bindUserAndTeamDocs(view, userId, userProp, teamProp) {
  view.userRef = db.collection('users').doc(userId);
  view.$bind(userProp, view.userRef).then(() => {
    if (!view.userDoc.team) {
      view.ready = true;
    } else {
      view.teamRef = db.collection('teams').doc(view.userDoc.team);
      view.$bind(teamProp, view.teamRef).then(() => {
        view.ready = true;
      });
    }
  });
}
