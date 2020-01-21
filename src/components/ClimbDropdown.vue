<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-menu>
    <template v-slot:activator="{ on }">
      <v-btn
        :color="stateColor"
        class="elevation-1"
        :class="stateTextClass"
        width="48px"
        v-on="on"
      >
        {{ stateAbbrevs[syncedState] }}
      </v-btn>
    </template>
    <v-list class="climb-state-list">
      <v-list-item @click="syncedState = ClimbState.LEAD">
        <v-list-item-title>{{
          $t('ClimbDropdown.leadItem')
        }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="syncedState = ClimbState.TOP_ROPE">
        <v-list-item-title>{{
          $t('ClimbDropdown.topRopeItem')
        }}</v-list-item-title>
      </v-list-item>
      <v-list-item @click="syncedState = ClimbState.NOT_CLIMBED">
        <v-list-item-title>{{
          $t('ClimbDropdown.notClimbedItem')
        }}</v-list-item-title>
      </v-list-item>
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
      [ClimbState.LEAD]: this.$t('ClimbDropdown.leadAbbrev'),
      [ClimbState.TOP_ROPE]: this.$t('ClimbDropdown.topRopeAbbrev'),
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
.v-btn {
  /* Override 64px default: https://stackoverflow.com/q/47331310 */
  min-width: 0 !important;
}
.not-climbed-button {
  color: #ddd;
}
</style>
