<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list v-if="loaded">
    <v-list-tile
      v-for="stat in stats"
      :key="stat.name"
    >
      <v-list-tile-content>
        <v-list-tile-title class="stat-row">
          <span>{{ stat.name }}</span>
          <span>{{ stat.func() }}</span>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
  <Spinner v-else />
</template>

<script>
import { auth, db } from '@/firebase';
import ClimbState from '@/components/ClimbState.js';
import Spinner from '@/components/Spinner.vue';

export default {
  components: {
    Spinner,
  },
  data() {
    return {
      // Stats rows to display.
      stats: [
        {
          name: 'Points',
          func: () => this.score,
        },
        {
          name: 'Climbs',
          func: () => this.allClimbs,
        },
        {
          name: 'Lead climbs',
          func: () => this.leadClimbs,
        },
        {
          name: 'Top-rope climbs',
          func: () => this.topRopeClimbs,
        },
      ],

      // Computed stats.
      loaded: false,
      allClimbs: 0,
      leadClimbs: 0,
      topRopeClimbs: 0,
      score: 0,

      // Firestore documents.
      indexedData: {},
      userDoc: {},
    };
  },
  watch: {
    indexedData: function() { this.updateStats() },
    userDoc: function() { this.updateStats() },
  },
  methods: {
    updateStats() {
      if (!this.userDoc || !this.userDoc.climbs ||
          !this.indexedData || !this.indexedData.routes) {
        return;
      }

      let all = 0;
      let lead = 0;
      let topRope = 0;
      let score = 0;

      for (const id in this.userDoc.climbs) {
        const route = this.indexedData.routes[id];
        if (!route) {
          continue;
        }

        const state = this.userDoc.climbs[id];
        if (state == ClimbState.LEAD) {
          all++;
          lead++;
          score += route.lead;
        } else if (state == ClimbState.TOP_ROPE) {
          all++;
          topRope++;
          score += route.tr;
        }
      }

      this.allClimbs = all;
      this.leadClimbs = lead;
      this.topRopeClimbs = topRope;
      this.score = score;
      this.loaded = true;
    },
  },
  mounted() {
    this.$bind('indexedData', db.collection('global').doc('indexedData'));
    this.$bind('userDoc', db.collection('users').doc(auth.currentUser.uid));
  },
};
</script>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
}
</style>
