<template>
  <v-container class="text-center py-16">
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-icon size="96">mdi-compass-off</v-icon>
        <h1 class="text-h4 mt-4">404</h1>
        <p class="text-subtitle-1">Nie znaleziono strony.</p>
        <v-btn
          class="mt-4"
          color="primary"
          @click="goHome"
        >
          Wróć do kalendarza
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const goHome = () => {
  router.push({ name: 'calendar', params: { rangeSlug: authStore.defaultRangeSlug ?? 'dobczyce' } })
}
</script>
