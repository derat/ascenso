<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div>
    <v-navigation-drawer v-model="drawer" app>
      <v-list>
        <v-list-tile
          v-for="item in navItems"
          :key="item.text"
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

    <v-toolbar color="primary" app scroll-off-screen :scroll-threshold="32">
      <v-toolbar-side-icon
        @click.stop="drawer = !drawer"
        color="primary"
      ></v-toolbar-side-icon>
      <!-- It's super-ugly that Vuetify seems to require hard-coding the text
           color here. Oddly, color="primary" gives us a white icon in
           <v-toolbar-side-icon> above, but it gives us black text here. -->
      <v-toolbar-title class="white--text">
        {{ competitionName }}
      </v-toolbar-title>
    </v-toolbar>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';
import { getAuth } from '@/firebase';

// An entry in the navigation drawer.
interface NavItem {
  // Title to display.
  text: string;
  // Material icon name to use.
  icon: string;
  // vue-router route name to navigate to when clicked.
  route?: string;
  // Anonymous function to invoke when clicked.
  method?: () => void;
}

@Component
export default class Toolbar extends Vue {
  // Name to display in the toolbar.
  readonly competitionName = process.env.VUE_APP_COMPETITION_NAME;
  // Model for navigation drawer.
  drawer: any = null;
  // Navigation drawer entries.
  navItems: readonly NavItem[] = Object.freeze([
    { text: 'Routes', icon: 'view_list', route: 'routes' },
    { text: 'Statistics', icon: 'assessment', route: 'stats' },
    { text: 'Profile', icon: 'person', route: 'profile' },
    {
      text: 'Sign out',
      icon: 'exit_to_app',
      method: () => {
        getAuth().then(auth => {
          auth.signOut().then(() => {
            // It makes no sense to me, but this.$router produces an exception
            // here: "TypeError: Cannot read property '_router' of undefined".
            // this.$root.$router works, though...
            this.$root.$router.replace('login');
          });
        });
      },
    },
  ]);
}
</script>
