<template>
  <v-app>

    <v-navigation-drawer
      v-model="drawer"
      app
    >
      <v-list>
        <v-list-tile
          v-for="item in navItems"
          v-bind:key="item.text"
          :to="{name: item.routeName}"
        >
          <v-list-tile-action>
            <v-icon>{{ item.icon }}</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>{{ item.text }}</v-list-tile-title>
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
      <router-view />
    </v-content>
  </v-app>
</template>

<script>
export default {
  name: 'App',
  data () {
    return {
      drawer: null,
      navItems: [
        { text: 'Routes',
          icon: 'view_list',
          routeName: 'routes',
        },
        { text: 'Scoreboard',
          icon: 'assessment',
          routeName: 'scores',
        },
        { text: 'Statistics',
          icon: 'score',
          routeName: 'stats',
        },
      ],
    }
  }
}
</script>
