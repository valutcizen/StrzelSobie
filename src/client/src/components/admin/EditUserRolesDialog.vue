<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { UserRow } from '@/types/admin'
import type { UserRole } from '@/types/auth'

const props = withDefaults(
  defineProps<{
    open: boolean
    user: UserRow | null
    loading?: boolean
  }>(),
  {
    loading: false,
  },
)

const emit = defineEmits<{
  'update:open': [value: boolean]
  save: [roles: UserRole[]]
}>()

const allRoles: UserRole[] = [
  'Guest',
  'Member',
  'Coordinator',
  'Confirmator',
  'Shooting Range Administrator',
  'Club/Community Administrator',
]

const dialogModel = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const editedRoles = ref<UserRole[]>([])

watch(
  () => props.user,
  (user) => {
    editedRoles.value = user ? [...user.roles] : []
  },
  { immediate: true },
)

const handleSave = () => {
  emit('save', [...editedRoles.value])
}

const handleCancel = () => {
  emit('update:open', false)
}
</script>

<template>
  <v-dialog
    v-model="dialogModel"
    max-width="520"
    :persistent="loading"
  >
    <v-card>
      <v-card-title class="text-h6">
        Edytuj role użytkownika
      </v-card-title>
      <v-card-subtitle v-if="user">
        {{ user.email }}
      </v-card-subtitle>
      <v-card-text>
        <v-select
          v-model="editedRoles"
          :items="allRoles"
          label="Role"
          multiple
          chips
          closable-chips
          :disabled="loading"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="loading"
          @click="handleCancel"
        >
          Anuluj
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          @click="handleSave"
        >
          Zapisz
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
