<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-row justify="center">
    <v-col cols="12" sm="8" md="6" class="py-0">
      <v-card class="pa-4">
        <div class="caption" v-if="title">{{ title }}</div>
        <slot></slot>
      </v-card>
    </v-col>
  </v-row>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({})
export default class Card extends Vue {
  @Prop(String) readonly title?: string;
}
</script>
