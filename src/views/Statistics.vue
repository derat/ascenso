<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="haveStats">
    <v-tabs v-model="tab">
      <v-tab href="#team" v-if="teamCards.length" v-t="'Statistics.teamTab'" />
      <v-tab href="#user" v-t="'Statistics.individualTab'" />

      <v-tab-item key="team" value="team" v-if="teamCards.length">
        <Card
          v-for="(card, i) in teamCards"
          :key="card.name"
          :title="card.name"
          class="mt-3 mx-0"
          :class="'team-card-' + i"
        >
          <StatisticsList :items="card.items" />
        </Card>
      </v-tab-item>

      <v-tab-item key="user" value="user">
        <Card
          v-for="(card, i) in userCards"
          :key="card.name"
          :title="card.name"
          class="mt-3 mx-0"
          :class="'user-card-' + i"
        >
          <StatisticsList :items="card.items" />
        </Card>
      </v-tab-item>
    </v-tabs>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { getFirestore } from '@/firebase';
import { logError } from '@/log';
import { ClimbState, Statistic, IndexedData } from '@/models';

import Card from '@/components/Card.vue';
import Perf from '@/mixins/Perf';
import Spinner from '@/components/Spinner.vue';
import StatisticsList from '@/components/StatisticsList.vue';
import UserLoader from '@/mixins/UserLoader';

interface StatisticsCard {
  name: string;
  items: Statistic[];
}

@Component({
  components: { Card, Spinner, StatisticsList },
})
export default class Statistics extends Mixins(Perf, UserLoader) {
  readonly indexedData: Partial<IndexedData> = {};
  userCards: StatisticsCard[] = [];
  teamCards: StatisticsCard[] = [];

  indexedDataLoaded = false;
  haveStats = false;

  tab: any = null;

  // Takes an array where each element is a dict mapping a route to a
  // state (e.g. lead, top rope). Computes the score and other stats based
  // on this array.
  computeStats(climbsArray: Record<string, ClimbState>[]): StatisticsCard[] {
    if (!this.indexedData.routes) throw new Error('No routes defined');

    let all = 0;
    let lead = 0;
    let topRope = 0;
    let score = 0;
    let height = 0;
    const areas: Record<string, boolean> = {};

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
          if (route.height) height += route.height;
          if (route.area) areas[route.area] = true;
        }
      }
    }

    return [
      {
        name: this.$t('Statistics.pointsCard'),
        items: [new Statistic(this.$t('Statistics.totalPointsStat'), score)],
      },
      {
        name: this.$t('Statistics.climbsCard'),
        items: [
          new Statistic(this.$t('Statistics.totalClimbsStat'), all, [
            new Statistic(this.$t('Statistics.leadStat'), lead),
            new Statistic(this.$t('Statistics.topRopeStat'), topRope),
          ]),
          new Statistic(
            this.$t('Statistics.areasClimbedStat'),
            Object.keys(areas).length
          ),
        ],
      },
      {
        name: this.$t('Statistics.otherCard'),
        items: [new Statistic(this.$t('Statistics.heightStat'), height)],
      },
    ];
  }

  @Watch('indexedData')
  @Watch('userLoaded')
  @Watch('userDoc.climbs')
  @Watch('teamDoc.users')
  @Watch('$i18n.locale')
  updateItems(val?: any) {
    if (!this.indexedDataLoaded || !this.userLoaded) return;

    // If the user is on a team, retrieve the user stats from the team
    // climbs, and also fill in team stats.
    if (this.teamDoc && this.teamDoc.users) {
      const users = this.teamDoc.users;
      const userClimbs = Object.keys(users).map((uid) => users[uid].climbs);

      this.userCards = this.computeStats(
        users[this.user.uid].climbs ? [users[this.user.uid].climbs] : []
      );

      this.teamCards = this.computeStats(userClimbs);
    } else {
      // TODO: Should we track individual stats separately for the case where a
      // user switches teams? Probably enough of an edge case to not bother...
      this.userCards = [];
    }

    this.haveStats = true;
  }

  @Watch('haveStats')
  onHaveStats(val: boolean) {
    if (val) this.logReady('stats_loaded');
  }

  @Watch('userLoadError')
  onUserLoadError(err: Error) {
    this.$emit(
      'error-msg',
      this.$t('Statistics.failedLoadingUserOrTeamError', [err.message])
    );
    logError('stats_load_user_or_team_failed', err);
  }

  mounted() {
    getFirestore()
      .then((db) =>
        this.$bind('indexedData', db.collection('global').doc('indexedData'))
      )
      .then(() => {
        this.recordEvent('loadedIndexedData'), (this.indexedDataLoaded = true);
        this.updateItems();
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Statistics.failedLoadingRoutesError', [err])
        );
        logError('stats_bind_indexed_data_failed', err);
      });
  }
}
</script>

<style scoped>
>>> .v-tabs-items {
  /* This gross hack seems to be needed to keep the tab container from using a
   * white background that doesn't match the rest of the app's slightly-gray
   * background. */
  background-color: rgba(1, 1, 1, 0);
}
</style>
