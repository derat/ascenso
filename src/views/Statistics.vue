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

      <v-tab-item key="team" value="team" v-if="teamCards.length" class="mt-3">
        <Card
          v-for="(card, i) in teamCards"
          :key="card.name"
          :title="card.name"
          class="mx-0"
          :class="{
            ['team-card-' + i]: true,
            ['mb-n6']: i < teamCards.length - 1,
            ['mb-1']: i === teamCards.length - 1,
          }"
        >
          <StatisticsList :items="card.items" />
        </Card>
      </v-tab-item>

      <v-tab-item key="user" value="user" class="mt-3">
        <Card
          v-for="(card, i) in userCards"
          :key="card.name"
          :title="card.name"
          class="mx-0"
          :class="{
            ['user-card-' + i]: true,
            ['mb-n6']: i < userCards.length - 1,
            ['mb-1']: i === userCards.length - 1,
          }"
        >
          <StatisticsList :items="card.items" />
        </Card>
      </v-tab-item>

      <v-tab-item
        v-if="teamDoc && teamDoc.users"
        key="image"
        value="image"
        class="mt-3"
      >
        <Card class="mx-0">
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
    if (this.teamDoc?.users) {
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
    // Firestore docs have also all been bound) is pretty bogus, but it seems
    // safer than running this hacky code unconditionally whenever the
    // Statistics view is mounted.
    this.updateImage();
  }

  // Draws individual stats to a canvas and asynchronously updates |imageData|.
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

    const margin = 48;
    const logoHeight = 360;
    const logoColor = '#fbc02d';
    const logoBottomMargin = 80;
    const bgStartColor = '#01579b';
    const bgEndColor = '#002f6c';
    const borderColor = '#fff3';
    const borderWidth = margin / 8;
    const borderRadius = 32;
    const routeFillColor = '#0003';
    const routeRadius = 24;
    const fontList = 'Roboto, sans-serif';
    const textColor = '#fff';
    const labelColor = '#fffa';
    const bigFontSize = 36;
    const maxRouteFontSize = 24;
    const lineHeight = 1.3333;

    const canvas = document.createElement('canvas') as HTMLCanvasElement;
    canvas.width = 1080; // https://help.instagram.com/1631821640426723
    canvas.height = 1350;

    const ctx = canvas.getContext('2d')!;

    // Load the logo and render the completed image asynchronously.
    const logo = new Image();
    logo.src = '/assets/logo.png';
    logo.addEventListener('load', () => {
      const w = logo.width * (logoHeight / logo.height);
      const x = (canvas.width - w) / 2;

      // Draw the logo to a different canvas so we can change its color before
      // drawing it to the main canvas: https://stackoverflow.com/a/4231508
      const buf = document.createElement('canvas') as HTMLCanvasElement;
      buf.width = logo.width;
      buf.height = logo.height;
      const bctx = buf.getContext('2d')!;
      bctx.fillStyle = logoColor;
      bctx.fillRect(0, 0, buf.width, buf.height);
      bctx.globalCompositeOperation = 'destination-atop';
      bctx.drawImage(logo, 0, 0);

      ctx.drawImage(buf, x, margin, w, logoHeight);
      this.imageData = canvas.toDataURL('image/png');
    });

    // Fill the image with a gradient.
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, canvas.height);
    gradient.addColorStop(0, bgStartColor);
    gradient.addColorStop(1, bgEndColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw a rounded border around the image.
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    roundRect(
      ctx,
      margin / 2,
      margin / 2,
      canvas.width - margin,
      canvas.height - margin,
      borderRadius,
      true /* stroke */
    );

    let textX = margin;
    let textY = margin + logoHeight + logoBottomMargin;

    const drawText = (
      text: string,
      size: number,
      color: string,
      center = false,
      maxWidth = canvas.width - margin - textX
    ) => {
      ctx.font = `${size}px ${fontList}`;

      let x = textX;

      // Shrink the text if it's too wide.
      const metrics = ctx.measureText(text);
      if (maxWidth > 0 && metrics.width > maxWidth) {
        size *= maxWidth / metrics.width;
        ctx.font = `${size}px ${fontList}`;
      } else if (center) {
        x += (maxWidth - metrics.width) / 2;
      }

      ctx.fillStyle = color;
      ctx.fillText(text, x, textY);
      textY += size * lineHeight;
    };

    // Draw the climber's name and stats and the team's name and stats.
    const drawStats = (name: string, stats: Stats) => {
      const ps = this.$tc('Statistics.imagePoints', stats.score, {
        n: stats.score,
      });
      const cs = this.$tc('Statistics.imageClimbs', stats.all, {
        n: stats.all,
      });
      drawText(
        `${name}: ${ps} (${cs}, ${stats.height}')`,
        bigFontSize,
        textColor,
        true /* center */
      );
    };
    drawStats(this.userDoc.name, userStats);
    drawStats(this.teamDoc.name, teamStats);

    // Draw the competition date.
    drawText(
      this.config.startTime
        ? this.$d(this.config.startTime.toDate(), 'date')
        : new Date().getFullYear().toString(),
      bigFontSize,
      textColor,
      true /* center */
    );

    if (!lead.length && !tr.length) return;

    // Draw a rounded rect that will contain the route list.
    ctx.fillStyle = routeFillColor;
    roundRect(
      ctx,
      margin,
      textY,
      canvas.width - 2 * margin,
      canvas.height - textY - margin,
      routeRadius
    );

    textX += 0.5 * margin;
    textY += margin;

    const lines = [] as [string, string][]; // [text, color]
    const addRoutes = (label: string, ids: string[]) => {
      if (!ids.length) return;
      if (lines.length) lines.push(['', textColor]);
      lines.push([label, labelColor]);
      for (const id of ids) {
        lines.push([`${routes[id].name} (${routes[id].grade})`, textColor]);
      }
    };
    addRoutes(this.$t('Statistics.leadStat'), lead);
    addRoutes(this.$t('Statistics.topRopeStat'), tr);

    // Scale the font size down if needed to fit all the routes in two columns.
    const routeY = textY;
    const routeHeight = canvas.height - margin - routeY;
    const routeLineSize = Math.min(
      maxRouteFontSize * lineHeight,
      Math.floor(routeHeight / Math.ceil(lines.length / 2))
    );
    const routeFontSize = routeLineSize / lineHeight;

    // Draw the routes.
    for (const line of lines) {
      // Wrap to a second column.
      if (
        textX < canvas.width / 2 &&
        textY + routeLineSize > canvas.height - margin
      ) {
        textX = canvas.width / 2 + margin;
        textY = routeY;
      }
      // Skip blank lines at top.
      if (textY === routeY && !line[0]) continue;
      drawText(line[0], routeFontSize, line[1]);
    }
  }
}

// It seems pretty ridiculous that <canvas> doesn't let you specify a border
// radius when drawing a rectangle. This function is swiped from
// http://js-bits.blogspot.com/2010/07/canvas-rounded-corner-rectangles.html.
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  stroke = false // fill if false
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
  stroke ? ctx.stroke() : ctx.fill();
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
