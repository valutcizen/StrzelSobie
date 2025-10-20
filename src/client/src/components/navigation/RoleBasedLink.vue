<template>
  <v-list-item
    v-if="isVisible"
    :prepend-icon="icon"
    :title="label"
    :to="to"
    link
  />
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
