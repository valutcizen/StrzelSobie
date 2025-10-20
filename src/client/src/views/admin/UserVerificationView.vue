<template>
  <v-container>
    <v-card>
      <v-card-title>{{ t('admin.verification.title') }}</v-card-title>
      <v-card-text>
        <v-skeleton-loader
          v-if="adminStore.isLoadingPending"
          type="list-item-two-line"
        />
        <v-alert
          v-else-if="adminStore.pendingUsers.length === 0"
          type="info"
          variant="tonal"
        >
          Brak użytkowników oczekujących na weryfikację.
        </v-alert>
        <v-list v-else>
          <v-list-item
            v-for="user in adminStore.pendingUsers"
            :key="user.id"
            :title="user.email"
            :subtitle="user.submittedAt"
          >
            <template #append>
              <v-btn
                class="mr-2"
                color="primary"
                size="small"
                @click="promote(user.id, 'Member')"
              >
                Członek
              </v-btn>
              <v-btn
                color="secondary"
                size="small"
                @click="promote(user.id, 'Coordinator')"
              >
                Koordynator
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '../../stores/admin'
import type { UserRole } from '../../types/auth'

const adminStore = useAdminStore()
const { t } = useI18n()

const promote = async (userId: string, role: UserRole) => {
  await adminStore.promotePendingUser(userId, role)
}

onMounted(() => {
  void adminStore.fetchPendingUsers()
})
</script>
