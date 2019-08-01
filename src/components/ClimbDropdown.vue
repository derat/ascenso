<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <!-- The "lazy" attribute here is important: rendering a bunch of
       ClimbDropdown components is significantly faster when we defer rendering
       their menus until they need to be displayed. -->
  <v-menu lazy>
    <template v-slot:activator="{ on }">
      <v-btn :color="stateColor" class="white--text narrow-button" v-on="on">
        {{ stateAbbrevs[syncedState] }}
      </v-btn>
    </template>
    <v-list>
      <v-list-tile @click="syncedState = ClimbState.LEAD">
        <v-list-tile-title>Lead</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="syncedState = ClimbState.TOP_ROPE">
        <v-list-tile-title>Top-rope</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="syncedState = ClimbState.NOT_CLIMBED">
        <v-list-tile-title>Not climbed</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script lang="ts">
import { Component, Prop, PropSync, Vue } from 'vue-property-decorator';
import { ClimbState } from '@/models';

@Component
export default class ClimbDropdown extends Vue {
  // The current state of the climb.
  @PropSync('state', { type: Number }) syncedState!: ClimbState;
  // The button's 'color' property for the 'lead' state.
  // See https://vuetifyjs.com/en/styles/colors.
  @Prop(String) readonly color!: string;

  readonly ClimbState = ClimbState;
  readonly stateAbbrevs: Record<ClimbState, string> = Object.freeze({
    [ClimbState.LEAD]: 'L',
    [ClimbState.TOP_ROPE]: 'TR',
    [ClimbState.NOT_CLIMBED]: '',
  });

  get stateColor() {
    switch (this.syncedState) {
      case ClimbState.LEAD:
        return this.color;
      case ClimbState.TOP_ROPE:
        return this.color + ' lighten-3';
      default:
        return 'grey lighten-4';
    }
  }
}
</script>

<style scoped>
.narrow-button {
  min-width: 48px;
}
</style>
