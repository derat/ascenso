<template>
  <v-list expand class="pa-0">
    <template v-for="item in items">
      <StatisticsRow
        :name="item.name"
        :value="item.value"
        v-bind:key="item.name"
      />
      <StatisticsList
        v-if="item.children"
        :items="item.children"
        v-bind:key="item.name + '-children'"
        class="py-0 pl-4"
      />
    </template>
  </v-list>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator';
import StatisticsRow from '@/components/StatisticsRow.vue';
import { Statistic } from '@/models';

@Component({
  components: { StatisticsRow },
})
export default class StatisticsList extends Vue {
  @Prop(Array) readonly items!: Statistic[];
}
</script>
