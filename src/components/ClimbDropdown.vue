<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-menu class="mr-3" lazy>
    <template v-slot:activator="{ on }">
      <v-btn
        :color="stateColors[currentState]"
        class="white--text narrow-button"
        v-on="on"
      >
        {{ stateAbbrevs[currentState] }}
      </v-btn>
    </template>
    <v-list>
      <v-list-tile @click="setState(ClimbState.LEAD)">
        <v-list-tile-title>Lead</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="setState(ClimbState.TOP_ROPE)">
        <v-list-tile-title>Top-rope</v-list-tile-title>
      </v-list-tile>
      <v-list-tile @click="setState(ClimbState.NOT_CLIMBED)">
        <v-list-tile-title>Not climbed</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script>
import firebase from 'firebase/app';
import { auth, db } from '@/firebase';
import ClimbState from '@/components/ClimbState.js'

const stateColors = Object.freeze({
  [ClimbState.LEAD]: 'red',
  [ClimbState.TOP_ROPE]: 'red darken-4',
  [ClimbState.NOT_CLIMBED]: 'gray',
});

const stateAbbrevs = Object.freeze({
  [ClimbState.LEAD]: 'L',
  [ClimbState.TOP_ROPE]: 'TR',
  [ClimbState.NOT_CLIMBED]: '',
});

export default {
  props: ['currentState', 'routeID'],
  data: () => ({
    ClimbState: ClimbState,
    stateColors: stateColors,
    stateAbbrevs: stateAbbrevs,
  }),
  methods: {
    setState(state) {
      // Just delete the map entry instead of recording a not-climbed state.
      const value = (state == ClimbState.NOT_CLIMBED) ?
          firebase.firestore.FieldValue.delete() : state;
      db.collection('users').doc(auth.currentUser.uid).update({
        ['climbs.' + this.routeID]: value,
      });
    },
  },
}
</script>

<style scoped>
.narrow-button {
  min-width: 48px;
}
</style>
