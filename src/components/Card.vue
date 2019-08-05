<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-layout row justify-center>
    <v-flex xs12 sm8 md6>
      <v-card class="pa-3">
        <div class="caption" v-if="title">{{ title }}</div>
        <slot></slot>
      </v-card>
    </v-flex>
  </v-layout>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({})
export default class Card extends Vue {
  @Prop(String) readonly title?: string;
}
</script>
