<template>
  <div class="d-flex flex-column" style="height: 100vh;">
    <v-main class="bg-grey-lighten-5 flex-grow-1">
      <v-container class="fill-height d-flex align-center justify-center py-12">
        <slot />
      </v-container>
    </v-main>
    <AppFooter />
  </div>
</template>

<script lang="ts" setup>
import AppFooter from '@/components/common/AppFooter.vue'
</script>
