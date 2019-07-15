<template>
  <v-app>

    <v-navigation-drawer
      v-model="drawer"
      app
    >
      <v-list>
        <v-list-tile
          v-for="item in navItems"
          v-bind:key="item.name"
        >
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-title>{{ item.name }}</v-list-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>

    <v-toolbar
      color="blue"
      app
    >
      <v-toolbar-side-icon
        @click.stop="drawer = !drawer"
        class="white--text"
      ></v-toolbar-side-icon>
      <v-toolbar-title class="white--text">Climbing competition</v-toolbar-title>
    </v-toolbar>

    <v-content>
      <Climbs/>
    </v-content>
  </v-app>
</template>

<script>
import Climbs from './components/Climbs'

export default {
  name: 'App',
  components: {
    Climbs
  },
  data () {
    return {
      drawer: null,
      navItems: [
        { name: "Climbs",
          icon: "view_list",
        },
        { name: "Scoreboard",
          icon: "assessment",
        },
        { name: "Statistics",
          icon: "score",
        },
      ],
    }
  }
}
</script>
