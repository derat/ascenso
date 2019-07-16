<template>
  <v-list>
    <v-list-tile
      v-for="stat in stats"
      :key="stat.name"
    >
      <v-list-tile-content>
        <v-list-tile-title class="stat-row">
          <span>{{ stat.name }}</span>
          <span>{{ stat.value }}</span>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
export default {
  data: () => ({
    stats: [
      {
        name: 'Number of climbs',
        value: 123,
      },
      {
        name: 'Total height',
        value: '1500 feet',
      },
    ],
  }),
};
</script>

<style>
.stat-row {
  display: flex;
  justify-content: space-between;
}
</style>
