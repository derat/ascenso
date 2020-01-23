<!-- Copyright 2020 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <div class="flag-container">
    <v-img
      v-for="(lc, i) in locales"
      :key="lc"
      :src="flagPath(lc)"
      :alt="name(lc)"
      contain
      height="30px"
      width="40px"
      @click="onClick(lc)"
      class="flag"
      :class="{ active: lc == $i18n.locale, 'ml-3': i != 0 }"
    />
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';

interface LocaleInfo {
  // Locale's name, e.g. 'English (US)'. This should be in the locale's native
  // language since the locale is only useful for people who understand it.
  name: string;
  // Base name of the locale's country flag SVG image in the public/flags/
  // directory, e.g. 'us'.
  flag: string;
}

@Component
export default class LocalePicker extends Vue {
  // Array of locale names in preferred order, e.g. ['es-PR', 'en-US'].
  @Prop(Array) readonly locales!: string[];

  readonly infos: Record<string, LocaleInfo> = {
    ['en-US']: { name: 'English (US)', flag: 'us' },
    ['es-PR']: { name: 'Español (PR)', flag: 'pr' },
  };

  flagPath(lc: string): string {
    return `flags/${this.infos[lc] ? this.infos[lc].flag : 'unknown'}.svg`;
  }
  name(lc: string): string {
    return this.infos[lc] ? this.infos[lc].name : 'Unknown';
  }

  onClick(lc: string) {
    this.$i18n.locale = lc;
  }
}
</script>

<style scoped>
.flag {
  display: inline-block;
}
.flag.active {
  background-color: #eee;
  outline: solid 1px #ccc;
}
</style>
