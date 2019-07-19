<template>
  <v-list two-line>
    <v-list-tile
      v-for="route in routes"
      :key="route.name"
    >
      <v-list-tile-action>
        <!-- TODO: Need to get the route state from somewhere. -->
        <ClimbDropdown v-bind:routeState=0 />
      </v-list-tile-action>

      <v-list-tile-action>
        <!-- TODO: Need to get the route state from somewhere. -->
        <ClimbDropdown v-bind:routeState=0 />
      </v-list-tile-action>

      <v-list-tile-content>
        <v-list-tile-title>{{ route.name }}</v-list-tile-title>
        <v-list-tile-sub-title class="details">
          <span class="grade">{{ route.grade }}</span>
          <span class="points">
            {{ route.pointsLead }} ({{ route.pointsTopRope }})
          </span>
        </v-list-tile-sub-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
import { db } from '@/firebase';
import ClimbDropdown from '@/components/ClimbDropdown.vue'

const areas = db.collection('areas');

export default {
  components: {
    ClimbDropdown,
  },
  props: ['areaID'],
  data() {
    return {
      routes: [],
    }
  },
  watch: {
    areaID: {
      immediate: true,
      handler(areaID) {
        // TODO: Sort by the 'sort' field.
        this.$bind('routes', areas.doc(areaID).collection('routes'));
      },
    },
  },
}
</script>

<style scoped>
.details {
  display: flex;
  justify-content: space-between;
}
</style>
