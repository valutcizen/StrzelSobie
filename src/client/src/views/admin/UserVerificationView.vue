<script setup lang="ts">
import { formatDistanceToNow } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import { computed, onMounted, reactive, ref } from 'vue'
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

const { t, locale } = useI18n()

const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))

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
      error instanceof Error ? error.message : t('admin.verification.errors.fetch')
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
      error instanceof Error ? error.message : t('common.feedback.operationFailed')
    snackbar.open = true
    snackbar.message = t('admin.verification.snackbarError')
    snackbar.color = 'error'
  } finally {
    loadingUserId.value = null
  }
}

const formatSubmittedAt = (value: string) => {
  try {
    return formatDistanceToNow(new Date(value), { locale: dateLocale.value, addSuffix: true })
  } catch {
    return value
  }
}

onMounted(() => {
  fetchPendingUsers()
})
</script>

<template>
  <v-container
    fluid
    data-testid="user-verification-view"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('admin.verification.title') }}</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          data-testid="user-verification-refresh-button"
          @click="fetchPendingUsers"
        >
          {{ t('admin.verification.refresh') }}
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
            {{ t('admin.verification.empty') }}
          </p>
        </div>

        <v-list v-else>
          <v-list-item
            v-for="user in adminStore.pendingUsers"
            :key="user.id"
            class="py-4"
            :data-testid="`user-verification-item-${user.id}`"
          >
            <template #title>
              <div class="d-flex flex-column">
                <span class="text-subtitle-1 font-weight-medium">{{ user.email }}</span>
                <span class="text-caption text-medium-emphasis">
                  {{ t('admin.verification.submittedAt', { timeAgo: formatSubmittedAt(user.submittedAt) }) }}
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
                  :data-testid="`user-verification-promote-member-button-${user.id}`"
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
                  :data-testid="`user-verification-promote-coordinator-button-${user.id}`"
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
      data-testid="user-verification-snackbar"
    >
      {{ snackbar.message }}
    </v-snackbar>
  </v-container>
</template>
