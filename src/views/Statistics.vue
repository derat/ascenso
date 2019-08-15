<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="haveStats">
    <v-tabs v-model="tab">
      <v-tab href="#team" v-if="teamCards.length">Team</v-tab>
      <v-tab href="#user">Individual</v-tab>

      <v-tab-item key="team" value="team" v-if="teamCards.length">
        <v-container grid-list-md text-ms-center class="pt-0">
          <Card
            v-for="card in teamCards"
            :key="card.name"
            :title="card.name"
            class="mt-3"
          >
            <StatisticsList :items="card.items" />
          </Card>
        </v-container>
      </v-tab-item>

      <v-tab-item key="user" value="user">
        <v-container grid-list-md text-ms-center class="pt-0">
          <Card
            v-for="card in userCards"
            :key="card.name"
            :title="card.name"
            class="mt-3"
          >
            <StatisticsList :items="card.items" />
          </Card>
        </v-container>
      </v-tab-item>
    </v-tabs>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import firebase from 'firebase/app';
type DocumentReference = firebase.firestore.DocumentReference;

import { db, getUser, bindUserAndTeamDocs, logError } from '@/firebase';
import { ClimbState, Statistic, IndexedData, User, Team } from '@/models';
import Card from '@/components/Card.vue';
import Perf from '@/mixins/Perf.ts';
import Spinner from '@/components/Spinner.vue';
import StatisticsList from '@/components/StatisticsList.vue';

interface StatisticsCard {
  name: string;
  items: Statistic[];
}

@Component({
  components: { Card, Spinner, StatisticsList },
})
export default class Statistics extends Mixins(Perf) {
  readonly indexedData: Partial<IndexedData> = {};
  userCards: StatisticsCard[] = [];
  teamCards: StatisticsCard[] = [];

  climbDataLoaded = false;
  indexedDataLoaded = false;
  haveStats = false;

  tab: any = null;

  userRef: DocumentReference | null = null;
  readonly userDoc: Partial<User> = {};

  teamRef: DocumentReference | null = null;
  readonly teamDoc: Partial<Team> = {};

  // Takes an array where each element is a dict mapping a route to a
  // state (e.g. lead, top rope). Computes the score and other stats based
  // on this array.
  computeStats(climbsArray: Record<string, ClimbState>[]): StatisticsCard[] {
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
      { name: 'Points', items: [new Statistic('Total points', score)] },
      {
        name: 'Climbs',
        items: [
          new Statistic('Total climbs', all, [
            new Statistic('Lead', lead),
            new Statistic('Top-rope', topRope),
          ]),
          new Statistic('Areas climbed', Object.keys(areas).length),
        ],
      },
    ];
  }

  @Watch('indexedData')
  @Watch('userDoc.climbs')
  @Watch('teamDoc.users')
  updateItems() {
    if (!this.indexedDataLoaded || !this.climbDataLoaded) return;

    // If the user is on a team, retrieve the user stats from the team
    // climbs, and also fill in team stats.
    if (this.teamDoc && this.teamDoc.users) {
      const users = this.teamDoc.users;
      const userId = getUser().uid;
      const userClimbs = Object.keys(users).map(uid => users[uid].climbs);

      this.userCards = this.computeStats(
        users[userId].climbs ? [users[userId].climbs] : []
      );

      this.teamCards = this.computeStats(userClimbs);
    } else if (this.userDoc.climbs) {
      this.userCards = this.computeStats([this.userDoc.climbs]);
    }

    this.haveStats = true;
  }

  @Watch('haveStats')
  onHaveStats(val: boolean) {
    if (val) this.logReady('stats_loaded');
  }

  mounted() {
    this.$bind('indexedData', db.collection('global').doc('indexedData'))
      .then(() => {
        this.recordEvent('loadedIndexedData'), (this.indexedDataLoaded = true);
        this.updateItems();
      })
      .catch(err => {
        this.$emit('error-msg', `Failed loading routes: ${err}`);
        logError('stats_bind_indexed_data_failed', err);
      });

    bindUserAndTeamDocs(this, getUser().uid, 'userDoc', 'teamDoc')
      .then(result => {
        this.userRef = result.user;
        this.teamRef = result.team;
        this.recordEvent('loadedUserAndTeam');
        this.climbDataLoaded = true;
        this.updateItems();
      })
      .catch(err => {
        this.$emit('error-msg', `Failed loading user and team data: ${err}`);
        logError('stats_bind_user_and_team_failed', err);
      });

    // TODO: Shouldn't we technically also watch for the user switching teams?
    // See onTeamChanged() in Routes.vue.
  }
}
</script>
