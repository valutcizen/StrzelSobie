<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="6">
        <v-card>
          <v-card-title>{{ t('profile.title') }}</v-card-title>
          <v-card-text>
            <v-list density="comfortable">
              <v-list-item
                :title="authStore.user?.email ?? '—'"
                prepend-icon="mdi-email"
              />
              <v-list-item>
                <template #prepend>
                  <v-icon>mdi-shield-account</v-icon>
                </template>
                <template #title>
                  {{ t('profile.rolesHeading') }}
                </template>
                <template #subtitle>
                  <v-chip
                    v-for="role in roles"
                    :key="role"
                    class="ma-1"
                    color="primary"
                    size="small"
                    variant="tonal"
                  >
                    {{ role }}
                  </v-chip>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/auth'

const authStore = useAuthStore()
const { t } = useI18n()

const { roles } = storeToRefs(authStore)
</script>
