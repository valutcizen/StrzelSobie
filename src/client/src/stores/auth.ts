import { defineStore } from 'pinia'
import type { AxiosError } from 'axios'
import { http } from '../services/http'
import type { AuthenticatedUser, UserRole } from '../types/auth'

interface CredentialsPayload {
  email: string
  password: string
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as AuthenticatedUser | null,
    isInitialized: false,
    isLoading: false,
    lastError: null as string | null,
  }),
  getters: {
    isAuthenticated: (state) => state.user !== null,
    roles: (state) => state.user?.roles ?? [],
    defaultRangeSlug: (state) => state.user?.defaultRangeSlug ?? null,
  },
  actions: {
    async bootstrap() {
      if (this.isInitialized) {
        return
      }

      try {
        this.isLoading = true
        const { data } = await http.get<AuthenticatedUser>('/auth/me')
        this.user = data
      } catch (error) {
        if ((error as AxiosError).response?.status === 401) {
          this.user = null
        }
      } finally {
        this.isLoading = false
        this.isInitialized = true
      }
    },
    async login(payload: CredentialsPayload) {
      this.lastError = null

      try {
        this.isLoading = true
        await http.post('/auth/login', payload)
        await this.bootstrap()
      } catch (error) {
        this.lastError = (error as Error).message
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async register(payload: CredentialsPayload) {
      this.lastError = null

      try {
        this.isLoading = true
        await http.post('/auth/register', payload)
        await this.bootstrap()
      } catch (error) {
        this.lastError = (error as Error).message
        throw error
      } finally {
        this.isLoading = false
      }
    },
    async logout() {
      try {
        await http.post('/auth/logout')
      } finally {
        this.reset()
      }
    },
    hasAnyRole(required: UserRole[]) {
      return required.some((role) => this.roles.includes(role))
    },
    setUser(user: AuthenticatedUser | null) {
      this.user = user
    },
    reset() {
      this.user = null
      this.isInitialized = false
      this.isLoading = false
      this.lastError = null
    },
  },
})
