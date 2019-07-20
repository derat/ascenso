<template>
  <v-expansion-panel v-if="loaded" :expand="true">
    <v-expansion-panel-content v-for="area in sortedData.areas" :key="area.name">
      <template v-slot:header>
        <div>{{area.name}}</div>
      </template>
      <RouteList v-bind:routes=area.routes />
    </v-expansion-panel-content>
  </v-expansion-panel>
  <v-container v-else fill-height>
    <v-layout column justify-center align-center>
      <v-progress-circular indeterminate size="48" />
    </v-layout>
  </v-container>
</template>

<script>
import { db } from '@/firebase';
import RouteList from '@/components/RouteList.vue'

export default {
  name: 'Routes',
  components: {
    RouteList,
  },
  data() {
    return {
      loaded: false,
      sortedData: {},
    }
  },
  created() {
    this.$bind('sortedData', db.collection('global').doc('sortedData'))
        .then(() => { this.loaded = true; })
        .catch((error) => { console.log('Failed to load sorted data: ', error) });
  },
}
</script>
