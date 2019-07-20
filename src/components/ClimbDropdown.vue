<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-menu class="mr-3">
    <template v-slot:activator="{ on }">
      <v-btn
        :color="states[routeState].color"
        class="white--text narrow-button"
        v-on="on"
      >
        {{ states[routeState].abbrev }}
      </v-btn>
    </template>
    <v-list>
      <!-- TODO: support passing in the variable to bind to state -->
      <v-list-tile
        v-for="state in orderedStates"
        :key="state"
        @click="routeState = state"
      >
        <v-list-tile-title>{{ states[state].name }}</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script>
import ClimbState from './ClimbState.js'

export default {
  props: ['routeState'],
  data: () => ({
    states: [
      {
        name: 'Not climbed',
        abbrev: '',
        color: 'gray'
      },
      {
        name: 'Lead',
        abbrev: 'L',
        color: 'red darken-4'
      },
      {
        name: 'Top-rope',
        abbrev: 'TR',
        color: 'red'
      }
    ],
    orderedStates: [
      ClimbState.LEAD,
      ClimbState.TOP_ROPE,
      ClimbState.NOT_CLIMBED
    ],
  })
}
</script>

<style>
.narrow-button {
  min-width: 48px;
}
</style>
