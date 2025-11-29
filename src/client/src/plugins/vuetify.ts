import 'vuetify/styles';
import { createVuetify, type ThemeDefinition } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import { createVueI18nAdapter } from 'vuetify/locale/adapters/vue-i18n';
import { useI18n } from 'vue-i18n';
import i18n from './i18n';

const prosilverLikeTheme: ThemeDefinition = {
  dark: false,
  colors: {
    background: '#FFFFFF',
    surface: '#F5F7F9',
    primary: '#12A3EB',
    secondary: '#cadceb',
    info: '#12A3EB',
    'on-surface': '#536482',
  },
};

const vuetify = createVuetify({
  components,
  directives,
  locale: {
    adapter: createVueI18nAdapter({ i18n, useI18n }),
  },
  theme: {
    defaultTheme: 'prosilverLikeTheme',
    themes: {
      prosilverLikeTheme,
    },
  },
});

export default vuetify;
