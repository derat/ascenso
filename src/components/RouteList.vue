<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-list two-line class="py-0">
    <v-list-item
      v-for="route in routes"
      :key="route.name"
      :id="'routes-route-' + route.id"
      class="px-0"
    >
      <v-list-item-action
        v-for="(info, i) in climberInfos"
        :key="i"
        class="mr-0"
      >
        <ClimbDropdown
          :state="info.states[route.id] || ClimbState.NOT_CLIMBED"
          :color="info.color"
          :label="info.initials"
          @update:state="onUpdateClimb(i, route.id, $event)"
          class="mr-5"
        />
      </v-list-item-action>

      <v-list-item-content>
        <!-- The 'name' class here just exists for unit testing. -->
        <v-list-item-title class="name">{{ route.name }}</v-list-item-title>
        <v-list-item-subtitle class="details">
          <span class="grade">{{ route.grade }}</span>
          <span class="points"> {{ route.lead }} ({{ route.tr }}) </span>
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { ClimberInfo, ClimbState, SetClimbStateEvent, Route } from '@/models';
import ClimbDropdown from '@/components/ClimbDropdown.vue';

@Component({
  components: { ClimbDropdown },
})
export default class RouteList extends Vue {
  @Prop(Array) readonly climberInfos!: ClimberInfo[];
  @Prop(Array) readonly routes!: Route[];

  readonly ClimbState = ClimbState;

  onUpdateClimb(index: number, route: string, state: ClimbState) {
    // Call this.$emit instead of using vue-property-decorator's @Emit since the
    // latter seems a bit weird: in addition to emitting the returned value
    // (i.e. a SetClimbStateEvent), it emits the arguments passed to this
    // function.
    this.$emit('set-climb-state', new SetClimbStateEvent(index, route, state));
  }
}
</script>

<style scoped>
.details {
  display: flex;
  justify-content: space-between;
}
</style>
