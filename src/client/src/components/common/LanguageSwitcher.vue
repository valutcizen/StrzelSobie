<template>
  <v-btn-toggle
    v-model="locale"
    class="language-switcher"
    density="compact"
    mandatory
  >
    <v-btn
      v-for="option in localeOptions"
      :key="option.code"
      :value="option.code"
      :aria-label="option.label"
      :title="option.label"
      size="small"
      variant="text"
    >
      <span
        aria-hidden="true"
        class="language-flag"
        :class="option.flagClass"
      />
    </v-btn>
  </v-btn-toggle>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { locale, availableLocales } = useI18n()

const LOCALE_CONFIG: Record<string, { flagClass: string; label: string }> = {
  en: { flagClass: 'flag-icon flag-icon-gb', label: 'English' },
  pl: { flagClass: 'flag-icon flag-icon-pl', label: 'Polski' },
}

const localeOptions = computed(() => availableLocales.map((code) => {
  const fallback = { flagClass: 'flag-icon flag-icon-un', label: code.toUpperCase() }
  return {
    code,
    flagClass: LOCALE_CONFIG[code]?.flagClass ?? fallback.flagClass,
    label: LOCALE_CONFIG[code]?.label ?? fallback.label,
  }
}))
</script>

<style scoped>
.language-switcher {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0 4px;
}

.language-switcher :deep(.v-btn) {
  min-width: 36px;
  border-radius: 999px;
  padding-inline: 8px;
}

.language-flag {
  display: inline-flex;
  width: 24px;
  height: 18px;
}
</style>
