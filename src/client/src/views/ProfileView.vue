<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { getRoleTranslationKey } from '@/utils/roles'
import type { UserRole } from '@/types/auth'

const authStore = useAuthStore()
const { t } = useI18n()
const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

onMounted(() => {
  if (!authStore.user) {
    authStore.fetchUser()
  }
})
</script>

<template>
  <v-container>
    <v-row justify="center">
      <v-col
        cols="12"
        md="8"
        lg="6"
      >
        <v-card
          v-if="authStore.user"
          :title="t('profile.title')"
        >
          <v-card-text>
            <div>
              <strong>{{ t('profile.emailLabel') }}:</strong> {{ authStore.user.email }}
            </div>
            <div class="mt-4">
              <strong>{{ t('profile.rolesHeading') }}:</strong>
              <v-chip-group>
                <v-chip
                  v-for="role in authStore.user.roles"
                  :key="role"
                >
                  {{ translateRole(role) }}
                </v-chip>
              </v-chip-group>
            </div>
          </v-card-text>
        </v-card>
        <v-skeleton-loader
          v-else
          type="card"
        />
      </v-col>
    </v-row>
  </v-container>
</template>
