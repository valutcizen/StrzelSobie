import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AuthenticatedUser, RangeRolesMap, UserRole } from '../types/auth'
import { http } from '../services/http'
import { isUserRole, normalizeUserRoles } from '../utils/roles'
import type { LoginUserDto, RegisterUserRequestDto, MeDto } from '@strzel-sobie/common'

const UNAUTHORIZED_FLAG_KEY = 'authUnauthorized'

const readUnauthorizedFlag = () => {
  if (typeof localStorage === 'undefined') {
    return false
  }
  return localStorage.getItem(UNAUTHORIZED_FLAG_KEY) === '1'
}

const persistUnauthorizedFlag = (isUnauthorized: boolean) => {
  if (typeof localStorage === 'undefined') {
    return
  }

  if (isUnauthorized) {
    localStorage.setItem(UNAUTHORIZED_FLAG_KEY, '1')
    return
  }

  localStorage.removeItem(UNAUTHORIZED_FLAG_KEY)
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
  const hasUnauthorizedSession = ref(readUnauthorizedFlag())

  const isAuthenticated = computed(() => user.value !== null)
  const defaultRangeSlug = computed(() => user.value?.defaultRangeSlug ?? 'dobczyce')

  const hasRole = (role: UserRole) => user.value?.roles.includes(role) ?? false
  const hasAnyRole = (roles: UserRole[]) => roles.some((role) => hasRole(role))
  const hasRangeRole = (role: UserRole) =>
    Object.values(user.value?.rangeRoles ?? {}).some((roles) => roles.includes(role))
  const hasAnyRangeRole = (roles: UserRole[]) => roles.some((role) => hasRangeRole(role))

  const setUnauthorized = (value: boolean) => {
    hasUnauthorizedSession.value = value
    persistUnauthorizedFlag(value)
  }

  const reset = ({ preserveAttempt = false }: { preserveAttempt?: boolean } = {}) => {
    user.value = null
    if (!preserveAttempt) {
      hasAttemptedFetch.value = false
    }
  }

  const fetchUser = async (force = false) => {
    if (!force && hasUnauthorizedSession.value) {
      hasAttemptedFetch.value = true
      return null
    }

    if (!force && (user.value || hasAttemptedFetch.value)) {
      return user.value
    }

    isLoading.value = true
    hasAttemptedFetch.value = true

    try {
      const { data } = await http.get<MeDto>('/auth/me')

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
      setUnauthorized(false)
      return normalizedUser
    } catch (error) {
      const status = (error as { response?: { status?: number } } | undefined)?.response?.status
      if (status === 401 || status === 403) {
        setUnauthorized(true)
      }
      reset({ preserveAttempt: true })
      throw error
    } finally {
      isLoading.value = false
    }
  }

  const login = async (payload: LoginUserDto) => {
    await http.post('/auth/login', payload)
    return fetchUser(true)
  }

  const register = async (payload: RegisterUserRequestDto) => {
    await http.post('/auth/register', payload)
    await http.post('/auth/login', payload)
    return fetchUser(true)
  }

  const logout = async () => {
    try {
      await http.post('/auth/logout')
    } finally {
      setUnauthorized(true)
      reset({ preserveAttempt: true })
    }
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    defaultRangeSlug,
    hasUnauthorizedSession,
    fetchUser,
    login,
    register,
    logout,
    reset,
    setUnauthorized,
    hasRole,
    hasAnyRole,
    hasRangeRole,
    hasAnyRangeRole,
  }
})

export type AuthStore = ReturnType<typeof useAuthStore>
