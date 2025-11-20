<script setup lang="ts">
import { format } from 'date-fns'
import { enUS, pl as plLocale } from 'date-fns/locale'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import EditUserRolesDialog from '@/components/admin/EditUserRolesDialog.vue'
import { useAdminStore } from '@/stores/admin'
import type { UserRow } from '@/types/admin'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import { getRoleTranslationKey, isUserRole } from '@/utils/roles'
import type { GetUsersOptions } from '@strzel-sobie/common'

type SortableColumn = NonNullable<GetUsersOptions['sortBy']>
type SortDirection = NonNullable<GetUsersOptions['sortOrder']>
type DataTableSort = { key: string; order?: 'asc' | 'desc' }
type DataTableOptions = { page: number; itemsPerPage: number; sortBy: DataTableSort[] }
type TableOptionsSnapshot = {
  page: number
  itemsPerPage: number
  sortBy: SortableColumn
  sortOrder: SortDirection
}

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
const lastRequestedOptions = ref<TableOptionsSnapshot | null>(null)
const isSyncingFromResponse = ref(false)

const { t, locale } = useI18n()

const dateLocale = computed(() => (locale.value === 'pl' ? plLocale : enUS))
const sortableColumns: SortableColumn[] = ['id', 'email', 'createdAt']

const headers = computed(() => [
  { title: t('admin.users.table.email'), key: 'email' },
  { title: t('admin.users.table.createdAt'), key: 'createdAt' },
  { title: t('admin.users.table.roles'), key: 'globalRoleNames', sortable: false },
  { title: t('admin.users.table.actions'), key: 'actions', sortable: false },
])

const tableState = reactive({
  page: 1,
  itemsPerPage: 10,
  sortBy: 'createdAt' as SortableColumn,
  sortOrder: 'desc' as SortDirection,
})

const tableSortBy = computed(() => [{ key: tableState.sortBy, order: tableState.sortOrder }])
const totalUsers = computed(() => adminStore.usersPagination.total)

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
      error instanceof Error ? error.message : t('admin.users.errors.fetchRoles')
    throw error
  }
}

const syncTableWithStore = () => {
  tableState.page = adminStore.usersPagination.page
  tableState.itemsPerPage = adminStore.usersPagination.limit
  tableState.sortBy = adminStore.usersSort.sortBy ?? tableState.sortBy
  tableState.sortOrder = adminStore.usersSort.sortOrder ?? tableState.sortOrder
}

const fetchUsers = async (
  overrides: Partial<{
    page: number
    itemsPerPage: number
    sortBy: SortableColumn
    sortOrder: SortDirection
  }> = {},
) => {
  lastError.value = null

  isSyncingFromResponse.value = true
  const page = Math.max(overrides.page ?? tableState.page, 1)
  const itemsPerPage = Math.max(overrides.itemsPerPage ?? tableState.itemsPerPage, 1)
  const sortBy = overrides.sortBy ?? tableState.sortBy
  const sortOrder = overrides.sortOrder ?? tableState.sortOrder

  tableState.page = page
  tableState.itemsPerPage = itemsPerPage
  tableState.sortBy = sortBy
  tableState.sortOrder = sortOrder

  lastRequestedOptions.value = {
    page,
    itemsPerPage,
    sortBy,
    sortOrder,
  }

  try {
    await adminStore.fetchUsers({
      page,
      limit: itemsPerPage,
      sortBy,
      sortOrder,
    })
    syncTableWithStore()
  } catch (error) {
    lastError.value = error instanceof Error ? error.message : t('admin.users.errors.fetch')
  } finally {
    await nextTick()
    isSyncingFromResponse.value = false
  }
}

const initialize = async () => {
  syncTableWithStore()
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
        console.error('Missing role definition', role)
        throw new Error(t('admin.users.errors.fetchRoles'))
      }
      await adminStore.assignRole(selectedUser.value.id, roleDefinition.id, null)
    }

    for (const assignment of rolesToRemove) {
      await adminStore.revokeRole(selectedUser.value.id, assignment.id, null)
    }

    const refreshPromise = fetchUsers()
    showSnackbar(t('admin.users.snackbarSuccess'))
    await refreshPromise
    closeDialog()
  } catch (error) {
    lastError.value =
      error instanceof Error ? error.message : t('admin.users.snackbarError')
    showSnackbar(t('admin.users.snackbarError'), 'error')
  } finally {
    isSavingRoles.value = false
  }
}

const formatDate = (value: string) => {
  try {
    return format(new Date(value), 'Pp', { locale: dateLocale.value })
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

const handleTableOptionsUpdate = (options: DataTableOptions) => {
  if (isSyncingFromResponse.value || adminStore.isLoadingUsers) {
    return
  }

  const [sort] = options.sortBy
  const sortBy = sortableColumns.includes(sort?.key as SortableColumn)
    ? (sort?.key as SortableColumn)
    : tableState.sortBy
  const sortOrder: SortDirection =
    sort?.order === 'asc' || sort?.order === 'desc' ? sort.order : tableState.sortOrder

  if (
    lastRequestedOptions.value &&
    lastRequestedOptions.value.page === options.page &&
    lastRequestedOptions.value.itemsPerPage === options.itemsPerPage &&
    lastRequestedOptions.value.sortBy === sortBy &&
    lastRequestedOptions.value.sortOrder === sortOrder
  ) {
    tableState.page = lastRequestedOptions.value.page
    tableState.itemsPerPage = lastRequestedOptions.value.itemsPerPage
    tableState.sortBy = lastRequestedOptions.value.sortBy
    tableState.sortOrder = lastRequestedOptions.value.sortOrder
    return
  }

  void fetchUsers({
    page: options.page,
    itemsPerPage: options.itemsPerPage,
    sortBy,
    sortOrder,
  })
}
</script>

<template>
  <v-container
    fluid
    data-testid="user-management-view"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{ t('admin.users.title') }}</span>
        <v-btn
          color="primary"
          prepend-icon="mdi-refresh"
          data-testid="user-management-refresh-button"
          @click="fetchUsers"
        >
          {{ t('admin.users.refresh') }}
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

      <v-data-table-server
        :headers="headers"
        :items="adminStore.users"
        :items-length="totalUsers"
        :loading="adminStore.isLoadingUsers"
        v-model:page="tableState.page"
        v-model:items-per-page="tableState.itemsPerPage"
        :sort-by="tableSortBy"
        class="elevation-0"
        data-testid="user-management-table"
        @update:options="handleTableOptionsUpdate"
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
            :data-testid="`user-management-edit-button-${item.id}`"
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
              {{ t('admin.users.table.empty') }}
            </p>
          </div>
        </template>
      </v-data-table-server>
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
      timeout="6000"
      data-testid="user-management-snackbar"
    >
      {{ snackbarState.message }}
    </v-snackbar>
  </v-container>
</template>
