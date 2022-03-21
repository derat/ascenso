<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="haveStats">
    <v-tabs v-model="tab">
      <v-tab href="#team" v-if="teamCards.length">
        {{ $t('Statistics.teamTab') }}
      </v-tab>
      <v-tab href="#user">{{ $t('Statistics.individualTab') }}</v-tab>
      <v-tab
        v-if="teamDoc && teamDoc.users"
        href="#image"
        @change="onImageTabClick"
      >
        {{ $t('Statistics.imageTab') }}
      </v-tab>

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

      <v-tab-item v-if="teamDoc && teamDoc.users" key="image" value="image">
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

// Aggregate statistics about a user's or team's climbs.
interface Stats {
  all: number; // total number of climbs
  lead: number; // number of lead climbs
  topRope: number; // number of top-rope climbs
  score: number; // total points
  height: number; // total feet climbed
  areas: Record<string, boolean>; // areas with climbed routs
}

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

  // Computes the score and other stats given an array of dicts mapping a route
  // to a state (e.g. lead, top rope).
  computeStats(climbsArray: Record<string, ClimbState>[]): Stats {
    if (!this.indexedData.routes) throw new Error('No routes defined');

    const stats: Stats = {
      all: 0,
      lead: 0,
      topRope: 0,
      score: 0,
      height: 0,
      areas: {},
    };

    for (const climbs of climbsArray) {
      for (const id of Object.keys(climbs)) {
        const route = this.indexedData.routes[id];
        if (!route) continue;

        const state = climbs[id];
        if (state == ClimbState.LEAD) {
          stats.lead++;
          stats.score += route.lead;
        } else if (state == ClimbState.TOP_ROPE) {
          stats.topRope++;
          stats.score += route.tr;
        }
        if (state == ClimbState.LEAD || state == ClimbState.TOP_ROPE) {
          stats.all++;
          if (route.height) stats.height += route.height;
          if (route.area) stats.areas[route.area] = true;
        }
      }
    }

    return stats;
  }

  // Computes cards to display given an array of dicts mapping a route to a
  // state (e.g. lead, top rope).
  computeCards(climbsArray: Record<string, ClimbState>[]): StatisticsCard[] {
    const stats = this.computeStats(climbsArray);

    return [
      {
        name: this.$t('Statistics.pointsCard'),
        items: [
          new Statistic(this.$t('Statistics.totalPointsStat'), stats.score),
        ],
      },
      {
        name: this.$t('Statistics.climbsCard'),
        items: [
          new Statistic(this.$t('Statistics.totalClimbsStat'), stats.all, [
            new Statistic(this.$t('Statistics.leadStat'), stats.lead),
            new Statistic(this.$t('Statistics.topRopeStat'), stats.topRope),
          ]),
          new Statistic(
            this.$t('Statistics.areasClimbedStat'),
            Object.keys(stats.areas).length
          ),
        ],
      },
      {
        name: this.$t('Statistics.otherCard'),
        items: [new Statistic(this.$t('Statistics.heightStat'), stats.height)],
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

      this.userCards = this.computeCards(
        users[this.user.uid].climbs ? [users[this.user.uid].climbs] : []
      );

      this.teamCards = this.computeCards(userClimbs);
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
      !this.teamDoc.name ||
      !this.teamDoc.users ||
      !this.teamDoc.users[this.user.uid] ||
      !this.teamDoc.users[this.user.uid].climbs
    ) {
      return;
    }

    const users = this.teamDoc.users;
    const userStats = this.computeStats([users[this.user.uid].climbs]);
    const teamStats = this.computeStats(
      Object.keys(users).map((uid) => users[uid].climbs)
    );

    const routes = this.indexedData.routes || {};
    const filterClimbs = (uid: string, state: ClimbState) =>
      Object.entries(users[uid].climbs)
        .filter(([id, s]) => s === state && routes[id])
        .map(([id, s]) => id)
        .sort((a, b) => {
          const ga = GradeIndexes[routes[a].grade] || 0;
          const gb = GradeIndexes[routes[b].grade] || 0;
          return ga === gb
            ? routes[a].name.localeCompare(routes[b].name)
            : gb - ga;
        });
    const lead = filterClimbs(this.user.uid, ClimbState.LEAD);
    const tr = filterClimbs(this.user.uid, ClimbState.TOP_ROPE);

    const margin = 32;
    const logoHeight = 360;
    const fontList = 'Roboto, sans-serif';
    const bigFontSize = 36;
    const maxRouteFontSize = 24;
    const lineHeight = 1.3333;
    const labelColor = '#888';

    let textX = margin;
    let textY = margin + logoHeight + 80;

    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.width = 1080; // https://help.instagram.com/1631821640426723
    canvas.height = 1350;

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

    const drawText = (text: string, size: number, color = 'black') => {
      ctx.font = `${size}px ${fontList}`;

      // Shrink the text if it's too wide.
      const metrics = ctx.measureText(text);
      const avail = canvas.width - textX - margin;
      if (avail > 0 && metrics.width > avail) {
        size *= avail / metrics.width;
        ctx.font = `${size}px ${fontList}`;
      }

      ctx.fillStyle = color;
      ctx.fillText(text, textX, textY);
      textY += size * lineHeight;
    };

    const drawStats = (name: string, stats: Stats) => {
      const ps = this.$tc('Statistics.imagePoints', stats.score, {
        n: stats.score,
      });
      const cs = this.$tc('Statistics.imageClimbs', stats.all, {
        n: stats.all,
      });
      drawText(`${name}: ${ps} (${cs}, ${stats.height}')`, bigFontSize);
    };
    drawStats(this.userDoc.name, userStats);
    drawStats(this.teamDoc.name, teamStats);

    drawText(
      this.config.startTime
        ? this.$d(this.config.startTime.toDate(), 'date')
        : new Date().getFullYear().toString(),
      bigFontSize
    );

    if (!lead.length && !tr.length) return;

    const lines = [] as [string, string][]; // [text, color]
    const addRoutes = (label: string, ids: string[]) => {
      if (!ids.length) return;
      if (lines.length) lines.push(['', 'black']);
      lines.push([label, labelColor]);
      for (const id of ids) {
        lines.push([`${routes[id].name} (${routes[id].grade})`, 'black']);
      }
    };
    addRoutes(this.$t('Statistics.leadStat'), lead);
    addRoutes(this.$t('Statistics.topRopeStat'), tr);

    // Scale the font size down if needed to fit all the routes in two columns.
    const routeY = textY;
    const routeLineSize = Math.min(
      maxRouteFontSize * lineHeight,
      Math.floor((canvas.height - routeY) / Math.ceil(lines.length / 2))
    );
    const routeFontSize = routeLineSize / lineHeight;

    for (const line of lines) {
      // Wrap to a second column.
      if (textX === margin && textY + routeLineSize > canvas.height) {
        textX += canvas.width / 2;
        textY = routeY;
      }
      // Skip blank lines at top.
      if (textY === routeY && !line[0]) continue;
      drawText(line[0], routeFontSize, line[1]);
    }
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
