// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { db } from '@/firebase';

// Returns a promise that is satisfied once document snapshot(s) are loaded.
// The user and team documents (if present) are bound to properties named
// userProp and teamProp on view.
export function bindUserAndTeamDocs(view, userId, userProp, teamProp) {
  return new Promise((resolve, reject) => {
    const userRef = db.collection('users').doc(userId);
    view.$bind(userProp, userRef).then(
      () => {
        const team = view[userProp].team;
        if (!team) {
          resolve({ user: userRef });
        }
        const teamRef = db.collection('teams').doc(team);
        view.$bind(teamProp, teamRef).then(() => {
          resolve({ user: userRef, team: teamRef });
        });
      },
      err => {
        reject(err);
      }
    );
  });
}
