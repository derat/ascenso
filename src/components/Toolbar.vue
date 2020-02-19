<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div>
    <v-navigation-drawer ref="drawer" v-model="drawer" app>
      <v-list>
        <template v-for="(item, index) in navItems">
          <v-divider
            v-if="item.type == NavItemType.DIVIDER"
            :key="`divider-${index}`"
            class="my-2"
          />
          <LocalePicker
            v-else-if="item.type == NavItemType.LOCALE_PICKER"
            :id="item.id"
            :key="item.id"
            :locales="locales"
            class="ml-4 mt-4"
          />
          <!-- Note that v-list-item (formerly v-list-tile) extends router-link:
               https://stackoverflow.com/q/47586022. -->
          <v-list-item
            v-else
            :id="item.id"
            :key="item.id"
            :to="item.route ? { name: item.route } : ''"
            v-on="item.method ? { click: item.method } : null"
          >
            <v-list-item-action>
              <v-icon>{{ item.icon }}</v-icon>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>{{ item.text }}</v-list-item-title>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
      <template v-slot:append>
        <div class="build mb-2 ml-2">
          {{ $t('Toolbar.buildText', [buildInfo]) }}
        </div>
      </template>
    </v-navigation-drawer>

    <v-app-bar color="primary" app scroll-off-screen :scroll-threshold="32">
      <v-app-bar-nav-icon
        id="toolbar-menu-icon"
        ref="toolbarIcon"
        @click.stop="drawer = !drawer"
        color="white"
      ></v-app-bar-nav-icon>
      <!-- It's super-ugly that Vuetify seems to require hard-coding the text
           color here. Oddly, color="primary" gives us a white icon in
           <v-app-bar-nav-icon> above, but it gives us black text here. -->
      <v-toolbar-title class="white--text">{{ title }}</v-toolbar-title>
      <v-spacer />
      <slot></slot>
    </v-app-bar>

    <!-- "Sign out" dialog -->
    <v-dialog
      ref="signOutDialog"
      v-model="signOutDialogShown"
      max-width="320px"
    >
      <DialogCard :title="$t('Toolbar.signOutTitle')">
        <v-card-text v-t="'Toolbar.signOutText'" />

        <v-divider />
        <v-card-actions>
          <v-btn
            text
            @click="signOutDialogShown = false"
            v-t="'Toolbar.signOutCancelButton'"
          />
          <v-spacer />
          <v-btn
            text
            color="error"
            id="toolbar-sign-out-confirm-button"
            ref="signOutConfirmButton"
            @click="signOut"
            v-t="'Toolbar.signOutConfirmButton'"
          />
        </v-card-actions>
      </DialogCard>
    </v-dialog>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { getAuth } from '@/firebase';
import DialogCard from '@/components/DialogCard.vue';
import LocalePicker from '@/components/LocalePicker.vue';

enum NavItemType {
  // A clickable item with text and an icon.
  ITEM = 0,
  // A horizontal line.
  DIVIDER = 1,
  // A component for changing the locale.
  LOCALE_PICKER = 2,
}

// An entry in the navigation drawer.
interface NavItem {
  // Type of item to display.
  type: NavItemType;
  // Element ID. Only set for ITEM and LOCALE_PICKER.
  id?: string;
  // Text to display. Only set for ITEM.
  text?: string;
  // Material icon name to use. Only set for ITEM.
  icon?: string;
  // vue-router route name to navigate to when clicked. Optionally set for ITEM.
  route?: string;
  // Method on Toolbar component to invoke when clicked.
  // Note that things seem to go haywire if you try to pass an anonymous
  // function here instead -- just define a method on Toolbar and pass an
  // unbound reference to it. Optionally set for ITEM.
  method?: () => void;
}

@Component({
  components: { DialogCard, LocalePicker },
})
export default class Toolbar extends Vue {
  // Name to display in the toolbar.
  @Prop(String) readonly title!: string;
  // Model for navigation drawer.
  drawer: any = null;
  // Whether the "Sign out" dialog is shown.
  signOutDialogShown = false;

  // Hoist enum so it's accessible in template.
  NavItemType = NavItemType;

  // Navigation drawer entries.
  get navItems(): NavItem[] {
    return [
      {
        type: NavItemType.ITEM,
        id: 'toolbar-routes',
        text: this.$t('Toolbar.routesItem'),
        icon: 'view_list',
        route: 'routes',
      },
      {
        type: NavItemType.ITEM,
        id: 'toolbar-stats',
        text: this.$t('Toolbar.statisticsItem'),
        icon: 'assessment',
        route: 'stats',
      },
      {
        type: NavItemType.ITEM,
        id: 'toolbar-profile',
        text: this.$t('Toolbar.profileItem'),
        icon: 'person',
        route: 'profile',
      },
      { type: NavItemType.DIVIDER },
      {
        type: NavItemType.ITEM,
        id: 'toolbar-sign-out',
        text: this.$t('Toolbar.signOutItem'),
        icon: 'exit_to_app',
        method: this.onSignOutNav,
      },
      { type: NavItemType.DIVIDER },
      { type: NavItemType.LOCALE_PICKER, id: 'toolbar-locale-picker' },
    ];
  }

  get locales(): string[] {
    // The default here is used by the end-to-end test, which expects es-PR to
    // be the second language in the list.
    return (process.env.VUE_APP_LOCALES || 'en-US,es-PR').split(',');
  }

  get buildInfo(): string {
    const timestamp = document.documentElement.dataset.buildTime || '';
    const commit = document.documentElement.dataset.buildCommit || '';
    return `${timestamp}-${commit.slice(0, 8)}`;
  }

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

<style scoped>
.build {
  color: #aaa;
  font-size: 11px;
  padding-left: 2px;
}
</style>
