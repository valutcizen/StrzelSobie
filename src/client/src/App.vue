<template>
  <v-app>
    <component :is="layoutComponent">
      <router-view />
    </component>
  </v-app>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppShell from '@/layouts/AppShell.vue'
import AuthLayout from '@/layouts/AuthLayout.vue'
import '@mdi/font/css/materialdesignicons.css'

const route = useRoute()

const layoutComponent = computed(() => {
  const layoutName = (route.meta.layout as string) ?? 'app'
  return layoutName === 'auth' ? AuthLayout : AppShell
})
</script>
