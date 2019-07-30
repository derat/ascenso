<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div v-if="loaded">
    <h1 class="pl-2 py-2">You</h1>
    <StatisticsList :items="itemsUser" />
    <hr>
    <h1 class="pl-2 py-2" v-if="itemsTeam.length">Team</h1>
    <StatisticsList v-if="loaded" :items="itemsTeam" />
  </div>
  <Spinner v-else />
</template>

<script>
import { auth, db } from '@/firebase';
import { ClimbState } from '@/climbs';
import Spinner from '@/components/Spinner.vue';
import StatisticsList from '@/components/StatisticsList.vue';
import { bindUserAndTeamDocs } from '@/users';

export default {
  components: {
    Spinner,
    StatisticsList,
  },
  data() {
    return {
      indexedData: {},
      itemsUser: [],
      itemsTeam: [],
      loaded: false,
      userDoc: {},
      teamDoc: {},
    };
  },
  watch: {
    indexedData: function() {
      this.updateItems();
    },
    'userDoc.climbs' : function() {
      this.updateItems();
    },

    'teamDoc.users' : function() {
      this.updateItems();
    },
  },
  methods: {
    computeStats(climbsArray) {
      let all = 0;
      let lead = 0;
      let topRope = 0;
      let score = 0;
      let areas = {};

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
            areas[route.area] = true;
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
    },

    updateItems() {
      if (!this.userDoc || !this.indexedData || !this.indexedData.routes) {
        return;
      }

      // If the user is on a team, retrieve the user stats from the team
      // climbs, and also fill in team stats.
      if (this.teamDoc && this.teamDoc.users) {
        // Compute the stats for the user.
        this.itemsUser = this.computeStats([this.teamDoc.users[
          auth.currentUser.uid].climbs]);

        // Compute the stats for the whole team.
        let userClimbs = [];
        for (const userId of Object.keys(this.teamDoc.users)) {
          userClimbs.push(this.teamDoc.users[userId].climbs);
        }

        this.itemsTeam = this.computeStats(userClimbs);
      } else if (this.userDoc.climbs) {
        // Compute the stats for the user.
        this.itemsUser = this.computeStats([this.userDoc.climbs]);
      }

      this.loaded = true;
    },
  },
  mounted() {
    this.$bind('indexedData', db.collection('global').doc('indexedData'));
    bindUserAndTeamDocs(this, auth.currentUser.uid, 'userDoc', 'teamDoc');
  },
};
</script>

<style scoped>
.stat-row {
  display: flex;
  justify-content: space-between;
}
</style>
