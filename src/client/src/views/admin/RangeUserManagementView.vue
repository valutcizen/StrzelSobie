<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import EditUserRolesDialog from '@/components/admin/EditUserRolesDialog.vue'
import { useAdminStore } from '@/stores/admin'
import { useAuthStore } from '@/stores/auth'
import { http } from '@/services/http'
import type { UserRow } from '@/types/admin'
import type { UserRole } from '@/types/auth'
import { getRoleTranslationKey, isUserRole } from '@/utils/roles'
import type { RangeSummaryDto } from '@strzel-sobie/common'

const adminStore = useAdminStore()
const authStore = useAuthStore()

const rangeId = ref<number | null>(null)
const rangeName = ref<string>('')

const selectedUser = ref<UserRow | null>(null)
const isDialogOpen = ref(false)
const isSavingRoles = ref(false)
const snackbarState = reactive({
  open: false,
  message: '',
  color: 'success' as 'success' | 'error',
})
const lastError = ref<string | null>(null)

const { t } = useI18n()

const headers = [
  { title: 'Email', key: 'email' },
  { title: 'Data utworzenia', key: 'createdAt' },
  { title: 'Role dla strzelnicy', key: 'rangeRoles', sortable: false },
  { title: 'Akcje', key: 'actions', sortable: false },
]

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarState.open = true
  snackbarState.message = message
  snackbarState.color = color
}

const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

const formatDate = (value: string) => {
  try {
    return format(new Date(value), 'Pp', { locale: pl })
  } catch {
    return value
  }
}

const currentRangeSlug = computed(() => authStore.defaultRangeSlug)

const fetchRangeMetadata = async () => {
  lastError.value = null

  try {
    const { data } = await http.get<RangeSummaryDto[]>('/ranges')
    const match = data.find((range) => range.slug === currentRangeSlug.value)

    if (!match) {
      throw new Error('Nie znaleziono strzelnicy dla bieżącego użytkownika.')
    }

    rangeId.value = match.id
    rangeName.value = match.displayName
  } catch (error) {
    rangeId.value = null
    rangeName.value = ''
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się pobrać danych strzelnicy.'
    throw error
  }
}

const fetchUsers = async () => {
  try {
    await adminStore.fetchUsers()
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się pobrać użytkowników.'
    throw error
  }
}

const loadRoles = async () => {
  try {
    await adminStore.fetchRoles()
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się pobrać listy ról.'
    throw error
  }
}

const initialize = async () => {
  try {
    await Promise.all([loadRoles(), fetchRangeMetadata(), fetchUsers()])
  } catch {
    // handled in called functions
  }
}

onMounted(() => {
  void initialize()
})

watch(
  () => currentRangeSlug.value,
  () => {
    void initialize()
  },
)

const openEditDialog = (user: UserRow) => {
  selectedUser.value = user
  isDialogOpen.value = true
}

const closeDialog = () => {
  selectedUser.value = null
  isDialogOpen.value = false
}

watch(
  () => isDialogOpen.value,
  (isOpen) => {
    if (!isOpen) {
      selectedUser.value = null
    }
  },
)

const selectedRangeRoleNames = computed<UserRole[]>(() => {
  if (!selectedUser.value || rangeId.value === null) {
    return []
  }

  const assignments = selectedUser.value.rangeRoles[String(rangeId.value)] ?? []
  return assignments
    .map((assignment) => assignment.name)
    .filter((name): name is string => typeof name === 'string')
    .filter(isUserRole)
})

const availableRangeRoleOptions = computed<UserRole[]>(() =>
  adminStore.rangeRoleDefinitions
    .map((role) => role.name)
    .filter((name): name is string => typeof name === 'string')
    .filter(isUserRole),
)

const resolveRangeRoleNames = (user: UserRow): UserRole[] => {
  if (rangeId.value === null) {
    return []
  }

  const assignments = user.rangeRoles[String(rangeId.value)] ?? []
  return assignments
    .map((assignment) => assignment.name)
    .filter((name): name is string => typeof name === 'string')
    .filter(isUserRole)
}

