<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div id="container">
    <!-- We use v-show rather than v-if here so that FirebaseUI can find the
         auth container in the DOM immediately. -->
    <v-container v-show="ready" grid-list-md text-ms-center>
      <v-layout row justify-center>
        <!-- These widths are chosen to match those of the <Card> below. -->
        <v-flex xs12 sm8 md6>
          <v-img :src="logoURL" :alt="competitionName" contain />
        </v-flex>
      </v-layout>
      <Card class="mt-2">
        <v-container class="pa-0 pt-2">
          <v-layout row justify-center>
            <div class="instructions">Please sign in to continue:</div>
          </v-layout>
          <v-layout row justify-center>
            <div id="firebaseui-auth-container"></div>
          </v-layout>
        </v-container>
      </Card>
    </v-container>
    <Spinner v-if="!ready" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins, Watch } from 'vue-property-decorator';
import firebase from 'firebase/app';
import firebaseui from 'firebaseui';

import { auth, getUser } from '@/firebase/auth';
import { db } from '@/firebase/firestore';
import { logInfo } from '@/log';
import Card from '@/components/Card.vue';
import Perf from '@/mixins/Perf.ts';
import Spinner from '@/components/Spinner.vue';

@Component({
  components: { Card, Spinner },
})
export default class Login extends Mixins(Perf) {
  readonly logoURL = process.env.VUE_APP_LOGO_URL;
  readonly competitionName = process.env.VUE_APP_COMPETITION_NAME;

  pendingRedirect = false;

  get ready() {
    return !this.pendingRedirect;
  }

  mounted() {
    // See https://github.com/firebase/firebaseui-web/issues/293.
    let ui = firebaseui.auth.AuthUI.getInstance();
    if (!ui) {
      ui = new firebaseui.auth.AuthUI(auth);
    }

    this.pendingRedirect = ui.isPendingRedirect();
    ui.start('#firebaseui-auth-container', {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
      callbacks: {
        signInSuccessWithAuthResult: () => {
          const user = getUser();
          const ref = db.collection('users').doc(user.uid);
          ref.get().then(snap => {
            if (snap.exists) {
              // If the user has logged in before, send them to the routes view.
              this.$router.replace('routes');
            } else {
              // Otherwise, create the doc using their default name and send
              // them to the profile view.
              logInfo('create_user', { name: user.displayName });
              ref.set({ name: user.displayName }, { merge: true }).then(() => {
                this.$router.replace('profile');
              });
            }
          });

          // Don't redirect automatically; we handle that above.
          return false;
        },
        uiShown: () => this.recordEvent('loginShown'),
      },
    });
  }

  @Watch('ready')
  onReady(val: boolean) {
    if (val) this.logReady('login_loaded');
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
<style scoped>
#container {
  /* Needed in order for spinner to be vertically centered. */
  display: inline;
}
.instructions {
  font-size: 16px;
}
</style>
