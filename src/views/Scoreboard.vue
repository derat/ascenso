<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list>
    <v-list-tile v-for="team in teams" :key="team.name">
      <v-list-tile-content>
        <v-list-tile-title class="team-row">
          <span>{{ team.name }}</span>
          <span>{{ team.score }}</span>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

interface TeamData {
  name: string;
  score: number;
}

@Component({})
export default class Scoreboard extends Vue {
  // TODO: Display real data.
  readonly teams: TeamData[] = [
    {
      name: 'Team Rocket',
      score: 123,
    },
    {
      name: 'Team Aqua',
      score: 59,
    },
    {
      name: 'Team Magma',
      score: 23,
    },
  ];
}
</script>

<style scoped>
.team-row {
  display: flex;
  justify-content: space-between;
}
</style>
