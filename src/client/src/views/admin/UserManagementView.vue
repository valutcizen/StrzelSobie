<template>
  <v-container>
    <v-card>
      <v-card-title>{{ t('admin.users.title') }}</v-card-title>
      <v-data-table
        :headers="headers"
        :items="adminStore.users"
        :loading="adminStore.isLoadingUsers"
        class="elevation-0"
      >
        <template #item.roles="{ item }">
          <v-chip
            v-for="role in item.roles"
            :key="role"
            class="ma-1"
            color="primary"
            size="small"
            variant="tonal"
          >
            {{ role }}
          </v-chip>
        </template>
        <template #item.actions="{ item }">
          <v-btn
            color="primary"
            size="small"
            variant="text"
            @click="openRoleDialog(item)"
          >
            Edytuj role
          </v-btn>
        </template>
      </v-data-table>
    </v-card>
  </v-container>

  <v-dialog
    v-model="isRoleDialogOpen"
    max-width="480"
  >
    <v-card>
      <v-card-title>Aktualizuj role</v-card-title>
      <v-card-text>
        <v-chip-group
          v-model="selectedRoles"
          column
          multiple
        >
          <v-chip
            v-for="role in availableRoles"
            :key="role"
            :value="role"
            variant="outlined"
          >
            {{ role }}
          </v-chip>
        </v-chip-group>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="closeRoleDialog">Anuluj</v-btn>
        <v-btn color="primary" @click="saveRoles">Zapisz</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from '../../stores/admin'
import type { UserRow } from '../../types/admin'
import type { UserRole } from '../../types/auth'

const adminStore = useAdminStore()
const { t } = useI18n()

const headers = computed(() => [
  { title: 'Email', key: 'email' },
  { title: 'Role', key: 'roles', sortable: false },
  { title: 'Utworzono', key: 'createdAt' },
  { title: '', key: 'actions', sortable: false },
])

const isRoleDialogOpen = ref(false)
const selectedUser = ref<UserRow | null>(null)
const selectedRoles = ref<UserRole[]>([])

const availableRoles: UserRole[] = [
  'Member',
  'Coordinator',
  'Confirmator',
  'Club/Community Administrator',
  'Shooting Range Administrator',
]

const openRoleDialog = (user: UserRow) => {
  selectedUser.value = user
  selectedRoles.value = [...user.roles]
  isRoleDialogOpen.value = true
}

const closeRoleDialog = () => {
  isRoleDialogOpen.value = false
  selectedUser.value = null
  selectedRoles.value = []
}

const saveRoles = async () => {
  if (!selectedUser.value) {
    return
  }

  const userId = selectedUser.value.id
  const missingRoles = selectedRoles.value.filter((role) => !selectedUser.value?.roles.includes(role))
  const removedRoles = selectedUser.value.roles.filter((role) => !selectedRoles.value.includes(role))

  await Promise.all([
    ...missingRoles.map((role) => adminStore.assignRole(userId, role)),
    ...removedRoles.map((role) => adminStore.revokeRole(userId, role)),
  ])

  closeRoleDialog()
}

onMounted(() => {
  void adminStore.fetchUsers()
})
</script>
