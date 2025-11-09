<template>
  <div
    class="d-flex flex-column"
    style="height: 100vh;"
  >
    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <v-container class="fill-height d-flex align-center justify-center py-12">
        <v-alert
          v-if="error"
          type="error"
          :text="error"
        />
        <slot v-else />
      </v-container>
    </v-main>
    <AppFooter />
  </div>
</template>

<script lang="ts" setup>
import { onErrorCaptured, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppFooter from '@/components/common/AppFooter.vue'

const { t } = useI18n()
const error = ref<string | null>(null)

onErrorCaptured(() => {
  error.value = t('auth.operationFailed')
  return false
})
</script>