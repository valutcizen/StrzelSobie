<template>
  <v-list-item
    v-if="isVisible"
    :to="to"
    :title="label"
    :aria-label="label"
    class="role-based-link"
    nav
    variant="text"
  >
    <template
      v-if="icon"
      #prepend
    >
      <v-icon :icon="icon" />
    </template>
    <v-list-item-title>{{ label }}</v-list-item-title>
  </v-list-item>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { UserRole } from '../../types/auth'
import { useAuthStore } from '../../stores/auth'

interface RoleBasedLinkProps {
  icon?: string
  label: string
  to: RouteLocationRaw
  roles?: UserRole[]
}

const props = defineProps<RoleBasedLinkProps>()

const authStore = useAuthStore()

const isVisible = computed(() => {
  if (!props.roles || props.roles.length === 0) {
    return true
  }

  return authStore.hasAnyRole(props.roles)
})
</script>

<style scoped>
.role-based-link {
  border-radius: 8px;
  color: inherit;
  transition: background-color 0.2s ease;
}

.role-based-link :deep(.v-list-item-title) {
  color: inherit;
  font-weight: 500;
}

.role-based-link :deep(.v-icon) {
  color: inherit;
}

.role-based-link:hover {
  background-color: rgba(255, 255, 255, 0.12);
}

.role-based-link.v-list-item--active {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>
