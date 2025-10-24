import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthenticatedUser, UserRole } from '../types/auth'
import { http } from '../services/http'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  password: string
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isLoading = ref(false)
  const hasAttemptedFetch = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const defaultRangeSlug = computed(() => user.value?.defaultRangeSlug ?? 'dobczyce')

  const hasRole = (role: UserRole) => user.value?.roles.includes(role) ?? false
  const hasAnyRole = (roles: UserRole[]) => roles.some((role) => hasRole(role))

  const reset = () => {
    user.value = null
    hasAttemptedFetch.value = false
  }

  const fetchUser = async (force = false) => {
    if (!force && (user.value || hasAttemptedFetch.value)) {
      return user.value
    }

    isLoading.value = true
    hasAttemptedFetch.value = true

    try {
      const { data } = await http.get<AuthenticatedUser>('/auth/me')
      user.value = data
      return data
    } catch (error) {
      reset()
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const login = async (payload: LoginPayload) => {
    await http.post('/auth/login', payload)
    return fetchUser(true)
  }

  const register = async (payload: RegisterPayload) => {
    await http.post('/auth/register', payload)
    return fetchUser(true)
  }

  const logout = async () => {
    try {
      await http.post('/auth/logout')
    } finally {
      reset()
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    defaultRangeSlug,
    fetchUser,
    login,
    register,
    logout,
    reset,
    hasRole,
    hasAnyRole,
  }
})
