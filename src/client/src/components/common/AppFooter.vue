<template>
  <v-footer class="bg-grey-lighten-4 footer-compact">
    <v-container class="d-flex flex-column flex-sm-row align-center justify-space-between py-1">
      <v-btn
        variant="text"
        href="https://github.com/valutcizen/StrzelSobie"
        target="_blank"
        rel="noopener noreferrer"
        class="text-decoration-none"
        prepend-icon="mdi-github"
      >
        Strzel Sobie
      </v-btn>
      <v-btn
        variant="text"
        :to="{ name: 'PrivacyPolicy' }"
        prepend-icon="mdi-shield-account"
      >
        Polityka Prywatności
      </v-btn>
    </v-container>
  </v-footer>
</template>

<script lang="ts" setup>
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
