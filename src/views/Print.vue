<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div id="container" v-if="ready">
    <div id="header">
      <span id="compName">{{ competitionName }}</span>
      <span># _____</span>
      <span>Team Name ___________________</span>
      <span>Member #1 ___________________</span>
      <span>Member #2 ___________________</span>
      <!-- Do we need an 'Hora' field to match the original scorecard? -->
      <span>Favorite Route ___________________</span>
    </div>

    <div id="routes" :style="'font-size:' + routesFontSize">
      <table v-for="(areas, i) in columns" :key="i">
        <template v-for="area in areas">
          <tr class="head" :key="area.id">
            <td>{{ area.name }}</td>
            <td>Lead</td>
            <td>Initials</td>
            <td>Lead</td>
            <td>Initials</td>
            <td>TR</td>
            <td>Initials</td>
            <td>Points</td>
          </tr>
          <tr v-for="route in area.routes" :key="route.id">
            <td>
              {{ route.name }} <span class="grade">{{ route.grade }}</span>
            </td>
            <td>☐ {{ route.lead }}</td>
            <td></td>
            <td>☐ {{ route.lead }}</td>
            <td></td>
            <td>☐ {{ route.tr }}</td>
            <td></td>
            <td></td>
          </tr>
        </template>
      </table>
    </div>

    <div id="footer">Total Points _________</div>
  </div>
  <Spinner v-else />
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { app } from '@/firebase';
import { Area, SortedData } from '@/models';
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
  readonly sortedData: Partial<SortedData> = {};

  // Columns of areas and routes to display.
  get columns(): Area[][] {
    if (!this.sortedData || !this.sortedData.areas) return [];

    const totalRows = countRows(this.sortedData.areas);

    // We just use two columns for now, packing areas sequentially into the left
    // column before moving to the right one. We avoid breaking up an area
    // across two columns, while preserving the area order and trying to keep
    // the two columns as balanced as possible.
    let leftRows = 0;
    const leftAreas = [];
    const rightAreas = [];
    for (const area of this.sortedData.areas) {
      if (!area || !area.routes) continue; // required by TypeScript
      const areaRows = countRows([area]);
      // If we haven't started putting areas in the right column yet, and the
      // two columns will be more balanced if we put this area on the left
      // instead of the right, then put it on the left.
      if (!rightAreas.length && leftRows + 0.5 * areaRows < 0.5 * totalRows) {
        leftAreas.push(area);
        leftRows += areaRows;
      } else {
        rightAreas.push(area);
      }
    }
    return [leftAreas, rightAreas];
  }

  // Dynamically-computed CSS font-size property for area and route rows.
  get routesFontSize() {
    let maxRows = 0;
    for (const areas of this.columns) {
      maxRows = Math.max(maxRows, countRows(areas));
    }

    if (maxRows == 0) return '1.5vh';

    // '1vh' is 1% of the viewport height; see
    // https://css-tricks.com/viewport-sized-typography/. We want to make the
    // route text as big as possible without overflowing the page. 60 seems
    // about right here given the amount of space needed for the header and
    // footer and the padding between rows.
    const size = Math.min(60.0 / maxRows, 1.5); // cap to header/footer size
    return size.toString() + 'vh';
  }

  get ready() {
    return this.sortedData && this.sortedData.areas;
  }

  mounted() {
    this.$bind(
      'sortedData',
      app.firestore().collection('global').doc('sortedData')
    ).catch((err) => {
      this.$emit('error-msg', `Failed loading route data: ${err}`);
    });
  }
}
</script>

<style scoped>
@page {
  margin: 5mm;
}
#container {
  background-color: white;
  font-family: Arial, Helvetica, sans;
  font-size: 1.5vh;
  height: 100%; /* hide Vuetify's weird light gray background */
}
#header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 1vh;
}
#compName {
  font-weight: bold;
}
#routes {
  display: flex;
  justify-content: space-between;
}
#routes table {
  border: solid 1px #888;
  border-collapse: collapse;
  table-layout: fixed;
  width: calc(50% - 2.5mm); /* same space between as page margin */
}
td {
  border: solid 1px #888;
  overflow: hidden;
  padding: 0 0.5vh;
  text-overflow: ellipsis;
  white-space: nowrap;
}
td:nth-child(1) {
  /* route/area name */
  width: 40%;
}
td:nth-child(2),
td:nth-child(4),
td:nth-child(6) {
  /* lead and tr checkboxes */
  width: 7%;
}
td:nth-child(3),
td:nth-child(5),
td:nth-child(7),
td:nth-child(8) {
  /* initials and points fields */
  width: 9%;
}
tr:nth-child(odd) {
  background-color: #f3f3f3;
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
