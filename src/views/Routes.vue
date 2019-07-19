<template>
  <v-expansion-panel :expand="true">
    <v-expansion-panel-content v-for="area in areas" :key="area.name">
      <template v-slot:header>
        <div>{{area.name}}</div>
      </template>
      <RouteList v-bind:areaID=area.id />
    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import { db } from '@/firebase';
import RouteList from '@/components/RouteList.vue'

export default {
  components: {
    RouteList,
  },
  data() {
    return {
      areas: [],
    }
  },
  firestore: {
    // TODO: Sort by the 'sort' field.
    areas: db.collection('areas'),
  },
}
</script>
