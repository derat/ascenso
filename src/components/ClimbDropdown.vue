<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <!-- The "lazy" attribute here is important: rendering a bunch of
       ClimbDropdown components is significantly faster when we defer rendering
       their menus until they need to be displayed. -->
  <v-menu lazy>
    <template v-slot:activator="{ on }">
      <v-btn
        :color="stateColors[currentState]"
        class="white--text narrow-button"
        v-on="on"
      >
        {{ stateAbbrevs[currentState] }}
      </v-btn>
    </template>
    <v-list>
      <!-- Emit a "set-state" event with the requested state. -->
      <v-list-tile @click="$emit('set-state', ClimbState.LEAD)">
        <v-list-tile-title>Lead</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="$emit('set-state', ClimbState.TOP_ROPE)">
        <v-list-tile-title>Top-rope</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="$emit('set-state', ClimbState.NOT_CLIMBED)">
        <v-list-tile-title>Not climbed</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script>
import ClimbState from '@/components/ClimbState.js';

const stateColors = Object.freeze({
  [ClimbState.LEAD]: 'red',
  [ClimbState.TOP_ROPE]: 'red darken-4',
  [ClimbState.NOT_CLIMBED]: 'gray',
});

const stateAbbrevs = Object.freeze({
  [ClimbState.LEAD]: 'L',
  [ClimbState.TOP_ROPE]: 'TR',
  [ClimbState.NOT_CLIMBED]: '',
});

export default {
  props: ['currentState'],
  data: () => ({
    ClimbState: ClimbState,
    stateColors: stateColors,
    stateAbbrevs: stateAbbrevs,
  }),
};
</script>

<style scoped>
.narrow-button {
  min-width: 48px;
}
</style>
