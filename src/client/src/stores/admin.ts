import { defineStore } from 'pinia'
import { http } from '../services/http'
import type { PendingUser, UserRow } from '../types/admin'
import type { UserRole } from '../types/auth'
import { normalizeUserRoles } from '../utils/roles'

type WorkerRoleDto = {
  id: number
  name: string
  scope: 'global' | 'range'
}

type WorkerUserDto = {
  id: number
  email: string
  isDeleted: 0 | 1
  createdAt: string
  roles?: WorkerRoleDto[]
}

type PaginatedUsersResponse = {
  data: WorkerUserDto[]
  pagination: {
    total: number
    page: number
    limit: number
  }
}

const mapWorkerUserToRow = (user: WorkerUserDto): UserRow => ({
  id: String(user.id),
  email: user.email,
  createdAt: user.createdAt,
  roles: normalizeUserRoles((user.roles ?? []).map((role) => role.name)),
})

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [] as UserRow[],
    pendingUsers: [] as PendingUser[],
    isLoadingUsers: false,
    isLoadingPending: false,
  }),
  actions: {
    async fetchUsers() {
      this.isLoadingUsers = true

      try {
        const { data } = await http.get<PaginatedUsersResponse>('/users')
        this.users = data.data.map(mapWorkerUserToRow)
      } finally {
        this.isLoadingUsers = false
      }
    },
    async fetchPendingUsers() {
      this.isLoadingPending = true

      try {
        const { data } = await http.get<{ users: PendingUser[] }>('/users?status=pending-verification')
        this.pendingUsers = data.users
      } finally {
        this.isLoadingPending = false
      }
    },
    async assignRole(userId: string, role: UserRole) {
      await http.post(`/users/${userId}/roles`, { role })
      await this.fetchUsers()
    },
    async revokeRole(userId: string, role: UserRole) {
      await http.delete(`/users/${userId}/roles/${encodeURIComponent(role)}`)
      await this.fetchUsers()
    },
    async promotePendingUser(userId: string, role: UserRole) {
      await this.assignRole(userId, role)
      this.pendingUsers = this.pendingUsers.filter((user) => user.id !== userId)
    },
    clear() {
      this.users = []
      this.pendingUsers = []
    },
  },
})
