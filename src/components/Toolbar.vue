<template>
  <div>
    <v-navigation-drawer
      v-model="drawer"
      app
    >
      <v-list>
        <v-list-tile
          v-for="item in navItems"
          v-bind:key="item.text"
          :to="item.route ? {name: item.route} : ''"
          v-on="item.method ? { click: item.method } : null"
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
      <v-toolbar-title class="white--text">
        {{ config ? config.competitionName : 'Loading...'}}
      </v-toolbar-title>
    </v-toolbar>
  </div>
</template>

<script>
import { auth, db } from '@/firebase';

export default {
  data() {
    return {
      config: null,
      drawer: null,
      navItems: [
        { text: 'Routes',
          icon: 'view_list',
          route: 'routes',
        },
        { text: 'Scoreboard',
          icon: 'assessment',
          route: 'scores',
        },
        { text: 'Statistics',
          icon: 'score',
          route: 'stats',
        },
        { text: 'Sign out',
          icon: 'exit_to_app',
          method: () => {
            auth.signOut().then(() => { this.$router.replace('login'); });
          },
        },
      ],
    }
  },
  firestore: {
    config: db.collection('global').doc('config'),
  },
}
</script>
