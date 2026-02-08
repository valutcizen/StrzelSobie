import type { Pinia } from 'pinia'
import type { Router } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAuthDialogStore } from '@/stores/authDialog'
import { useRangeStore } from '@/stores/range'
import { UserRoleEnum } from '@/types/auth'
import { getLastRangeId } from '@/utils/lastRange'
import type { AppRouteMeta } from './index'

export const setupRouterGuards = (router: Router, pinia: Pinia) => {
  const authStore = useAuthStore(pinia)
  const authDialogStore = useAuthDialogStore(pinia)
  const rangeStore = useRangeStore(pinia)
  const routesBypassingAuthRedirect = new Set(['RangeDirectory', 'RangeLanding', 'Calendar'])

  router.beforeEach(async (to) => {
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

    if (to.name === 'Calendar') {
      const slugParam = to.params.rangeSlug
      const rangeSlug = typeof slugParam === 'string' ? slugParam : getLastRangeId()

      if (!rangeSlug) {
        return { name: 'RangeDirectory' }
      }

      try {
        const range = await rangeStore.fetchRangeDetails(rangeSlug)
        if (range.type === 'meetup') {
          return { name: 'RangeLanding', params: { rangeSlug } }
        }
        if (!range.allowsReservations) {
          return { name: 'RangeLanding', params: { rangeSlug } }
        }
      } catch {
        return { name: 'RangeDirectory' }
      }
    }

    if (to.name === 'EventCreate') {
      const slugParam = to.params.rangeSlug
      const rangeSlug = typeof slugParam === 'string' ? slugParam : getLastRangeId()

      if (!rangeSlug) {
        return { name: 'RangeDirectory' }
      }

      const isGlobalAdmin = authStore.hasAnyRole([UserRoleEnum.ClubCommunityAdministrator])
      const isRangeAdmin = authStore.hasAnyRangeRole([UserRoleEnum.ShootingRangeAdministrator])
      const isMember = authStore.hasRole(UserRoleEnum.Member)

      if (!isGlobalAdmin && !isRangeAdmin) {
        if (!isMember) {
          return { name: 'RangeLanding', params: { rangeSlug } }
        }

        try {
          const range = await rangeStore.fetchRangeDetails(rangeSlug)
          const allowMemberEvents = range.extras?.allowMemberEvents ?? false
          if (!allowMemberEvents) {
            return { name: 'RangeLanding', params: { rangeSlug } }
          }
        } catch {
          return { name: 'RangeDirectory' }
        }
      }
    }

    const routeName = typeof to.name === 'string' ? to.name : null
    const requiresAuth = to.matched.some((record) => (record.meta as AppRouteMeta | undefined)?.requiresAuth)

    if (requiresAuth && !authStore.isAuthenticated) {
      if (routeName !== null && routesBypassingAuthRedirect.has(routeName)) {
        return true
      }

      authDialogStore.open({ tab: 'login', redirectPath: to.fullPath })

      const fallbackRange = getLastRangeId() ?? authStore.defaultRangeSlug
      const rangeSlug = typeof to.params.rangeSlug === 'string' ? to.params.rangeSlug : fallbackRange

      if (rangeSlug) {
        return { name: 'RangeLanding', params: { rangeSlug } }
      }

      return { name: 'RangeDirectory' }
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
