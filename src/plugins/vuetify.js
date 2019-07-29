import Vue from 'vue';
import Vuetify from 'vuetify/lib';
import 'vuetify/src/stylus/app.styl';
import colors from 'vuetify/lib/util/colors';

Vue.use(Vuetify, {
  iconfont: 'md',
  theme: {
    primary: colors.blue.darken1,
    secondary: colors.amber.base,
    error: colors.deepOrange.base,
  },
});
