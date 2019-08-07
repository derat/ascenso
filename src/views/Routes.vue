<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-expansion-panel v-if="loaded" expand>
    <v-expansion-panel-content
      v-for="area in sortedData.areas"
      :key="area.name"
    >
      <template v-slot:header>
        <div class="area">{{ area.name }}</div>
      </template>
      <RouteList
        :climberInfos="climberInfos"
        :routes="area.routes"
        @set-climb-state="onSetClimbState"
      />
    </v-expansion-panel-content>
  </v-expansion-panel>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';

import firebase from 'firebase/app';
type DocumentReference = firebase.firestore.DocumentReference;

import { db, getUser, logInfo, logError } from '@/firebase';
import {
  ClimberInfo,
  ClimbState,
  SetClimbStateEvent,
  SortedData,
  User,
  Team,
} from '@/models';
import RouteList from '@/components/RouteList.vue';
import Spinner from '@/components/Spinner.vue';

@Component({
  components: { RouteList, Spinner },
})
export default class Routes extends Vue {
  readonly sortedData: Partial<SortedData> = {};
  // True after sortedData is loaded.
  loaded = false;

  // Colors associated with climbers.
  static readonly climbColors = ['red', 'indigo'];

  // Snapshot and reference to doc in /users collection.
  readonly userDoc: Partial<User> = {};
  userRef: DocumentReference | null = null;

  // Snapshot and reference to doc in /teams collection.
  teamDoc: Partial<Team> = {};
  teamRef: DocumentReference | null = null;

  // Sorted UIDs from the team. Empty if the user is not currently on a team.
  get teamMembers(): string[] {
    // Sort by UID to get stable ordering.
    return this.teamDoc.users ? Object.keys(this.teamDoc.users).sort() : [];
  }

  // Info for each climber on the team.
  // Empty if the user is not currently on a team.
  get climberInfos(): ClimberInfo[] {
    return this.teamMembers.map((uid, i) => {
      const data = this.teamDoc.users ? this.teamDoc.users[uid] : null;
      if (!data) throw new Error('No data found for user ' + uid);
      return new ClimberInfo(
        data.name || '',
        data.climbs || {},
        Routes.climbColors[i % Routes.climbColors.length]
      );
    });
  }

  // Updates team document in response to 'set-climb-state' events from RouteList
  // component.
  onSetClimbState(ev: SetClimbStateEvent) {
    if (!this.teamRef) throw new Error('No ref to team doc');
    if (ev.index >= this.teamMembers.length) {
      throw new Error('Invalid team member index ' + ev.index);
    }

    // Just delete the map entry instead of recording a not-climbed state.
    const value =
      ev.state == ClimbState.NOT_CLIMBED
        ? firebase.firestore.FieldValue.delete()
        : ev.state;

    const uid = this.teamMembers[ev.index];

    logInfo('set_climb_state', { user: uid, route: ev.route, state: ev.state });
    this.teamRef.update({ ['users.' + uid + '.climbs.' + ev.route]: value });
  }

  mounted() {
    this.$bind('sortedData', db.collection('global').doc('sortedData')).then(
      () => {
        this.loaded = true;
      },
      error => logError('routes_load_failed', { error })
    );

    this.userRef = db.collection('users').doc(getUser().uid);
    this.$bind('userDoc', this.userRef);
  }

  @Watch('userDoc.team')
  onTeamChanged() {
    // When the team ID in the user doc changes, update the reference and
    // snapshot to the team document accordingly.
    if (this.userDoc.team) {
      this.teamRef = db.collection('teams').doc(this.userDoc.team);
      this.$bind('teamDoc', this.teamRef);
    } else {
      this.$unbind('teamDoc');
      this.teamDoc = {};
      this.teamRef = null;
    }
  }
}
</script>

<style>
.area {
  font-size: 16px;
}
</style>
