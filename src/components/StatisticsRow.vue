<template>
  <v-list-item class="px-0">
    <v-list-item-content>
      <!-- Don't name this class 'row', because then it picks up some garbage
           non-scoped style that adds negative padding. CSS is awful. -->
      <v-list-item-title class="stats-row">
        <span>{{ name }}</span>
        <span>{{ value }}</span>
      </v-list-item-title>
    </v-list-item-content>
  </v-list-item>
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
.stats-row {
  display: flex;
  justify-content: space-between;
}

/* This is disgusting. See https://stackoverflow.com/q/56342926/ and
   https://stackoverflow.com/q/50985783/. */
.v-list-item {
  min-height: 0;
}
>>> .v-list-item__content {
  height: auto;
  padding: 12px 0 0 0;
}
</style>
