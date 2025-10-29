<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserRow } from '@/types/admin'
import type { UserRole } from '@/types/auth'
import { EDITABLE_USER_ROLES, getRoleTranslationKey } from '@/utils/roles'

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

const { t } = useI18n()

const dialogModel = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const editedRoles = ref<UserRole[]>([])

const guestLabel = computed(() => t(getRoleTranslationKey('Guest')))

const roleOptions = computed(() =>
  EDITABLE_USER_ROLES.map((role) => ({
    value: role,
    title: t(getRoleTranslationKey(role)),
  })),
)

const assignedRoles = computed<UserRole[]>(() => [
  'Guest',
  ...editedRoles.value,
])

const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

watch(
  () => props.user,
  (user) => {
    editedRoles.value = user ? user.roles.filter((role) => role !== 'Guest') : []
  },
  { immediate: true },
)

const handleSave = () => {
  const uniqueRoles = Array.from(new Set<UserRole>(['Guest', ...editedRoles.value]))
  emit('save', uniqueRoles)
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
        <v-alert
          border="start"
          density="compact"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          {{ t('admin.userRoles.guestImmutableHint', { role: guestLabel }) }}
        </v-alert>
        <v-select
          v-model="editedRoles"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          label="Role"
          multiple
          chips
          closable-chips
          :disabled="loading"
        />
        <div class="mt-4">
          <span class="text-subtitle-2 text-medium-emphasis">
            {{ t('admin.userRoles.currentRolesLabel') }}
          </span>
          <v-chip-group
            class="mt-2"
            selected-class="text-white"
          >
            <v-chip
              v-for="role in assignedRoles"
              :key="role"
              color="primary"
              size="small"
              variant="tonal"
            >
              {{ translateRole(role) }}
            </v-chip>
          </v-chip-group>
        </div>
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
