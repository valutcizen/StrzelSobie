import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useRangeStore } from '@/stores/range'
import { getLastRangeId } from '@/utils/lastRange'
import type { AppRouteMeta } from './index'

export const setupRouterGuards = (router: Router, pinia: Pinia) => {
  const authStore = useAuthStore(pinia)
  const rangeStore = useRangeStore(pinia)
  const routesBypassingAuthRedirect = new Set(['RangeDirectory', 'RangeLanding', 'Calendar'])

  router.beforeEach(async (to) => {
    if (to.name === 'Root') {
      const storedRange = getLastRangeId()
      if (storedRange) {
        try {
          await rangeStore.fetchRangeDetails(storedRange)
          return { name: 'RangeLanding', params: { rangeSlug: storedRange } }
        } catch {
          // Fall through to directory when stored range cannot be loaded.
        }
      }
      return { name: 'RangeDirectory' }
    }

    try {
      await authStore.fetchUser()
    } catch {
      // Swallow errors for public routes; protected routes handle redirects below.
    }

    if (to.name === 'RangeSettings' || to.name === 'RangeUserManagement') {
      const querySlug = typeof to.query.rangeSlug === 'string' ? to.query.rangeSlug : null
      const storedRange = getLastRangeId() ?? authStore.defaultRangeSlug

      if (!querySlug) {
        if (storedRange) {
          return { ...to, query: { ...to.query, rangeSlug: storedRange } }
        }

        return { name: 'RangeDirectory' }
      }
    }

    if (to.name === 'Auth' && authStore.isAuthenticated) {
      const targetRange = getLastRangeId() ?? authStore.defaultRangeSlug
      return { name: 'RangeLanding', params: { rangeSlug: targetRange } }
    }

    if (to.name === 'Calendar') {
      const slugParam = to.params.rangeSlug
      const rangeSlug = typeof slugParam === 'string' ? slugParam : getLastRangeId()

      if (!rangeSlug) {
        return { name: 'RangeDirectory' }
      }

      try {
        const range = await rangeStore.fetchRangeDetails(rangeSlug)
        if (!range.allowsReservations) {
          return { name: 'RangeLanding', params: { rangeSlug }, query: { booking: 'unavailable' } }
        }
      } catch {
        return { name: 'RangeDirectory' }
      }
    }

    const routeName = typeof to.name === 'string' ? to.name : null
    const requiresAuth = to.matched.some((record) => (record.meta as AppRouteMeta | undefined)?.requiresAuth)

    if (requiresAuth && !authStore.isAuthenticated) {
      if (routeName !== null && routesBypassingAuthRedirect.has(routeName)) {
        return true
      }

      return { name: 'Auth', query: { redirect: to.fullPath } }
    }

    if (!requiresAuth) {
      return true
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
