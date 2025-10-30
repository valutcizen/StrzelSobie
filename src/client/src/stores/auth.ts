import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthenticatedUser, RangeRolesMap, UserRole } from '../types/auth'
import { http } from '../services/http'
import { isUserRole, normalizeUserRoles } from '../utils/roles'

interface LoginPayload {
  email: string
  password: string
}

interface RegisterPayload {
  email: string
  password: string
}

interface MeResponse {
  id: number
  email: string
  phoneNumber: string | null
  roles: string[]
  rangeRoles: Record<string, string[]>
}

const dedupeRoles = (roles: string[]): UserRole[] => {
  const unique = new Set<UserRole>()

  for (const role of roles) {
    if (isUserRole(role)) {
      unique.add(role)
    }
  }

  return Array.from(unique)
}

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthenticatedUser | null>(null)
  const isLoading = ref(false)
  const hasAttemptedFetch = ref(false)

  const isAuthenticated = computed(() => user.value !== null)
  const defaultRangeSlug = computed(() => user.value?.defaultRangeSlug ?? 'dobczyce')

  const hasRole = (role: UserRole) => user.value?.roles.includes(role) ?? false
  const hasAnyRole = (roles: UserRole[]) => roles.some((role) => hasRole(role))
  const hasRangeRole = (role: UserRole) =>
    Object.values(user.value?.rangeRoles ?? {}).some((roles) => roles.includes(role))
  const hasAnyRangeRole = (roles: UserRole[]) => roles.some((role) => hasRangeRole(role))

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
      const { data } = await http.get<MeResponse>('/auth/me')

      const rangeRoles: RangeRolesMap = Object.entries(data.rangeRoles ?? {}).reduce(
        (acc, [rangeId, roles]) => {
          acc[rangeId] = dedupeRoles(roles)
          return acc
        },
        {} as RangeRolesMap,
      )

      const normalizedUser: AuthenticatedUser = {
        id: String(data.id),
        email: data.email,
        roles: normalizeUserRoles(data.roles),
        rangeRoles,
        defaultRangeSlug: user.value?.defaultRangeSlug ?? 'dobczyce',
      }

      user.value = normalizedUser
      return normalizedUser
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
    await http.post('/auth/login', payload)
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
    hasRangeRole,
    hasAnyRangeRole,
  }
})

export type AuthStore = ReturnType<typeof useAuthStore>
