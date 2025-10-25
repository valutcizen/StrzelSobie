<template>
  <v-select
    v-model="locale"
    :items="availableLocales"
    :label="t('language')"
    density="compact"
    variant="outlined"
    class="language-switcher"
    hide-details
  />
</template>

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'

const { locale, availableLocales, t } = useI18n()
</script>

<style scoped>
.language-switcher {
  max-width: 150px;
}
</style>
