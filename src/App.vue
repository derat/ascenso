<template>
  <v-app>
    <v-toolbar color="blue">
      <v-toolbar-title class="white--text">Climbing competition</v-toolbar-title>
    </v-toolbar>

    <v-content>
      <Climbs/>
    </v-content>
  </v-app>
</template>

<script>
import Climbs from './components/Climbs'

export default {
  name: 'App',
  components: {
    Climbs
  },
  data () {
    return {
      //
    }
  }
}
</script>
