<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list two-line>
    <v-list-tile v-for="route in routes" :key="route.name">
      <v-list-tile-action v-for="(climbs, i) in climbMaps" :key="i">
        <ClimbDropdown
          v-bind:currentState="climbs[route.id] || ClimbState.NOT_CLIMBED"
          v-bind:color="climbColors[i]"
          @set-state="onSetState(i, route.id, $event)"
          class="mr-3"
        />
      </v-list-tile-action>

      <!-- Add a left margin if there aren't any climb drop-downs. -->
      <v-list-tile-content v-bind:class="[{ 'ml-3': !climbMaps.length }]">
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
import ClimbDropdown from '@/components/ClimbDropdown.vue';
import ClimbState from '@/components/ClimbState.js';

export default {
  components: {
    ClimbDropdown,
  },
  props: {
    // Array of objects mapping from route ID to climb state in the order in
    // which climb drop-down menus should be displayed. If empty, no menus are
    // displayed.
    climbMaps: Array,
    // Array containing color strings to use for climb drop-down menus. Each
    // entry here corresponds to the entry in climbMaps with the same index.
    climbColors: Array,
    // Array of objects describing routes to display. See the
    // /globals/sortedData Firestore doc.
    routes: Array,
  },
  data: () => ({
    ClimbState: ClimbState,
  }),
  methods: {
    // Emits a "set-state" event consisting of an object with an index into
    // climbMaps, the route ID, and the requested state.
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
