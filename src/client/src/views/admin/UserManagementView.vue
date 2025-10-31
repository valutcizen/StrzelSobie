<script setup lang="ts">
import { format } from 'date-fns'
import { pl } from 'date-fns/locale'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import EditUserRolesDialog from '@/components/admin/EditUserRolesDialog.vue'
import { useAdminStore } from '@/stores/admin'
import type { UserRow } from '@/types/admin'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import { getRoleTranslationKey, isUserRole } from '@/utils/roles'

const adminStore = useAdminStore()
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
  { title: 'Role', key: 'globalRoleNames', sortable: false },
  { title: 'Akcje', key: 'actions', sortable: false },
]

const showSnackbar = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarState.open = true
  snackbarState.message = message
  snackbarState.color = color
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

const fetchUsers = async () => {
  lastError.value = null
  try {
    await adminStore.fetchUsers()
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : 'Nie udało się pobrać użytkowników.'
  }
}

const initialize = async () => {
  try {
    await Promise.all([loadRoles(), fetchUsers()])
  } catch {
    // Errors are captured in local state handlers.
  }
}

onMounted(() => {
  void initialize()
})

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

const syncRolesForUser = async (updatedRoles: UserRole[]) => {
  if (!selectedUser.value) {
    return
  }

  isSavingRoles.value = true
  lastError.value = null

  const immutableRoles = new Set<UserRole>([UserRoleEnum.Guest])
  const currentAssignments = selectedUser.value.globalRoles.filter((assignment) => {
    if (typeof assignment.name !== 'string' || !isUserRole(assignment.name)) {
      return false
    }
    return !immutableRoles.has(assignment.name)
  })
  const currentRoleNames = new Set<UserRole>(
    currentAssignments
      .map((assignment) => assignment.name)
      .filter((name): name is string => typeof name === 'string')
      .filter(isUserRole),
  )
  const desiredRoleNames = updatedRoles.filter((role) => !immutableRoles.has(role))

  const rolesToAdd = desiredRoleNames.filter((role) => !currentRoleNames.has(role))
  const rolesToRemove = currentAssignments.filter((assignment) => {
    if (typeof assignment.name !== 'string' || !isUserRole(assignment.name)) {
      return false
    }
    return !desiredRoleNames.includes(assignment.name)
  })

  try {
    await loadRoles()

    for (const role of rolesToAdd) {
      const roleDefinition = adminStore.roleByName(role, 'global')
      if (!roleDefinition) {
        throw new Error(`Nie znaleziono definicji roli ${role}`)
      }
      await adminStore.assignRole(selectedUser.value.id, roleDefinition.id, null)
    }

    for (const assignment of rolesToRemove) {
      await adminStore.revokeRole(selectedUser.value.id, assignment.id, null)
    }

    await adminStore.fetchUsers()
    showSnackbar('Role użytkownika zostały zaktualizowane.')
    closeDialog()
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : 'Nie udało się zaktualizować ról użytkownika.'
    showSnackbar('Nie udało się zaktualizować ról.', 'error')
  } finally {
    isSavingRoles.value = false
  }
}

const formatDate = (value: string) => {
  try {
    return format(new Date(value), 'Pp', { locale: pl })
  } catch {
    return value
  }
}

const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

const availableGlobalRoleOptions = computed<UserRole[]>(() =>
  adminStore.globalRoleDefinitions
    .map((role) => role.name)
    .filter((name): name is string => typeof name === 'string')
    .filter(isUserRole)
    .filter((role) => role !== UserRoleEnum.Guest),
)

const selectedUserRoles = computed<UserRole[]>(() => selectedUser.value?.globalRoleNames ?? [])
</script>

<template>
  <v-container fluid>
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>Zarządzanie użytkownikami</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          @click="fetchUsers"
        >
          Odśwież
        </v-btn>
      </v-card-title>

      <v-progress-linear
        v-if="adminStore.isLoadingUsers"
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

        <template #item.globalRoleNames="{ item }">
          <v-chip-group selected-class="text-white">
            <v-chip
              v-for="role in item.globalRoleNames"
              :key="role"
              color="primary"
              variant="tonal"
              size="small"
            >
              {{ translateRole(role) }}
            </v-chip>
          </v-chip-group>
        </template>

        <template #item.actions="{ item }">
          <v-btn
            icon
            variant="text"
            color="primary"
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
              mdi-account-off
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
      :assigned-roles="selectedUserRoles"
      :available-roles="availableGlobalRoleOptions"
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
