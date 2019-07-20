<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-app>
    <Toolbar v-if="signedIn()" />
    <v-content>
      <!-- Cache the routes view since it's slow to render. -->
      <keep-alive include="Routes">
        <router-view />
      </keep-alive>
    </v-content>
  </v-app>
</template>

<script>
import { auth } from '@/firebase';
import Toolbar from '@/components/Toolbar.vue';

export default {
  name: 'App',
  components: {
    Toolbar,
  },
  methods: {
    signedIn: function() { return !!auth.currentUser; },
  },
}
</script>
