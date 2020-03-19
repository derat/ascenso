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
        class="mr-5"
      >
        <ClimbDropdown
          :state="info.states[route.id] || ClimbState.NOT_CLIMBED"
          :color="info.color"
          :label="info.initials"
          @update:state="onUpdateClimb(i, route.id, $event)"
        />
      </v-list-item-action>

      <v-list-item-content :class="{ filtered: isFiltered(route) }">
        <v-list-item-title class="route-title">
          <span class="name">{{ route.name }}</span>
          <a
            v-if="route.mpId"
            :href="`https://www.mountainproject.com/route/${route.mpId}`"
          >
            <v-icon class="mp-icon ml-1" :size="20">info</v-icon>
          </a>
        </v-list-item-title>
        <v-list-item-subtitle class="details">
          <span class="grade">{{ route.grade }}</span>
          <span v-if="route.height" class="height ml-3"
            >{{ route.height }} ft ({{ Math.ceil(route.height / meterFeet) }}m)
          </span>
          <v-spacer />
          <span class="points"> {{ route.lead }} ({{ route.tr }}) </span>
        </v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import {
  ClimberInfo,
  ClimbState,
  GradeIndexes,
  SetClimbStateEvent,
  Route,
} from '@/models';
import ClimbDropdown from '@/components/ClimbDropdown.vue';

@Component({
  components: { ClimbDropdown },
})
export default class RouteList extends Vue {
  @Prop(Array) readonly climberInfos!: ClimberInfo[];
  @Prop(Array) readonly routes!: Route[];

  // Minimum and maximum grades that the user plans to climb, e.g. '5.10a'.
  // Routes outside of the supplied range are visually deemphasized.
  @Prop({ validator: v => v in GradeIndexes }) minGrade?: string;
  @Prop({ validator: v => v in GradeIndexes }) maxGrade?: string;

  readonly ClimbState = ClimbState;

  // Number of feet in a meter.
  readonly meterFeet = 3.2808;

  // Indexes into the Grades array for |minGrade| and |maxGrade|, or -1 if the
  // min and/or max are not set.
  get minGradeIndex(): number {
    return this.minGrade ? GradeIndexes[this.minGrade] : -1;
  }
  get maxGradeIndex(): number {
    return this.maxGrade ? GradeIndexes[this.maxGrade] : -1;
  }

  // Handles a request to update the state of a climb.
  // |index| is the index into |climberInfos| and |route| is the route's ID.
  onUpdateClimb(index: number, route: string, state: ClimbState) {
    // Call this.$emit instead of using vue-property-decorator's @Emit since the
    // latter seems a bit weird: in addition to emitting the returned value
    // (i.e. a SetClimbStateEvent), it emits the arguments passed to this
    // function.
    this.$emit('set-climb-state', new SetClimbStateEvent(index, route, state));
  }

  // Returns true if |route| is filtered out.
  isFiltered(route: Route): boolean {
    // If we don't recognize the grade, don't filter out the route.
    const i: number | undefined = GradeIndexes[route.grade];
    if (i === undefined) return false;

    return (
      (this.minGradeIndex != -1 && i < this.minGradeIndex) ||
      (this.maxGradeIndex != -1 && i > this.maxGradeIndex)
    );
  }
}
</script>

<style scoped>
.filtered {
  opacity: 0.4;
}
.route-title {
  align-items: center;
  display: flex;
}
.name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mp-icon {
  opacity: 0.5;
}
.details {
  display: flex;
}
.height {
  opacity: 0.8;
}
</style>
