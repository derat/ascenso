<template>
  <v-app>
    <Toolbar v-if="signedIn()" />
    <v-content>
      <router-view />
    </v-content>
  </v-app>
</template>

<script>
import firebase from 'firebase';

import Toolbar from '@/components/Toolbar.vue';

export default {
  name: 'App',
  components: {
    Toolbar,
  },
  methods: {
    signedIn: function() { return !!firebase.auth().currentUser; },
  },
}
</script>
