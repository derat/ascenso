// Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import Vue from 'vue';
import { Component, Watch } from 'vue-property-decorator';
import { User, Team } from '@/models';
import { getAuth, getFirebase, getFirestore } from '@/firebase';

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

  // To avoid making components that use this mixin repeatedly asynchronously
  // import Firebase modules whenever they want to use them, cache the modules
  // after we've loaded them.
  //
  // Note that callers can't call these getters before |userLoaded| has become
  // true, and specifically can't call them from their own mounted()
  // implementations -- they need to call getAuth(), getFirestore(), etc.
  // instead.
  _firebase: any = null;
  _auth: firebase.auth.Auth | null = null;
  _firestore: firebase.firestore.Firestore | null = null;

  get firebase() {
    if (!this._firebase) throw new Error('Firebase not available yet');
    return this._firebase;
  }
  get auth(): firebase.auth.Auth {
    if (!this._auth) throw new Error('Auth not available yet');
    return this._auth;
  }
  get firestore(): firebase.firestore.Firestore {
    if (!this._firestore) throw new Error('Firestore not available yet');
    return this._firestore;
  }
  get user(): firebase.User {
    if (!this.auth.currentUser) throw new Error('No current user');
    return this.auth.currentUser;
  }

  mounted() {
    Promise.all([getFirebase(), getAuth(), getFirestore()]).then(
      ([firebase, auth, firestore]) => {
        this._firebase = firebase;
        this._auth = auth;
        this._firestore = firestore;

        // Kick things off by loading the user doc.
        this.userRef = firestore.collection('users').doc(this.user.uid);
        this.$bind('userDoc', this.userRef)
          .then(userSnap => {
            // If the user isn't on a team, then we're done. Otherwise,
            // onTeamChanged will handle setting userReady after it loads the team
            // doc.
            if (userSnap['team'] === undefined) this.userLoaded = true;
          })
          .catch(err => {
            this.userLoadError = err;
          });
      }
    );
  }

  @Watch('userDoc.team')
  onTeamChanged() {
    // When the team ID in the user doc changes, update the reference and
    // snapshot for the team document accordingly.
    if (this.userDoc.team) {
      this.teamRef = this.firestore.collection('teams').doc(this.userDoc.team);
      this.$bind('teamDoc', this.teamRef)
        .then(() => {
          this.userLoaded = true;
        })
        .catch(err => {
          this.userLoadError = err;
        });
    } else {
      this.$unbind('teamDoc');
      this.teamDoc = {};
      this.teamRef = null;
    }
  }
}
