import Vue from 'vue';
import VueI18n from 'vue-i18n';

Vue.use(VueI18n);

const messages = {
  'en': {
    yourName: 'Your Name',
    individual: 'Individual',
    team: 'Team',
  }, 
  'es': {
    yourName: 'Tu Nombre',
    individual: 'Individual',
    team: 'Grupo',
  }
};

export const i18n = new VueI18n({
  locale: 'en',
  fallbackLocale: 'es',
  messages,
});

