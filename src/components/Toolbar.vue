<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div>
    <v-navigation-drawer ref="drawer" v-model="drawer" app>
      <v-list>
        <template v-for="(item, index) in navItems">
          <v-divider
            v-if="item.divider"
            :key="`divider-${index}`"
            class="my-2"
          />
          <!-- Note that v-list-tile extends router-link:
               https://stackoverflow.com/q/47586022. -->
          <v-list-tile
            v-else
            :id="item.id"
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
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-toolbar color="primary" app scroll-off-screen :scroll-threshold="32">
      <v-toolbar-side-icon
        id="toolbar-menu-icon"
        ref="toolbarIcon"
        @click.stop="drawer = !drawer"
        color="primary"
      ></v-toolbar-side-icon>
      <!-- It's super-ugly that Vuetify seems to require hard-coding the text
           color here. Oddly, color="primary" gives us a white icon in
           <v-toolbar-side-icon> above, but it gives us black text here. -->
      <v-toolbar-title class="white--text">{{ title }}</v-toolbar-title>
      <v-spacer />
      <slot></slot>
    </v-toolbar>

    <!-- "Sign out" dialog -->
    <v-dialog
      ref="signOutDialog"
      v-model="signOutDialogShown"
      max-width="320px"
    >
      <DialogCard title="Sign out">
        <v-card-text>
          Are you sure you want to sign out?
        </v-card-text>

        <v-card-actions>
          <v-btn flat @click="signOutDialogShown = false">
            Cancel
          </v-btn>
          <v-spacer />
          <v-btn
            flat
            color="error"
            id="toolbar-sign-out-confirm-button"
            ref="signOutConfirmButton"
            @click="signOut"
          >
            Sign out
          </v-btn>
        </v-card-actions>
      </DialogCard>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { getAuth } from '@/firebase';
import DialogCard from '@/components/DialogCard.vue';

// An entry in the navigation drawer.
interface NavItem {
  // If true, display a divider instead of an item.
  divider?: boolean;
  // Title to display.
  text?: string;
  // Material icon name to use.
  icon?: string;
  // vue-router route name to navigate to when clicked.
  route?: string;
  // Method on Toolbar component to invoke when clicked.
  // Note that things seem to go haywire if you try to pass an anonymous
  // function here instead -- just define a method on Toolbar and pass an
  // unbound reference to it.
  method?: () => void;
}

@Component({
  components: { DialogCard },
})
export default class Toolbar extends Vue {
  // Name to display in the toolbar.
  @Prop(String) readonly title!: string;
  // Model for navigation drawer.
  drawer: any = null;
  // Whether the "Sign out" dialog is shown.
  signOutDialogShown = false;

  // Navigation drawer entries.
  navItems: readonly NavItem[] = Object.freeze([
    {
      id: 'toolbar-routes',
      text: 'Routes',
      icon: 'view_list',
      route: 'routes',
    },
    {
      id: 'toolbar-stats',
      text: 'Statistics',
      icon: 'assessment',
      route: 'stats',
    },
    {
      id: 'toolbar-profile',
      text: 'Profile',
      icon: 'person',
      route: 'profile',
    },
    { divider: true },
    {
      id: 'toolbar-sign-out',
      text: 'Sign out',
      icon: 'exit_to_app',
      method: this.onSignOutNav,
    },
  ]);

  // Handles the "Sign out" navigation drawer item being clicked.
  onSignOutNav() {
    this.signOutDialogShown = true;
    this.drawer = null;
  }

  // Handles the "Sign out" button being clicked in the "Sign out" dialog.
  signOut() {
    getAuth().then(auth => {
      auth.signOut().then(() => {
        this.$router.replace('login');
      });
    });
  }
}
</script>
