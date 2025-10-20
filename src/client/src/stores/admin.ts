import { defineStore } from 'pinia'
import { http } from '../services/http'
import type { PendingUser, UserRow } from '../types/admin'
import type { UserRole } from '../types/auth'

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
        const { data } = await http.get<{ users: UserRow[] }>('/users')
        this.users = data.users
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
