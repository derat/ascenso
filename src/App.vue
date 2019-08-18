<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-app>
    <Toolbar v-if="signedIn" />
    <v-content>
      <!-- Ideally, this could be wrapped in <keep-alive include="Routes"> to
           keep the slow-to-render Routes view alive after navigating away from
           it, but that seems to break vuefire bindings: after switching away
           from the view and then back to it, vuefire no longer notifies about
           changes to the team document.
           TODO: File a bug against vuefire. -->
      <router-view
        @success-msg="onMessage($event, 'success', 3000)"
        @error-msg="onMessage($event, 'error', 6000)"
        @warning-msg="onMessage($event, 'warning', 6000)"
        @info-msg="onMessage($event, 'info', 3000)"
      />

      <!-- This component is used to display transient messages. -->
      <v-snackbar
        v-model="showSnackbar"
        bottom
        :color="snackbarColor"
        :timeout="snackbarTimeoutMs"
        >{{ snackbarText }}
        <!-- TODO: Clicking this close button dismisses any dialog that's open,
             which is pretty annoying. Increasing the snackbar's z-index doesn't
             help, either. https://github.com/vuetifyjs/vuetify/issues/7310 and
             https://stackoverflow.com/q/49627750 both suggest the hack of
             setting 'persistent' on the dialog to prevent clicks outside of it
             from closing it, but that's not very user-friendly. -->
        <v-btn flat text @click="showSnackbar = false">Close</v-btn>
      </v-snackbar>
    </v-content>
  </v-app>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { getAuth } from '@/firebase';
import Perf from '@/mixins/Perf';
import Toolbar from '@/components/Toolbar.vue';

@Component({
  components: { Toolbar },
})
export default class App extends Mixins(Perf) {
  // Whether the user is currently signed in or not.
  signedIn = false;

  // Snackbar text currently (or last) displayed.
  snackbarText = '';
  // Color currently used for the snackbar.
  snackbarColor = 'info';
  // Model controlling whether snackbar is currently visible. The component
  // automatically sets this to false once the timeout has been reached.
  showSnackbar = false;
  // Amount of time to display snackbar before autohiding, in milliseconds.
  snackbarTimeoutMs = 0;

  // Displays the snackbar in response to a request from a component.
  onMessage(msg: string, color: string, timeout: number) {
    this.snackbarText = msg;
    this.snackbarColor = color;
    this.snackbarTimeoutMs = timeout;
    this.showSnackbar = true;
  }

  mounted() {
    getAuth().then(auth => {
      auth.onAuthStateChanged(user => {
        this.signedIn = !!user;
      });
    });

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