const syncRolesForUser = async (updatedRoles: UserRole[]) => {
  if (!selectedUser.value || rangeId.value === null) {
    return
  }

  isSavingRoles.value = true
  lastError.value = null

  const assignments = selectedUser.value.rangeRoles[String(rangeId.value)] ?? []
  const currentRoleNames = new Set<UserRole>(
    assignments
      .map((assignment) => assignment.name)
      .filter((name): name is string => typeof name === 'string')
      .filter(isUserRole),
  )
  const desiredRoleNames = Array.from(new Set(updatedRoles))

  const rolesToAdd = desiredRoleNames.filter((role) => !currentRoleNames.has(role))
  const rolesToRemove = assignments.filter((assignment) => {
    if (typeof assignment.name !== 'string' || !isUserRole(assignment.name)) {
      return false
    }
    return !desiredRoleNames.includes(assignment.name)
  })

  try {
    await loadRoles()

    for (const role of rolesToAdd) {
      const definition = adminStore.roleByName(role, 'range')
      if (!definition) {
        throw new Error(`Nie znaleziono definicji roli ${role}`)
      }
      await adminStore.assignRole(selectedUser.value.id, definition.id, rangeId.value)
    }

    for (const assignment of rolesToRemove) {
      await adminStore.revokeRole(selectedUser.value.id, assignment.id, rangeId.value)
    }

    await adminStore.fetchUsers()
    showSnackbar('Role użytkownika dla tej strzelnicy zostały zaktualizowane.')
    closeDialog()
  } catch (error) {
    lastError.value =
      error instanceof Error
        ? error.message
        : 'Nie udało się zaktualizować ról użytkownika dla tej strzelnicy.'
    showSnackbar('Nie udało się zaktualizować ról.', 'error')
  } finally {
    isSavingRoles.value = false
  }
}
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <div class="d-flex flex-column">
          <span>Zarządzanie rolami strzelnicy</span>
          <span
            v-if="rangeName"
            class="text-caption text-medium-emphasis"
          >
            {{ rangeName }}
          </span>
        </div>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          @click="initialize"
        >
          Odśwież
        </v-btn>
      </v-card-title>

      <v-progress-linear
        v-if="adminStore.isLoadingUsers || adminStore.isLoadingRoles"
        indeterminate
        color="primary"
      />

      <v-alert
        v-if="lastError"
        type="error"
        variant="tonal"
        class="mx-4 mt-4"
        border="start"
        prominent
      >
        {{ lastError }}
      </v-alert>

      <v-data-table
        :headers="headers"
        :items="adminStore.users"
        :loading="adminStore.isLoadingUsers"
        class="elevation-0"
      >
        <template #item.createdAt="{ item }">
          {{ formatDate(item.createdAt) }}
        </template>

        <template #item.rangeRoles="{ item }">
          <v-chip-group selected-class="text-white">
            <v-chip
              v-for="role in resolveRangeRoleNames(item)"
              :key="role"
              color="primary"
              variant="tonal"
              size="small"
            >
              {{ translateRole(role) }}
            </v-chip>
            <span
              v-if="resolveRangeRoleNames(item).length === 0"
              class="text-body-2 text-medium-emphasis"
            >
              Brak ról przypisanych do tej strzelnicy.
            </span>
          </v-chip-group>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon
            variant="text"
            color="primary"
            :disabled="rangeId === null"
            @click="openEditDialog(item)"
          >
            <v-icon>mdi-pencil</v-icon>
          </v-btn>
        </template>

        <template #no-data>
          <div class="text-center py-8">
            <v-icon
              size="48"
              color="grey"
            >
              mdi-target-account
            </v-icon>
            <p class="text-subtitle-2 mt-2">
              Brak użytkowników do wyświetlenia.
            </p>
          </div>
        </template>
      </v-data-table>
    </v-card>

    <EditUserRolesDialog
      :open="isDialogOpen"
      :user="selectedUser"
      :loading="isSavingRoles"
      :assigned-roles="selectedRangeRoleNames"
      :available-roles="availableRangeRoleOptions"
      :fixed-roles="[]"
      @update:open="isDialogOpen = $event"
      @save="syncRolesForUser"
    />

    <v-snackbar
      v-model="snackbarState.open"
      :color="snackbarState.color"
      timeout="3000"
    >
      {{ snackbarState.message }}
    </v-snackbar>
  </v-container>
</template>
