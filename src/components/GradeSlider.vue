<!-- Copyright 2019 Daniel Erat and Niniane Wang. All rights reserved.
     Use of this source code is governed by a BSD-style license that can be
     found in the LICENSE file. -->

<template>
  <!-- It would be nice to add the 'ticks' attribute here, which allegedly
       "shows ticks when using [the] slider", but since we also define labels
       it seems to instead make the ticks always be shown, which looks pretty
       ugly. -->
  <v-range-slider
    ref="slider"
    :min="minSliderValue"
    :max="maxSliderValue"
    :tick-labels="tickLabels"
    :tick-size="0"
    thumb-label
    :thumb-size="40"
    v-model="sliderValue"
  >
    <template v-slot:thumb-label="props">
      {{ thumbLabel(props.value) }}
    </template>
  </v-range-slider>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import { Grades, GradeIndexes } from '@/models';

@Component
export default class GradeSlider extends Vue {
  // The selected grade range as a pair of values from the Grades array, e.g.
  // ['5.7, 5.10b']. Should be bound using v-model. When modifying this from
  // outside of the component, make sure that you reassign the array instead of
  // indexing into it -- see e.g.
  // https://vuejs.org/2016/02/06/common-gotchas/#Why-isn’t-the-DOM-updating.
  @Prop({ validator: v => v[0] in GradeIndexes && v[1] in GradeIndexes })
  value!: [string, string];

  // Minimum and maximum grades that should be selectable, as values from the
  // Grades array, e.g. '5.9+'.
  @Prop({ validator: v => v in GradeIndexes }) min!: string;
  @Prop({ validator: v => v in GradeIndexes }) max!: string;

  // Model for the v-slider. The strings in |value| are mapped to integer values
  // for the slider, and slider-triggered updates produce 'input' events to make
  // the parent component's v-model binding get updated. For details, see
  // https://vuejs.org/v2/guide/components.html#Using-v-model-on-Components.
  get sliderValue(): [number, number] {
    return [GradeIndexes[this.value[0]], GradeIndexes[this.value[1]]];
  }
  set sliderValue(v: [number, number]) {
    this.$emit('input', [Grades[v[0]], Grades[v[1]]]);
  }

  // Minimum and maximum values for the v-range-slider.
  get minSliderValue() {
    return GradeIndexes[this.min];
  }
  get maxSliderValue() {
    return GradeIndexes[this.max];
  }

  // Labels for tick marks.
  // Empty strings are returned to leave some ticks unlabeled.
  get tickLabels(): string[] {
    const range = Grades.slice(this.minSliderValue, this.maxSliderValue + 1);
    return range.map((g, i) => {
      // Always label the min grade.
      if (g == this.min) return g;
      // Don't label grades that would be too close to the left edge.
      if (i <= 2) return '';
      // For everything else, just display periodic labels.
      switch (g) {
        case '5.0':
          return '5.0';
        case '5.2':
          return '5.2';
        case '5.4':
          return '5.4';
        case '5.6':
          return '5.6';
        case '5.8':
          return '5.8';
        case '5.10a':
          return '5.10';
        case '5.11a':
          return '5.11';
        case '5.12a':
          return '5.12';
        case '5.13a':
          return '5.13';
        case '5.14a':
          return '5.14';
        default:
          return '';
      }
    });
  }

  // Label for the "thumb" containing the current grade.
  thumbLabel(v: number): string {
    return Grades[v];
  }
}
</script>

<style scoped>
>>> .v-slider__tick-label {
  font-size: 12px;
}
</style>
