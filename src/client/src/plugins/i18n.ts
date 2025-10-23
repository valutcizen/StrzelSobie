import { createI18n } from 'vue-i18n';

const i18n = createI18n({
  legacy: false,
  locale: 'pl',
  fallbackLocale: 'en',
  messages: {
    en: {},
    pl: {},
  },
});

export default i18n;