// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { Component, Watch } from 'vue-property-decorator';
import { User, Team } from '@/models';
import { app } from '@/firebase';

import type firebase from 'firebase';

type DocumentReference = firebase.firestore.DocumentReference;

// The UserLoader mixin component automatically binds the Firestore user
// document (i.e. 'users/<uid>' to |userDoc| and |userRef| data properties.
//
// If the user is on a team, it also binds the team document (i.e.
// 'teams/<team_id>') to |teamDoc| and |teamRef|, updating those properties if
// the user leaves the team or joins a new one.
@Component
export default class UserLoader extends Vue {
  // Snapshot and reference for user document.
  userDoc: Partial<User> = {};
  userRef: DocumentReference | null = null;

  // Snapshot and reference for team document.
  teamDoc: Partial<Team> = {};
  teamRef: DocumentReference | null = null;

  // Components using this mixin should watch the following data properties to
  // observe load-related events.
  //
  // Set to true after user (and team, if applicable) docs are loaded. This
  // should only have a single transition from false to true after the initial
  // load completes successfully.
  userLoaded = false;
  // Set if user or team document fails to load. Note that this may be set
  // multiple times: the team document is rebound if the user switches teams.
  userLoadError: Error | null = null;

  get user(): firebase.User {
    const user = app.auth().currentUser;
    if (!user) throw new Error('No current user');
    return user;
  }

  mounted() {
    // Kick things off by loading the user doc.
    this.userRef = app.firestore().collection('users').doc(this.user.uid);
    this.$bind('userDoc', this.userRef)
      .then((userSnap) => {
        // If the user isn't on a team, then we're done. Otherwise,
        // onTeamChanged will handle setting userReady after it loads the team
        // doc.
        if (userSnap['team'] === undefined) this.userLoaded = true;
      })
      .catch((err) => {
        this.userLoadError = err;
      });
  }

  @Watch('userDoc.team')
  onTeamChanged() {
    // When the team ID in the user doc changes, update the reference and
    // snapshot for the team document accordingly.
    if (this.userDoc.team) {
      this.teamRef = app.firestore().collection('teams').doc(this.userDoc.team);
      this.$bind('teamDoc', this.teamRef)
        .then(() => {
          this.userLoaded = true;
        })
        .catch((err) => {
          this.userLoadError = err;
        });
    } else {
      this.$unbind('teamDoc');
      this.teamDoc = {};
      this.teamRef = null;
    }
  }
}
