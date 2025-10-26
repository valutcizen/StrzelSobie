<template>
  <v-footer
    class="bg-grey-lighten-4 footer-compact"
    app
  >
    <v-container class="d-flex flex-column flex-sm-row align-center justify-space-between py-1">
      <v-btn
        variant="text"
        href="https://github.com/valutcizen/StrzelSobie"
        target="_blank"
        rel="noopener noreferrer"
        class="text-decoration-none"
        prepend-icon="mdi-github"
      >
        {{ t('app.title') }}
      </v-btn>
      <LanguageSwitcher />
      <v-btn
        variant="text"
        :to="{ name: 'PrivacyPolicy' }"
        prepend-icon="mdi-shield-account"
      >
        {{ t('footer.privacyPolicy') }}
      </v-btn>
    </v-container>
  </v-footer>
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import LanguageSwitcher from '@/components/common/LanguageSwitcher.vue'

const { t } = useI18n()
</script>

<style scoped>
.footer-compact {
  height: 48px;
  min-height: 48px;
  max-height: 48px;
}

.footer-compact :deep(.v-container) {
  padding-top: 8px;
  padding-bottom: 8px;
}
</style>
