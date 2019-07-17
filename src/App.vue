<template>
  <v-app>

    <v-navigation-drawer
      v-if="signedIn()"
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

        <v-list-tile key="logout" @click="signOut()">
          <v-list-tile-action>
            <v-icon>exit_to_app</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Sign out</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>

      </v-list>
    </v-navigation-drawer>

    <v-toolbar
      v-if="signedIn()"
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
import firebase from 'firebase';

export default {
  name: 'App',
  data() {
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
  },
  methods: {
    signedIn: function() { return !!firebase.auth().currentUser; },
    signOut: function() {
      firebase.auth().signOut().then(() => {
        this.$router.replace('login');
      });
    },
  },
}
</script>
