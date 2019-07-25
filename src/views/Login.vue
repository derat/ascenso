<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div id="firebaseui-auth-container"></div>
</template>

<script>
import firebase from 'firebase/app';
import firebaseui from 'firebaseui';
import { auth, db } from '@/firebase';

export default {
  mounted() {
    // See https://github.com/firebase/firebaseui-web/issues/293.
    let ui = firebaseui.auth.AuthUI.getInstance();
    if (!ui) {
      ui = new firebaseui.auth.AuthUI(auth);
    }

    ui.start('#firebaseui-auth-container', {
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
      callbacks: {
        signInSuccessWithAuthResult: () => {
          const ref = db.collection('users').doc(auth.currentUser.uid);
          ref.get().then(snap => {
            if (snap.exists) {
              // If the user has logged in before, send them to the routes view.
              this.$router.replace('routes');
            } else {
              // Otherwise, create the doc using their default name and send
              // them to the profile view.
              ref
                .set(
                  {
                    name: auth.currentUser.displayName,
                  },
                  { merge: true }
                )
                .then(() => {
                  this.$router.replace('profile');
                });
            }
          });

          // Don't redirect automatically; we handle that above.
          return false;
        },
      },
    });
  },
};
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
