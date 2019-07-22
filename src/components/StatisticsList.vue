<template>
  <v-list expand>
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

<script>
import StatisticsRow from '@/components/StatisticsRow.vue';

export default {
  name: 'StatisticsList',
  props: ['items'],
  components: {
    StatisticsRow,
  },
}
</script>
