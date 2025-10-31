<template>
  <v-container class="text-center py-16">
    <v-row justify="center">
      <v-col
        cols="12"
        md="6"
      >
        <v-icon size="96">
          mdi-compass-off
        </v-icon>
        <h1 class="text-h4 mt-4">
          404
        </h1>
        <p class="text-subtitle-1">
          {{ t('errors.notFound.subtitle') }}
        </p>
        <v-btn
          class="mt-4"
          color="primary"
          @click="goHome"
        >
          {{ t('errors.notFound.backToCalendar') }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()

const goHome = () => {
  router.push({ name: 'Calendar', params: { rangeSlug: authStore.defaultRangeSlug ?? 'dobczyce' } })
}
</script>
