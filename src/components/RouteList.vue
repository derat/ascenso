<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list two-line>
    <v-list-tile v-for="route in routes" :key="route.name">
      <v-list-tile-action v-for="(info, i) in climberInfos" :key="i">
        <ClimbDropdown
          v-bind:currentState="info.states[route.id] || ClimbState.NOT_CLIMBED"
          v-bind:color="info.color"
          @set-state="onSetState(i, route.id, $event)"
          class="mr-3"
        />
      </v-list-tile-action>

      <!-- Add a left margin if there aren't any climb drop-downs. -->
      <v-list-tile-content v-bind:class="[{ 'ml-3': !climberInfos.length }]">
        <v-list-tile-title>{{ route.name }}</v-list-tile-title>
        <v-list-tile-sub-title class="details">
          <span class="grade">{{ route.grade }}</span>
          <span class="points"> {{ route.lead }} ({{ route.tr }}) </span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
import { ClimbState } from '@/climbs';
import ClimbDropdown from '@/components/ClimbDropdown.vue';

export default {
  components: {
    ClimbDropdown,
  },
  props: {
    // Array of ClimberInfo objects.
    climberInfos: Array,
    // Array of objects describing routes to display. See the
    // /globals/sortedData Firestore doc.
    routes: Array,
  },
  data: () => ({
    ClimbState: ClimbState,
  }),
  methods: {
    // Emits a "set-state" event consisting of an object with an index into
    // climberInfos, the route ID, and the requested state.
    onSetState(index, route, state) {
      this.$emit('set-state', { index, route, state });
    },
  },
};
</script>

<style scoped>
.details {
  display: flex;
  justify-content: space-between;
}
</style>
