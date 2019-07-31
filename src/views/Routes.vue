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
        v-bind:climberInfos="climberInfos"
        v-bind:routes="area.routes"
        @set-state="onSetState"
      />
    </v-expansion-panel-content>
  </v-expansion-panel>
  <Spinner v-else />
</template>

<script>
import firebase from 'firebase/app';
import { auth, db } from '@/firebase';
import { ClimberInfo, ClimbState } from '@/climbs';
import RouteList from '@/components/RouteList.vue';
import Spinner from '@/components/Spinner.vue';

// Colors associated with climbers.
const climbColors = Object.freeze(['red', 'indigo']);

export default {
  name: 'Routes',
  components: {
    RouteList,
    Spinner,
  },
  computed: {
    // Array of sorted UIDs from the team. Empty if the user is not currently on
    // a team.
    teamMembers: function() {
      // Sort by UID to get stable ordering.
      return !this.teamDoc.users ? [] : Object.keys(this.teamDoc.users).sort();
    },

    // Array of ClimberInfo objects, with one for each team member.
    // Empty if the user is not currently on a team.
    climberInfos: function() {
      return this.teamMembers.map(
        (uid, i) =>
          new ClimberInfo(
            this.teamDoc.users[uid].name || '',
            this.teamDoc.users[uid].climbs || {},
            climbColors[i % climbColors.length]
          )
      );
    },
  },
  data() {
    return {
      // Snapshot of /globals/sortedData doc consisting of a sorted array of
      // area objects containing sorted arrays of route objects.
      sortedData: {},
      // True after sortedData has been loaded.
      loaded: false,

      // Snapshot and reference to doc in /users collection.
      userDoc: {},
      userRef: null,

      // Snapshot and reference to doc in /teams collection.
      teamDoc: {},
      teamRef: null,
    };
  },
  methods: {
    // Updates team document in response to 'set-state' events from RouteList
    // component.
    onSetState(ev) {
      if (ev.index >= this.teamMembers.length) return;

      // Just delete the map entry instead of recording a not-climbed state.
      const value =
        ev.state == ClimbState.NOT_CLIMBED
          ? firebase.firestore.FieldValue.delete()
          : ev.state;

      const uid = this.teamMembers[ev.index];
      this.teamRef.update({ ['users.' + uid + '.climbs.' + ev.route]: value });
    },
  },
  mounted() {
    this.$bind('sortedData', db.collection('global').doc('sortedData'))
      .then(() => {
        this.loaded = true;
      })
      .catch(error => {
        console.log('Failed to load sorted data: ', error);
      });

    this.userRef = db.collection('users').doc(auth.currentUser.uid);
    this.$bind('userDoc', this.userRef);
  },
  watch: {
    'userDoc.team': function() {
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
    },
  },
};
</script>

<style>
.area {
  font-size: 16px;
}
</style>
