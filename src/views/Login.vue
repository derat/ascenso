<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div id="login-wrapper">
    <!-- We use v-show rather than v-if here so that FirebaseUI can find the
         auth container in the DOM immediately. -->
    <v-container
      class="container"
      ref="container"
      v-show="showUI"
      grid-list-md
      text-ms-center
    >
      <v-layout row justify-center>
        <!-- These widths are chosen to match those of the <Card> below. -->
        <v-flex xs12 sm8 md6>
          <v-img :src="logoURL" :alt="competitionName" contain />
        </v-flex>
      </v-layout>
      <v-layout row justify-center class="mt-4">
        <div id="firebaseui-auth-container"></div>
      </v-layout>
    </v-container>
    <Spinner v-if="!showUI" />
  </div>
</template>

<script lang="ts">
import { Component, Mixins } from 'vue-property-decorator';

import { logError, logInfo } from '@/log';
import { getAuth, getFirebase, getFirebaseUI, getFirestore } from '@/firebase';

import Card from '@/components/Card.vue';
import Perf from '@/mixins/Perf';
import Spinner from '@/components/Spinner.vue';

@Component({
  components: { Card, Spinner },
})
export default class Login extends Mixins(Perf) {
  readonly logoURL = process.env.VUE_APP_LOGO_URL;
  readonly competitionName = process.env.VUE_APP_COMPETITION_NAME;

  // True when an OAuth-based flow has redirected back to this view after
  // getting user confirmation.
  pendingRedirect = false;

  // True when signin is complete and process is finishing (e.g.
  // checking/creating the user doc in Firestore).
  completingLogin = false;

  get showUI() {
    // Hide the login elements when we don't need anything else from the user.
    return !this.pendingRedirect && !this.completingLogin;
  }

  mounted() {
    Promise.all([getAuth(), getFirebase(), getFirebaseUI()]).then(
      ([auth, firebase, firebaseui]) => {
        // See https://github.com/firebase/firebaseui-web/issues/293.
        let ui = firebaseui.auth.AuthUI.getInstance();
        if (!ui) ui = new firebaseui.auth.AuthUI(auth);

        this.pendingRedirect = ui.isPendingRedirect();
        if (!this.pendingRedirect) this.logReady('login_loaded');

        ui.start('#firebaseui-auth-container', {
          // Disable the account chooser, which is ugly and doesn't seem to work
          // correctly with this logic (i.e. after signing out and trying to
          // sign in with email, I just see a spinner):
          // https://stackoverflow.com/q/37369929.
          credentialHelper: firebaseui.auth.CredentialHelper.NONE,
          signInOptions: [
            firebase.auth.GoogleAuthProvider.PROVIDER_ID,
            firebase.auth.EmailAuthProvider.PROVIDER_ID,
          ],
          callbacks: {
            signInSuccessWithAuthResult: () => {
              this.completingLogin = true;

              Promise.all([getAuth(), getFirestore()]).then(([auth, db]) => {
                const user = auth.currentUser;
                if (!user) throw new Error('Not logged in');
                const ref = db.collection('users').doc(user.uid);
                ref.get().then(snap => {
                  if (snap.exists) {
                    // If the user has logged in before, send them to the routes
                    // view.
                    this.$router.replace('routes');
                  } else {
                    // Otherwise, create the doc using their display name and
                    // send them to the profile view. Note that the name is null
                    // when using the email provider.
                    const name = user.displayName || 'Unknown Climber';
                    logInfo('create_user', { name });
                    ref
                      .set({ name }, { merge: true })
                      .then(() => {
                        this.$router.replace('profile');
                      })
                      .catch(err => {
                        this.$emit('error-msg', `Failed creating user: ${err}`);
                        logError('create_user_failed', err);
                      });
                  }
                });
              });

              // Don't redirect automatically; we handle that above.
              return false;
            },
            uiShown: () => this.recordEvent('loginShown'),
          },
        });
      }
    );
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
<style scoped>
.container {
  /* This is a hack. FirebaseUI's email auth widget seems to be rendered in a
   * white elevated card on big desktop displays, but just on a flat white
   * background on mobile. To make it look decent in both cases, we place it on
   * top of a white background. */
  background-color: white;
  /* Increase the container height to make sure there isn't a weird gray area
   * underneath it. */
  min-height: 100%;
}
#login-wrapper {
  /* Needed in order for spinner to be vertically centered. */
  display: inline;
}
</style>
