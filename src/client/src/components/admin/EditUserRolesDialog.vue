<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { UserRow } from '@/types/admin'
import { UserRoleEnum, type UserRole } from '@/types/auth'
import { EDITABLE_USER_ROLES, getRoleTranslationKey } from '@/utils/roles'

const props = withDefaults(
  defineProps<{
    open: boolean
    user: UserRow | null
    loading?: boolean
    assignedRoles?: UserRole[]
    availableRoles?: UserRole[]
    fixedRoles?: UserRole[]
  }>(),
  {
    loading: false,
    assignedRoles: () => [],
    availableRoles: () => EDITABLE_USER_ROLES.slice(),
    fixedRoles: () => [UserRoleEnum.Guest],
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

const fixedRoles = computed<UserRole[]>(() => props.fixedRoles)

const roleOptions = computed(() =>
  props.availableRoles.map((role) => ({
    value: role,
    title: t(getRoleTranslationKey(role)),
  })),
)

const assignedRoles = computed<UserRole[]>(() => {
  const unique = new Set<UserRole>([...fixedRoles.value, ...editedRoles.value])
  return Array.from(unique)
})

const translateRole = (role: UserRole) => t(getRoleTranslationKey(role))

const fixedRoleLabel = computed(() =>
  fixedRoles.value.length > 0 ? translateRole(fixedRoles.value[0]) : null,
)

watch(
  () => [props.user, props.assignedRoles],
  () => {
    const immutable = new Set(fixedRoles.value)
    const selectableRoles = (props.assignedRoles ?? []).filter((role) => !immutable.has(role))
    editedRoles.value = selectableRoles
  },
  { immediate: true },
)

const handleSave = () => {
  const uniqueRoles = Array.from(new Set<UserRole>([...fixedRoles.value, ...editedRoles.value]))
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
    data-testid="edit-user-roles-dialog"
  >
    <v-card>
      <v-card-title class="text-h6">
        {{ t('admin.userRoles.editTitle') }}
      </v-card-title>
      <v-card-subtitle v-if="user">
        {{ user.email }}
      </v-card-subtitle>
      <v-card-text>
        <v-alert
          v-if="fixedRoleLabel"
          border="start"
          density="compact"
          type="info"
          variant="tonal"
          class="mb-4"
        >
          {{ t('admin.userRoles.guestImmutableHint', { role: fixedRoleLabel }) }}
        </v-alert>
        <v-select
          v-model="editedRoles"
          :items="roleOptions"
          item-title="title"
          item-value="value"
          :label="t('admin.userRoles.selectRolesLabel')"
          multiple
          chips
          closable-chips
          :disabled="loading"
          data-testid="edit-user-roles-select"
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
          data-testid="edit-user-roles-cancel-button"
          @click="handleCancel"
        >
          {{ t('common.actions.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          :loading="loading"
          data-testid="edit-user-roles-save-button"
          @click="handleSave"
        >
          {{ t('common.actions.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>
