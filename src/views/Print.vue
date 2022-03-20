<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div id="container" v-if="ready">
    <div class="header">
      <span id="compName">{{ competitionName }} {{ competitionYear }}</span>
      <span>
        <span id="teamNumSpan">{{ $t('Print.teamNumLabel') }} _____</span>
        <span>{{ $t('Print.teamNameLabel') }} ___________________________</span>
      </span>
    </div>
    <div class="header">
      <span>
        <span id="dateSpan">
          <template v-if="competitionDate">{{ competitionDate }}</template>
          <template v-else
            >{{ $t('Print.dateLabel') }} _________________</template
          >
        </span>
        <span>{{ $t('Print.timeLabel') }} ___________</span>
      </span>
      <span>
        {{ $t('Print.favoriteClimberLabel') }}
        ___________________________
      </span>
    </div>

    <div id="routes" :style="'font-size:' + routesFontSize">
      <table v-for="(areas, i) in pages" :key="i">
        <col width="40%" />
        <col width="15%" />
        <col width="15%" />
        <col width="15%" />
        <col width="15%" />
        <col width="10%" />
        <tr class="climbers">
          <td>{{ $t('Print.climberNamesLabel') }}</td>
          <td colspan="2"></td>
          <td colspan="2"></td>
          <td></td>
        </tr>
        <template v-for="area in areas">
          <tr class="head" :key="area.id">
            <td>{{ area.name }}</td>
            <td>{{ $t('Print.leadLabel') }}</td>
            <td>{{ $t('Print.topRopeLabel') }}</td>
            <td>{{ $t('Print.leadLabel') }}</td>
            <td>{{ $t('Print.topRopeLabel') }}</td>
            <td>{{ $t('Print.pointsLabel') }}</td>
          </tr>
          <tr v-for="route in area.routes" :key="route.id">
            <td>
              {{ route.name }} <span class="grade">{{ route.grade }}</span>
            </td>
            <td>☐ {{ route.lead }}</td>
            <td>☐ {{ route.tr }}</td>
            <td>☐ {{ route.lead }}</td>
            <td>☐ {{ route.tr }}</td>
            <td></td>
          </tr>
        </template>
      </table>
    </div>

    <div id="footer">{{ $t('Print.totalPointsLabel') }} _________</div>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { app } from '@/firebase';
import { Area, Config, SortedData } from '@/models';
import Spinner from '@/components/Spinner.vue';

function countRows(areas: Area[]) {
  return areas.reduce(
    (t, a) => t + (a && a.routes ? a.routes.length + 1 : 0),
    0 // initial total
  );
}

@Component({
  components: { Spinner },
})
export default class Print extends Vue {
  readonly competitionName = process.env.VUE_APP_COMPETITION_NAME;
  readonly config: Partial<Config> = {};
  readonly sortedData: Partial<SortedData> = {};

  configLoaded = false;

  // Pages of areas and routes to display.
  get pages(): Area[][] {
    if (!this.sortedData || !this.sortedData.areas) return [];

    const totalRows = countRows(this.sortedData.areas);

    // We just use two pages for now, packing areas sequentially into the first
    // page before moving to the second one. We avoid breaking up an area across
    // two pages, while preserving the area order and trying to keep the two
    // pages as balanced as possible.
    let firstRows = 0;
    const firstAreas = [];
    const secondAreas = [];
    for (const area of this.sortedData.areas) {
      if (!area || !area.routes) continue; // required by TypeScript
      const areaRows = countRows([area]);
      // If we haven't started putting areas in the second page yet, and the
      // two pages will be more balanced if we put this area on the first page
      // instead of the second, then put it on the second.
      if (!secondAreas.length && firstRows + 0.5 * areaRows < 0.5 * totalRows) {
        firstAreas.push(area);
        firstRows += areaRows;
      } else {
        secondAreas.push(area);
      }
    }
    return [firstAreas, secondAreas];
  }

  get competitionDate() {
    return this.config.startTime
      ? this.$d(this.config.startTime.toDate(), 'monthDay')
      : null;
  }

  get competitionYear() {
    return this.config.startTime
      ? this.config.startTime.toDate().getFullYear().toString()
      : new Date().getFullYear().toString();
  }

  // Dynamically-computed CSS font-size property for area and route rows.
  get routesFontSize() {
    let maxRows = 0;
    for (const areas of this.pages) {
      maxRows = Math.max(maxRows, countRows(areas));
    }

    if (maxRows == 0) return '1.5vh';

    // '1vh' is 1% of the viewport height; see
    // https://css-tricks.com/viewport-sized-typography/. We want to make the
    // route text as big as possible without overflowing the page.
    const size = Math.min(59.0 / maxRows, 1.5); // cap to header/footer size
    return size.toString() + 'vh';
  }

  get ready() {
    return this.sortedData && this.sortedData.areas && this.configLoaded;
  }

  mounted() {
    this.$bind(
      'sortedData',
      app.firestore().collection('global').doc('sortedData')
    ).catch((err) => {
      this.$emit('error-msg', `Failed loading route data: ${err}`);
    });

    this.$bind('config', app.firestore().collection('global').doc('config'))
      .then(() => {
        this.configLoaded = true;
      })
      .catch((err) => {
        this.$emit('error-msg', `Failed loading config: ${err}`);
      });
  }
}
</script>

<style scoped>
@page {
  margin: 10mm;
}
#container {
  background-color: white;
  font-family: Arial, Helvetica, sans;
  font-size: 1.5vh;
  height: 100%; /* hide Vuetify's weird light gray background */
}
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1vh;
}
#compName {
  font-weight: bold;
}
#dateSpan,
#teamNumSpan {
  padding-right: 1em;
}
#routes table {
  border: solid 1px #888;
  border-collapse: collapse;
  table-layout: fixed;
  width: 100%;
}
#routes table {
  break-before: page;
}
#routes table:first-child {
  break-before: avoid-page;
}
td {
  border: solid 1px #888;
  overflow: hidden;
  padding: 0 0.5vh;
  text-overflow: ellipsis;
  white-space: nowrap;
}
tr:nth-child(odd) {
  background-color: #f3f3f3;
}
tr.climbers td {
  background-color: white;
  font-size: 1.5vh;
  padding: 0.75vh;
}
tr.climbers td:first-child {
  border-left-style: hidden;
  border-top-style: hidden;
  padding-right: 1vh;
  text-align: right;
}
tr.climbers td:last-child {
  border-right-style: hidden;
  border-top-style: hidden;
}
tr.head td {
  background-color: #bbb;
  font-weight: bold;
}
.grade {
  color: #666;
}
#footer {
  margin-top: 1vh;
  text-align: right;
}
</style>
