<template>
  <v-list-tile>
    <v-list-tile-content>
      <v-list-tile-title class="row">
        <span>{{ name }}</span>
        <span>{{ value }}</span>
      </v-list-tile-title>
    </v-list-tile-content>
  </v-list-tile>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component
export default class StatisticsRow extends Vue {
  @Prop(String) readonly name!: string;
  @Prop(Number) readonly value!: number;
}
</script>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
}
</style>
