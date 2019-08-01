<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<!-- TODO: Style this, and add tabs for User & Team. -->
<template>
  <div v-if="haveStats">
    <h1 class="pl-2 py-2">You</h1>
    <StatisticsList :items="itemsUser" />
    <template v-if="itemsTeam.length">
      <hr />
      <h1 class="pl-2 py-2">Team</h1>
      <StatisticsList :items="itemsTeam" />
    </template>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Vue, Watch } from 'vue-property-decorator';

import firebase from 'firebase/app';
type DocumentReference = firebase.firestore.DocumentReference;

import { auth, db, getUser, bindUserAndTeamDocs } from '@/firebase';
import { ClimbState, Statistic, IndexedData, User, Team } from '@/models';
import Spinner from '@/components/Spinner.vue';
import StatisticsList from '@/components/StatisticsList.vue';

@Component({
  components: { Spinner, StatisticsList },
})
export default class Statistics extends Vue {
  readonly indexedData: Partial<IndexedData> = {};
  itemsUser: Statistic[] = [];
  itemsTeam: Statistic[] = [];
  haveStats = false;
  climbDataLoaded = false;

  userRef: DocumentReference | null = null;
  readonly userDoc: Partial<User> = {};

  teamRef: DocumentReference | null = null;
  readonly teamDoc: Partial<Team> = {};

  // Takes an array where each element is a dict mapping a route to a
  // state (e.g. lead, top rope). Computes the score and other stats based
  // on this array.
  computeStats(climbsArray: Record<string, ClimbState>[]): Statistic[] {
    if (!this.indexedData.routes) throw new Error('No routes defined');

    let all = 0;
    let lead = 0;
    let topRope = 0;
    let score = 0;
    let areas: Record<string, boolean> = {};

    for (const climbs of climbsArray) {
      for (const id of Object.keys(climbs)) {
        const route = this.indexedData.routes[id];
        if (!route) {
          continue;
        }

        const state = climbs[id];
        if (state == ClimbState.LEAD) {
          lead++;
          score += route.lead;
        } else if (state == ClimbState.TOP_ROPE) {
          topRope++;
          score += route.tr;
        }
        if (state == ClimbState.LEAD || state == ClimbState.TOP_ROPE) {
          all++;
          if (route.area) areas[route.area] = true;
        }
      }
    }

    return [
      { name: 'Points', value: score },
      {
        name: 'Climbs',
        value: all,
        children: [
          { name: 'Lead', value: lead },
          { name: 'Top-rope', value: topRope },
        ],
      },
      { name: 'Areas climbed', value: Object.keys(areas).length },
    ];
  }

  @Watch('indexedData')
  @Watch('userDoc.climbs')
  @Watch('teamDoc.users')
  updateItems() {
    if (
      !this.indexedData ||
      !this.indexedData.routes ||
      !this.climbDataLoaded
    ) {
      return;
    }

    // If the user is on a team, retrieve the user stats from the team
    // climbs, and also fill in team stats.
    if (this.teamDoc && this.teamDoc.users) {
      const users = this.teamDoc.users;
      const userId = getUser().uid;
      const userClimbs = Object.keys(users).map(uid => users[uid].climbs);

      this.itemsUser = this.computeStats(
        users[userId].climbs ? [users[userId].climbs] : []
      );

      this.itemsTeam = this.computeStats(userClimbs);
    } else if (this.userDoc.climbs) {
      this.itemsUser = this.computeStats([this.userDoc.climbs]);
    }

    this.haveStats = true;
  }

  mounted() {
    this.$bind('indexedData', db.collection('global').doc('indexedData'));

    bindUserAndTeamDocs(this, getUser().uid, 'userDoc', 'teamDoc').then(
      result => {
        this.userRef = result.user;
        this.teamRef = result.team;
        this.climbDataLoaded = true;
        this.updateItems();
      },
      err => {
        console.log('Failed to bind user and team from database:', err);
      }
    );
  }
}
</script>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
}
</style>
