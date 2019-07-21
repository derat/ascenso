<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-container>
    <v-layout>
      <v-flex>
        <v-form v-model="nameValid">
          <v-text-field
            :value="doc.name"
            :counter="nameMaxLength"
            :rules="nameRules"
            label="Name"
            @change="updateName"
            required
          />
        </v-form>
      </v-flex>
    </v-layout>
  </v-container>
</template>

<script>
import { auth, db } from '@/firebase';

export default {
  data() {
    return {
      doc: {},
      docRef: null,
      nameMaxLength: 50,
      nameRules: [
        v => !!v || 'Name must not be empty',
        v => (!v || v.length <= this.nameMaxLength) ||
            'Name must be ' + this.nameMaxLength + ' characters or shorter',
      ],
      nameValid: false,
    }
  },
  methods: {
    updateName(name) {
      if (this.nameValid) {
        // TODO: Trim whitespace, discard embedded newlines, etc.?
        this.docRef.update({ name: name });
      }
    },
  },
  mounted() {
    this.docRef = db.collection('users').doc(auth.currentUser.uid);
    this.$bind('doc', this.docRef);
  }
}
</script>
