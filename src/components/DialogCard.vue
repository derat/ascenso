<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-layout row justify-center>
    <v-flex>
      <v-card>
        <v-card-title class="title grey lighten-2" primary-title>
          {{ title }}
        </v-card-title>
        <slot></slot>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({})
export default class DialogCard extends Vue {
  @Prop(String) readonly title!: string;
}
</script>
