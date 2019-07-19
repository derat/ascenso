<template>
  <div id="firebaseui-auth-container"></div>
</template>

<script>
import firebase from 'firebase/app';
import firebaseui from 'firebaseui';
import { auth } from '@/firebase';

export default {
  mounted() {
    var ui = new firebaseui.auth.AuthUI(auth);
    ui.start("#firebaseui-auth-container", {
      signInSuccessUrl: '/',
      signInOptions: [
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
      ],
    });
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
