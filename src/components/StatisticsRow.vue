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

<script>
export default {
  props: ['name', 'value'],
}
</script>

<style scoped>
.row {
  display: flex;
  justify-content: space-between;
}
</style>
