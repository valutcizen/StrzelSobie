import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { AppRouteMeta } from './index'

export const setupRouterGuards = (router: Router, pinia: Pinia) => {
  const authStore = useAuthStore(pinia)

  router.beforeEach(async (to) => {
    const requiresAuth = to.matched.some((record) => (record.meta as AppRouteMeta | undefined)?.requiresAuth)

    if (to.name === 'Auth' && authStore.isAuthenticated) {
      return { name: 'RangeLanding', params: { rangeSlug: authStore.defaultRangeSlug } }
    }

    if (!requiresAuth) {
      return true
    }

    try {
      await authStore.fetchUser()
    } catch (error) {
      if (to.name !== 'Auth') {
        return { name: 'Auth', query: { redirect: to.fullPath } }
      }
      return true
    }

    if (!authStore.isAuthenticated) {
      return { name: 'Auth', query: { redirect: to.fullPath } }
    }

    const requiredRoles = to.meta?.requiredRoles
    const requiredRangeRoles = to.meta?.requiredRangeRoles

    const hasRequiredRoles =
      Array.isArray(requiredRoles) && requiredRoles.length > 0
        ? authStore.hasAnyRole(requiredRoles)
        : null

    const hasRequiredRangeRoles =
      Array.isArray(requiredRangeRoles) && requiredRangeRoles.length > 0
        ? authStore.hasAnyRangeRole(requiredRangeRoles)
        : null

    let isAuthorized = true

    if (hasRequiredRoles !== null && hasRequiredRangeRoles !== null) {
      isAuthorized = hasRequiredRoles || hasRequiredRangeRoles
    } else if (hasRequiredRoles !== null) {
      isAuthorized = hasRequiredRoles
    } else if (hasRequiredRangeRoles !== null) {
      isAuthorized = hasRequiredRangeRoles
    }

    if (!isAuthorized) {
      return { name: 'RangeLanding', params: { rangeSlug: authStore.defaultRangeSlug } }
    }

    return true
  })
}
