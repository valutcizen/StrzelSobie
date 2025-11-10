import axios from 'axios'
import type { Router } from 'vue-router'
import type { AuthStore } from '../stores/auth'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
})

let interceptorsConfigured = false

export const setupHttpInterceptors = (router: Router, authStore: AuthStore) => {
  if (interceptorsConfigured) {
    return
  }

  interceptorsConfigured = true

  http.interceptors.response.use(
    (response) => response,
    async (error) => {
      const status = error.response?.status

      if (status === 401 && error.config?.url === '/auth/me') {
        try {
          await http.post('/auth/logout')
        } catch (e) {
          console.error('Failed to logout', e)
        }
      }

      if (status === 401 || status === 403) {
        authStore.reset()

        if (router.currentRoute.value.name !== 'Auth') {
          await router.push({ name: 'Auth' })
        }
      }

      return Promise.reject(error)
    },
  )
}
