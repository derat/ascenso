<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list two-line>
    <v-list-tile v-for="route in routes" :key="route.name">
      <v-list-tile-action v-for="(info, i) in climberInfos" :key="i">
        <ClimbDropdown
          v-bind:state="info.states[route.id] || ClimbState.NOT_CLIMBED"
          v-bind:color="info.color"
          v-bind:label="info.initials"
          @update:state="onUpdateClimb(i, route.id, $event)"
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

<script lang="ts">
import { Component, Emit, Prop, Vue } from 'vue-property-decorator';
import { ClimberInfo, ClimbState, SetClimbStateEvent, Route } from '@/models';
import ClimbDropdown from '@/components/ClimbDropdown.vue';

@Component({
  components: { ClimbDropdown },
})
export default class RouteList extends Vue {
  @Prop(Array) readonly climberInfos!: ClimberInfo[];
  @Prop(Array) readonly routes!: Route[];

  readonly ClimbState = ClimbState;

  @Emit('set-climb-state')
  onUpdateClimb(index: number, route: string, state: ClimbState) {
    return new SetClimbStateEvent(index, route, state);
  }
}
</script>

<style scoped>
.details {
  display: flex;
  justify-content: space-between;
}
</style>
