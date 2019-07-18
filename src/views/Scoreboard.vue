<template>
  <v-list>
    <v-list-tile
      v-for="team in teams"
      :key="team.name"
    >
      <v-list-tile-content>
        <v-list-tile-title class="team-row">
          <span>{{ team.name }}</span>
          <span>{{ team.score }}</span>
        </v-list-tile-title>
      </v-list-tile-content>
    </v-list-tile>
  </v-list>
</template>

<script>
export default {
  data: () => ({
    teams: [
      {
        name: 'Team Rocket',
        score: 123,
      },
      {
        name: 'Team Aqua',
        score: 59,
      },
      {
        name: 'Team Magma',
        score: 23,
      },
    ],
  }),
};
</script>

<style scoped>
.team-row {
  display: flex;
  justify-content: space-between;
}
</style>
