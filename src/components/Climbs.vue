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
            <v-menu class="mr-3">
              <template v-slot:activator="{ on }">
                <v-btn
                  :color="states[route.state].color"
                  class="white--text"
                  v-on="on"
                >
                  {{ states[route.state].abbrev }}
                </v-btn>
              </template>
              <v-list>
                <v-list-tile
                  v-for="state in orderedStates"
                  :key="state"
                  @click="route.state = state"
                >
                  <v-list-tile-title>{{ states[state].name }}</v-list-tile-title>
                </v-list-tile>
              </v-list>
            </v-menu>
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
const NOT_CLIMBED = 0;
const LEAD = 1;
const TOP_ROPE = 2;

export default {
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
      LEAD,
      TOP_ROPE,
      NOT_CLIMBED
    ],
    areas: [
      { name: 'Pasillo',
        routes: [
          { name: 'Guaba Man', diff: '5.8', state: NOT_CLIMBED },
          { name: 'No Refund', diff: '5.8', state: NOT_CLIMBED },
          { name: 'Si, pero no', diff: '5.10a', state: NOT_CLIMBED },
          { name: 'Night Vision', diff: '5.10b', state: NOT_CLIMBED },
          { name: 'Horizontal Limit', diff: '5.10d', state: NOT_CLIMBED },
          { name: 'Explore Yosemite', diff: '5.12c/d', state: NOT_CLIMBED },
        ]
      },
      { name: 'La Escalera',
        routes: [
          { name: 'Guerra', diff: '5.10a', state: NOT_CLIMBED },
          { name: 'Paz', diff: '5.7', state: NOT_CLIMBED },
          { name: 'Amor', diff: '5.8', state: NOT_CLIMBED },
          { name: "Where's the Crux", diff: '5.10c', state: NOT_CLIMBED },
          { name: 'The Shark Attack', diff: '5.10c/d', state: NOT_CLIMBED },
        ]
      },
    ]

  })
}
</script>
