<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <v-toolbar-items>
    <!-- Emit an event on the root Vue instance that the Routes view can listen
         for. See https://stackoverflow.com/a/47004242 for more about this
         approach. -->
    <v-btn
      text
      class="white--text"
      @click="$root.$emit('show-route-filters')"
      v-t="'RoutesNav.filtersButton'"
    />
  </v-toolbar-items>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator';

@Component({})
export default class RoutesNav extends Vue {}
</script>
