<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list two-line>
    <v-list-tile
      v-for="route in routes"
      :key="route.name"
    >
      <v-list-tile-action>
        <ClimbDropdown
          v-bind:currentState="climbs[route.id] || 0"
          v-bind:routeID="route.id"
        />
      </v-list-tile-action>

      <!-- TODO: Add a second <v-list-tile-action> and <ClimbDropdown> here
        once teams are added. -->

      <v-list-tile-content>
        <v-list-tile-title>{{ route.name }}</v-list-tile-title>
        <v-list-tile-sub-title class="details">
          <span class="grade">{{ route.grade }}</span>
          <span class="points">
            {{ route.lead }} ({{ route.tr }})
          </span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
import ClimbDropdown from '@/components/ClimbDropdown.vue'

export default {
  components: {
    ClimbDropdown,
  },
  props: ['climbs', 'routes'],
}
</script>

<style scoped>
.details {
  display: flex;
  justify-content: space-between;
}
</style>
