<template>
  <v-expansion-panel :expand="true">
    <v-expansion-panel-content v-for="area in areas" :key="area.name">

      <template v-slot:header>
        <div>{{area.name}}</div>
      </template>

      <v-list two-line>
        <v-list-tile
          v-for="route in area.routes"
          :key="route.name"
        >
          <v-list-tile-action>
            <ClimbDropdown v-bind:routeState=route.state />
          </v-list-tile-action>

          <v-list-tile-action>
            <ClimbDropdown v-bind:routeState=route.state />
          </v-list-tile-action>

          <v-list-tile-content>
            <v-list-tile-title>{{ route.name }}</v-list-tile-title>
            <v-list-tile-sub-title>{{ route.diff }}</v-list-tile-sub-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>

    </v-expansion-panel-content>
  </v-expansion-panel>
</template>

<script>
import ClimbState from '@/components/ClimbState.js'
import ClimbDropdown from '@/components/ClimbDropdown.vue'

export default {
  components: {
    ClimbDropdown,
  },
  data: () => ({
    areas: [
      { name: 'Pasillo',
        routes: [
          { name: 'Guaba Man', diff: '5.8', state: ClimbState.NOT_CLIMBED },
          { name: 'No Refund', diff: '5.8', state: ClimbState.NOT_CLIMBED },
          { name: 'Si, pero no', diff: '5.10a', state: ClimbState.NOT_CLIMBED },
          { name: 'Night Vision', diff: '5.10b', 
            state: ClimbState.NOT_CLIMBED },
          { name: 'Horizontal Limit', diff: '5.10d', 
            state: ClimbState.NOT_CLIMBED },
          { name: 'Explore Yosemite', diff: '5.12c/d', 
            state: ClimbState.NOT_CLIMBED },
        ]
      },
      { name: 'La Escalera',
        routes: [
          { name: 'Guerra', diff: '5.10a', state: ClimbState.NOT_CLIMBED },
          { name: 'Paz', diff: '5.7', state: ClimbState.NOT_CLIMBED },
          { name: 'Amor', diff: '5.8', state: ClimbState.NOT_CLIMBED },
          { name: "Where's the Crux", diff: '5.10c', 
            state: ClimbState.NOT_CLIMBED },
          { name: 'The Shark Attack', diff: '5.10c/d', 
            state: ClimbState.NOT_CLIMBED },
        ]
      },
    ]

  })
}
</script>
