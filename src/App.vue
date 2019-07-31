<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-app>
    <Toolbar v-if="signedIn()" />
    <v-content>
      <!-- Ideally, this could be wrapped in <keep-alive include="Routes"> to
           keep the slow-to-render Routes view alive after navigating away from
           it, but that seems to break vuefire bindings: after switching away
           from the view and then back to it, vuefire no longer notifies about
           changes to the team document.
           TODO: File a bug against vuefire. -->
      <router-view />
    </v-content>
  </v-app>
</template>

<script lang="ts">
import { Vue, Component } from 'vue-property-decorator';
import { auth } from '@/firebase';
import Toolbar from '@/components/Toolbar.vue';

@Component({
  components: { Toolbar },
})
export default class App extends Vue {
  signedIn() {
    return !!auth.currentUser;
  }
}
</script>
