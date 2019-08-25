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
        :color="stateColor"
        class="narrow-button elevation-1"
        :class="stateTextClass"
        v-on="on"
      >
        {{ stateAbbrevs[syncedState] }}
      </v-btn>
    </template>
    <v-list class="climb-state-list">
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
  // Identifying text (e.g. the climber's initials) to display in the button
  // when the route hasn't been climbed.
  @Prop(String) readonly label!: string;

  readonly ClimbState = ClimbState;

  get stateAbbrevs() {
    return {
      [ClimbState.LEAD]: 'L',
      [ClimbState.TOP_ROPE]: 'TR',
      [ClimbState.NOT_CLIMBED]: this.label,
    };
  }

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

  get stateTextClass() {
    return this.syncedState == ClimbState.NOT_CLIMBED
      ? 'not-climbed-button'
      : 'white--text';
  }
}
</script>

<style scoped>
.narrow-button {
  min-width: 48px;
}
.not-climbed-button {
  color: #ddd;
}
</style>
