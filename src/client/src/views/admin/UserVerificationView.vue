<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { pl } from 'date-fns/locale'
import { onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '@/stores/admin'
import type { PendingUser } from '@/types/admin'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import { getRoleTranslationKey } from '@/utils/roles'

const adminStore = useAdminStore()
const loadingUserId = ref<string | null>(null)
const errorMessage = ref<string | null>(null)
const snackbar = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})

const { t } = useI18n()

const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))
const userHasRole = (user: PendingUser, role: UserRole) => user.currentRoles?.includes(role) ?? false
const visibleRoles = (user: PendingUser) =>
  (user.currentRoles ?? []).filter((role) => role !== UserRoleEnum.Guest)

const fetchPendingUsers = async () => {
  errorMessage.value = null
  try {
    await adminStore.fetchPendingUsers()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Nie udało się pobrać oczekujących użytkowników.'
  }
}

const promoteUser = async (user: PendingUser, role: UserRole) => {
  loadingUserId.value = user.id
  errorMessage.value = null
  const shouldAssign = !userHasRole(user, role)
  try {
    await adminStore.promotePendingUser(user.id, role)
    snackbar.open = true
    snackbar.message = shouldAssign
      ? t('admin.userRoles.roleAssigned', {
          email: user.email,
          role: translateRole(role),
        })
      : t('admin.userRoles.roleRemoved', {
          email: user.email,
          role: translateRole(role),
        })
    snackbar.color = 'success'
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Nie udało się zaktualizować roli użytkownika.'
    snackbar.open = true
    snackbar.message = 'Nie udało się zatwierdzić użytkownika.'
    snackbar.color = 'error'
  } finally {
    loadingUserId.value = null
  }
}

const formatSubmittedAt = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), { locale: pl, addSuffix: true })
  } catch {
    return value
  }
}

onMounted(() => {
  fetchPendingUsers()
})
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Weryfikacja użytkowników</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          @click="fetchPendingUsers"
        >
          Odśwież
        </v-btn>
      </v-card-title>

      <v-progress-linear
        v-if="adminStore.isLoadingPending"
        indeterminate
        color="primary"
      />

      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        border="start"
        class="mx-4 mt-4"
      >
        {{ errorMessage }}
      </v-alert>

      <v-card-text>
        <div
          v-if="!adminStore.isLoadingPending && adminStore.pendingUsers.length === 0"
          class="text-center py-8"
        >
          <v-icon
            size="56"
            color="grey"
          >
            mdi-account-check
          </v-icon>
          <p class="text-subtitle-2 mt-3">
            Brak użytkowników oczekujących na weryfikację.
          </p>
        </div>

        <v-list v-else>
          <v-list-item
            v-for="user in adminStore.pendingUsers"
            :key="user.id"
            class="py-4"
          >
            <template #title>
              <div class="d-flex flex-column">
                <span class="text-subtitle-1 font-weight-medium">{{ user.email }}</span>
                <span class="text-caption text-medium-emphasis">
                  Zgłoszono {{ formatSubmittedAt(user.submittedAt) }}
                </span>
              </div>
            </template>
            <template #subtitle>
              <div class="d-flex flex-column gap-1">
                <span v-if="user.requestedRole">
                  {{ t('admin.userRoles.suggestedRole', { role: translateRole(user.requestedRole) }) }}
                </span>
                <span v-else>{{ t('admin.userRoles.noSuggestedRole') }}</span>
                <v-chip-group
                  v-if="visibleRoles(user).length > 0"
                  selected-class="text-white"
                  density="compact"
                >
                  <v-chip
                    v-for="role in visibleRoles(user)"
                    :key="role"
                    color="primary"
                    variant="tonal"
                    size="small"
                  >
                    {{ translateRole(role) }}
                  </v-chip>
                </v-chip-group>
              </div>
            </template>
            <template #append>
              <div class="d-flex gap-2">
                <v-btn
                  size="small"
                  :color="userHasRole(user, UserRoleEnum.Member) ? 'error' : 'success'"
                  :loading="loadingUserId === user.id"
                  @click="promoteUser(user, UserRoleEnum.Member)"
                >
                  {{
                    userHasRole(user, UserRoleEnum.Member)
                      ? t('admin.userRoles.removeRole', { role: translateRole(UserRoleEnum.Member) })
                      : t('admin.userRoles.assignRole', { role: translateRole(UserRoleEnum.Member) })
                  }}
                </v-btn>
                <v-btn
                  size="small"
                  :color="userHasRole(user, UserRoleEnum.Coordinator) ? 'error' : 'primary'"
                  :loading="loadingUserId === user.id"
                  @click="promoteUser(user, UserRoleEnum.Coordinator)"
                >
                  {{
                    userHasRole(user, UserRoleEnum.Coordinator)
                      ? t('admin.userRoles.removeRole', { role: translateRole(UserRoleEnum.Coordinator) })
                      : t('admin.userRoles.assignRole', { role: translateRole(UserRoleEnum.Coordinator) })
                  }}
                </v-btn>
              </div>
            </template>
          </v-list-item>
        </v-list>
      </v-card-text>
    </v-card>

    <v-snackbar
      v-model="snackbar.open"
      :color="snackbar.color"
      timeout="3000"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
