<template>
  <v-layout class="d-flex flex-column min-h-100">
    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <v-container class="fill-height d-flex align-center justify-center py-12">
        <slot />
      </v-container>
    </v-main>
    <v-footer class="bg-grey-lighten-4">
      <v-container class="text-center py-4">
        &copy; {{ currentYear }} Strzel Sobie
      </v-container>
    </v-footer>
  </v-layout>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const currentYear = computed(() => new Date().getFullYear())
</script>
