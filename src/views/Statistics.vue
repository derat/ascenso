<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <StatisticsList v-if="loaded" :items="items" />
  <Spinner v-else />
</template>

<script>
import { auth, db } from '@/firebase';
import { ClimbState } from '@/climbs';
import Spinner from '@/components/Spinner.vue';
import StatisticsList from '@/components/StatisticsList.vue';

export default {
  components: {
    Spinner,
    StatisticsList,
  },
  data() {
    return {
      indexedData: {},
      items: [],
      loaded: false,
      userDoc: {},
    };
  },
  watch: {
    indexedData: function() {
      this.updateItems();
    },
    userDoc: function() {
      this.updateItems();
    },
  },
  methods: {
    updateItems() {
      if (
        !this.userDoc ||
        !this.userDoc.climbs ||
        !this.indexedData ||
        !this.indexedData.routes
      ) {
        return;
      }

      let all = 0;
      let lead = 0;
      let topRope = 0;
      let score = 0;
      let areas = {};

      for (const id in this.userDoc.climbs) {
        const route = this.indexedData.routes[id];
        if (!route) {
          continue;
        }

        const state = this.userDoc.climbs[id];
        if (state == ClimbState.LEAD) {
          lead++;
          score += route.lead;
        } else if (state == ClimbState.TOP_ROPE) {
          topRope++;
          score += route.tr;
        }
        if (state == ClimbState.LEAD || state == ClimbState.TOP_ROPE) {
          all++;
          areas[route.area] = true;
        }
      }

      this.items = [
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
