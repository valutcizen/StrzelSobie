<template>
  <v-container class="py-12">
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
        lg="6"
      >
        <v-card>
          <v-card-title class="text-h5">
            {{ t('privacyPolicy.title') }}
          </v-card-title>
          <v-card-text class="text-body-2">
            <p>
              {{ t('privacyPolicy.description') }}
            </p>
            <p class="mt-4">
              {{ t('privacyPolicy.contact') }}
            </p>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>
