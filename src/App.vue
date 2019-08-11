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
import { Component, Mixins } from 'vue-property-decorator';
import { auth } from '@/firebase';

import Perf from '@/mixins/Perf.ts';
import Toolbar from '@/components/Toolbar.vue';

@Component({
  components: { Toolbar },
})
export default class App extends Mixins(Perf) {
  signedIn() {
    return !!auth.currentUser;
  }
  mounted() {
    this.$nextTick(() => {
      const data: Record<string, any> = { userAgent: navigator.userAgent };
      try {
        const t = window.performance.timing;
        data.page = {
          timeToFirstByte: t.responseStart - t.requestStart,
          domInteractive: t.domInteractive - t.requestStart,
          documentLoaded: t.loadEventStart - t.requestStart,
        };
      } catch (e) {
        // Ignore exceptions; browser support for this is lacking per MDN:
        // https://developer.mozilla.org/en-US/docs/Web/API/PerformanceNavigationTiming
      }
      this.logReady('app_loaded', data);
    });
  }
}
</script>
