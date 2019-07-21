<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-menu class="mr-3">
    <template v-slot:activator="{ on }">
      <v-btn
        :color="states[currentState].color"
        class="white--text narrow-button"
        v-on="on"
      >
        {{ states[currentState].abbrev }}
      </v-btn>
    </template>
    <v-list>
      <v-list-tile
        v-for="state in orderedStates"
        :key="state"
        @click="setState(state)"
      >
        <v-list-tile-title>{{ states[state].name }}</v-list-tile-title>
      </v-list-tile>
    </v-list>
  </v-menu>
</template>

<script>
import firebase from 'firebase/app';
import { auth, db } from '@/firebase';
import ClimbState from './ClimbState.js'

export default {
  props: ['currentState', 'routeID'],
  data: () => ({
    states: [
      {
        name: 'Not climbed',
        abbrev: '',
        color: 'gray'
      },
      {
        name: 'Lead',
        abbrev: 'L',
        color: 'red darken-4'
      },
      {
        name: 'Top-rope',
        abbrev: 'TR',
        color: 'red'
      }
    ],
    orderedStates: [
      ClimbState.LEAD,
      ClimbState.TOP_ROPE,
      ClimbState.NOT_CLIMBED
    ],
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
