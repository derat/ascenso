<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="haveStats">
    <v-tabs v-model="tab">
      <v-tab href="#team" v-if="teamCards.length" v-t="'Statistics.teamTab'" />
      <v-tab href="#user" v-t="'Statistics.individualTab'" />
      <v-tab
        href="#image"
        v-t="'Statistics.imageTab'"
        @change="onImageTabClick"
      />

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

      <v-tab-item key="image" value="image">
        <Card class="mt-3 mx-0">
          <img class="stats-img" :src="imageData" />
        </Card>
      </v-tab-item>
    </v-tabs>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';

import { app } from '@/firebase';
import { logError } from '@/log';
import {
  ClimbState,
  Config,
  GradeIndexes,
  IndexedData,
  Statistic,
} from '@/models';

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
  readonly config: Partial<Config> = {};
  readonly indexedData: Partial<IndexedData> = {};
  userCards: StatisticsCard[] = [];
  teamCards: StatisticsCard[] = [];

  configLoaded = false;
  indexedDataLoaded = false;
  haveStats = false;

  tab: any = null;
  imageData = '';

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
    this.$bind(
      'indexedData',
      app.firestore().collection('global').doc('indexedData')
    )
      .then(() => {
        this.recordEvent('loadedIndexedData');
        this.indexedDataLoaded = true;
        this.updateItems();
      })
      .catch((err) => {
        this.$emit(
          'error-msg',
          this.$t('Statistics.failedLoadingRoutesError', [err])
        );
        logError('stats_bind_indexed_data_failed', err);
      });

    this.$bind(
      'config',
      app.firestore().collection('global').doc('config')
    ).then(() => {
      this.recordEvent('loadedConfig');
      this.configLoaded = true;
    });
  }

  onImageTabClick() {
    // TODO: Only updating the image when its tab is activated (and when the
    // Firestore docs have also all been bound) is pretty bogus.
    this.updateImage();
  }

  // Draws individual stats to a canvas and updates |imageData|.
  updateImage() {
    if (
      !this.configLoaded ||
      !this.indexedDataLoaded ||
      !this.userLoaded ||
      !this.userDoc.name ||
      !this.teamDoc ||
      !this.teamDoc.users ||
      !this.teamDoc.users[this.user.uid]
    ) {
      return;
    }

    const routes = this.indexedData.routes || {};
    const climbs = this.teamDoc.users[this.user.uid].climbs;
    const filterClimbs = (state: ClimbState) =>
      Object.entries(climbs)
        .filter(([id, s]) => s === state && routes[id])
        .map(([id, s]) => id)
        .sort((a, b) => {
          const ga = GradeIndexes[routes[a].grade] || 0;
          const gb = GradeIndexes[routes[b].grade] || 0;
          return ga === gb
            ? routes[a].name.localeCompare(routes[b].name)
            : gb - ga;
        });
    const lead = filterClimbs(ClimbState.LEAD);
    const tr = filterClimbs(ClimbState.TOP_ROPE);

    const numClimbs = lead.length + tr.length;
    const points =
      lead.reduce((sum, id) => sum + routes[id].lead, 0) +
      tr.reduce((sum, id) => sum + routes[id].tr, 0);
    const feet = lead
      .concat(tr)
      .reduce((sum, id) => sum + (routes[id].height || 0), 0);

    const margin = 32;
    const logoHeight = 360;
    const textY = margin + logoHeight + 128;
    const fontSize = 48;
    const fontList = 'Roboto, sans-serif';
    const labelColor = '#888';
    const lineHeight = fontSize + 20;

    const numLines =
      3 + // name, points, date
      (lead.length ? 2 + lead.length : 0) + // blank line, label, routes
      (tr.length ? 2 + tr.length : 0); // blank line, label, routes

    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.width = 1080; // https://help.instagram.com/1631821640426723
    canvas.height = textY + numLines * lineHeight;

    const ctx = canvas.getContext('2d')!;

    const logo = new Image();
    logo.src = process.env.VUE_APP_LOGO_URL || '';
    logo.addEventListener('load', () => {
      const w = logo.width * (logoHeight / logo.height);
      const x = (canvas.width - w) / 2;
      ctx.drawImage(logo, x, margin, w, logoHeight);
      this.imageData = canvas.toDataURL('image/png');
    });

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px ${fontList}`;
    let lines = 0;
    const drawText = (text: string, color = 'black') => {
      ctx.fillStyle = color;
      ctx.fillText(text, margin, textY + lines * lineHeight);
      lines++;
    };

    drawText(this.userDoc.name);

    const ps = this.$tc('Statistics.imagePoints', points, { n: points });
    const cs = this.$tc('Statistics.imageClimbs', numClimbs, { n: numClimbs });
    const fs = this.$tc('Statistics.imageFeet', feet, { n: feet });
    drawText(`${ps} (${cs}, ${fs})`);

    drawText(
      this.config.startTime
        ? this.$d(this.config.startTime.toDate(), 'date')
        : new Date().getFullYear().toString()
    );

    const drawRoutes = (label: string, ids: string[]) => {
      drawText('');
      drawText(label, labelColor);
      ids.forEach((id) => {
        const r = routes[id];
        drawText(`${r.name} (${r.grade})`);
      });
    };
    drawRoutes(this.$t('Statistics.leadStat'), lead);
    drawRoutes(this.$t('Statistics.topRopeStat'), tr);
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

.stats-img {
  border: solid 1px #aaa;
  height: 100%;
  width: 100%;
}
</style>
