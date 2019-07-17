<template>
  <div id="firebaseui-auth-container"></div>
</template>

<script>
import firebase from 'firebase';
import firebaseui from 'firebaseui';

export default {
  mounted() {
    var ui = new firebaseui.auth.AuthUI(firebase.auth());
    ui.start("#firebaseui-auth-container", {
      signInSuccessUrl: '/',
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID,
        firebase.auth.GoogleAuthProvider.PROVIDER_ID,
      ],
    });
  }
}
</script>

<style src="firebaseui/dist/firebaseui.css"></style>
