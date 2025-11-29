import { createI18n } from 'vue-i18n';
import { en as vuetifyEn, pl as vuetifyPl } from 'vuetify/locale';
import enMessages from '../locales/en.json';
import plMessages from '../locales/pl.json';

const messages = {
  en: {
    $vuetify: vuetifyEn,
    ...enMessages,
  },
  pl: {
    $vuetify: vuetifyPl,
    ...plMessages,
  },
};

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'en',
  messages,
});

export default i18n;
