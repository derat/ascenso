<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-card>
    <v-card-title class="title grey lighten-2 mb-4" primary-title>
      {{ title }}
    </v-card-title>
    <slot></slot>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

@Component({})
export default class DialogCard extends Vue {
  @Prop(String) readonly title!: string;
}
</script>
