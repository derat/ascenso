<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div>
    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-tile
          v-for="item in navItems"
          v-bind:key="item.text"
          :to="item.route ? { name: item.route } : ''"
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
      color="primary"
      app
      scroll-off-screen
      v-bind:scroll-threshold="32"
    >
      <v-toolbar-side-icon
        @click.stop="drawer = !drawer"
        color="primary"
      ></v-toolbar-side-icon>
      <!-- It's super-ugly that Vuetify seems to require hard-coding the text
           color here. Oddly, color="primary" gives us a white icon in
           <v-toolbar-side-icon> above, but it gives us black text here. -->
      <v-toolbar-title class="white--text">
        {{ config ? config.competitionName : 'Loading...' }}
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
        { text: 'Routes', icon: 'view_list', route: 'routes' },
        { text: 'Scoreboard', icon: 'assessment', route: 'scores' },
        { text: 'Statistics', icon: 'score', route: 'stats' },
        { text: 'Profile', icon: 'person', route: 'profile' },
        {
          text: 'Sign out',
          icon: 'exit_to_app',
          method: () => {
            auth.signOut().then(() => {
              this.$router.replace('login');
            });
          },
        },
      ],
    };
  },
  firestore: {
    config: db.collection('global').doc('config'),
  },
};
</script>
