import axios from 'axios'
import type { Router } from 'vue-router'
import { useAuthDialogStore } from '@/stores/authDialog'
import { getLastRangeId } from '@/utils/lastRange'
import type { AuthStore } from '../stores/auth'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
})

let interceptorsConfigured = false
const routesBypassingAuthRedirect = new Set(['RangeDirectory', 'RangeLanding', 'Calendar'])

export const setupHttpInterceptors = (router: Router, authStore: AuthStore) => {
  if (interceptorsConfigured) {
    return
  }

  interceptorsConfigured = true
  const authDialogStore = useAuthDialogStore(authStore.$pinia)

  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status

      if (status === 401 || status === 403) {
        authStore.setUnauthorized(true)
        authStore.reset({ preserveAttempt: true })

        const currentRoute = router.currentRoute.value
        const requiresAuth = currentRoute.matched.some(
          (record) => (record.meta as { requiresAuth?: boolean } | undefined)?.requiresAuth,
        )
        const routeName = typeof currentRoute.name === 'string' ? currentRoute.name : null

        if (requiresAuth && (!routeName || !routesBypassingAuthRedirect.has(routeName))) {
          authDialogStore.open({ redirectPath: currentRoute.fullPath })

          const fallbackRange = typeof currentRoute.params?.rangeSlug === 'string'
            ? (currentRoute.params.rangeSlug as string)
            : getLastRangeId() ?? authStore.defaultRangeSlug

          if (fallbackRange) {
            await router.push({ name: 'RangeLanding', params: { rangeSlug: fallbackRange } })
          } else {
            await router.push({ name: 'RangeDirectory' })
          }
        }
      }

      return Promise.reject(error)
    },
  )
}
