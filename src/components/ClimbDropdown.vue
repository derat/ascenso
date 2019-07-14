<template>
  <v-menu class="mr-3">
    <template v-slot:activator="{ on }">
      <v-btn
        :color="states[route_state].color"
        class="white--text"
        v-on="on"
      >
        {{ states[route_state].abbrev }}
      </v-btn>
    </template>
    <v-list>
      <v-list-tile
        v-for="state in orderedStates"
        :key="state"
        @click="route_state = state"
      >
        <v-list-tile-title>{{ states[state].name }}</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script>
import { ClimbState } from './ClimbState.js'

export default {
  props: ['route_state'],
  data: () => ({
    states: [
      {
        name: 'Not climbed',
        abbrev: '',
        color: 'gray'
      },
      {
        name: 'Lead',
        abbrev: 'L',
        color: 'red'
      },
      {
        name: 'Top-rope',
        abbrev: 'TR',
        color: 'purple'
      }
    ],
    orderedStates: [
      ClimbState.LEAD,
      ClimbState.TOP_ROPE,
      ClimbState.NOT_CLIMBED
    ],
  })
}


</script>

