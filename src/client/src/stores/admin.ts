import { defineStore } from 'pinia'
import { http } from '../services/http'
import type { PendingUser, RoleAssignment, RoleDefinition, RoleScope, UserRow } from '../types/admin'
import type { UserRole } from '../types/auth'
import { isUserRole, normalizeUserRoles } from '../utils/roles'

type WorkerRoleDto = {
  id: number
  name: string
  scope: RoleScope
}

type WorkerUserDto = {
  id: number
  email: string
  isDeleted: 0 | 1
  createdAt: string
  roles?: WorkerRoleDto[]
  rangeRoles?: Record<string, WorkerRoleDto[]>
}

type PaginatedUsersResponse = {
  data: WorkerUserDto[]
  pagination: {
    total: number
    page: number
    limit: number
  }
}

const mapWorkerRoleToAssignment = (role: WorkerRoleDto, rangeId?: number): RoleAssignment | null => {
  if (!isUserRole(role.name)) {
    return null
  }

  return {
    id: role.id,
    name: role.name,
    scope: role.scope,
    rangeId,
  }
}

const mapWorkerUserToRow = (user: WorkerUserDto): UserRow => {
  const globalRoles = (user.roles ?? [])
    .map((role) => mapWorkerRoleToAssignment(role))
    .filter((role): role is RoleAssignment => role !== null && role.scope === 'global')

  const rangeRolesEntries = Object.entries(user.rangeRoles ?? {}).reduce<Record<string, RoleAssignment[]>>(
    (acc, [rangeId, roles]) => {
      const assignments = roles
        .map((role) => mapWorkerRoleToAssignment(role, Number(rangeId)))
        .filter((role): role is RoleAssignment => role !== null)

      if (assignments.length > 0) {
        acc[rangeId] = assignments
      }
      return acc
    },
    {},
  )

  return {
    id: String(user.id),
    email: user.email,
    createdAt: user.createdAt,
    globalRoles,
    globalRoleNames: normalizeUserRoles(globalRoles.map((role) => role.name)),
    rangeRoles: rangeRolesEntries,
  }
}

export const useAdminStore = defineStore('admin', {
  state: () => ({
    users: [] as UserRow[],
    pendingUsers: [] as PendingUser[],
    isLoadingUsers: false,
    isLoadingPending: false,
    roles: [] as RoleDefinition[],
    isLoadingRoles: false,
  }),
  getters: {
    globalRoleDefinitions(state): RoleDefinition[] {
      return state.roles.filter((role) => role.scope === 'global')
    },
    rangeRoleDefinitions(state): RoleDefinition[] {
      return state.roles.filter((role) => role.scope === 'range')
    },
    roleByName: (state) => (roleName: UserRole, scope?: RoleScope) => {
      return state.roles.find(
        (role) => role.name === roleName && (scope ? role.scope === scope : true),
      )
    },
  },
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
    async fetchRoles(force = false) {
      if (!force && this.roles.length > 0) {
        return this.roles
      }

      this.isLoadingRoles = true

      try {
        const { data } = await http.get<WorkerRoleDto[]>('/user/roles')
        this.roles = data
          .map((role) => (isUserRole(role.name) ? role : null))
          .filter((role): role is RoleDefinition => role !== null)
      } finally {
        this.isLoadingRoles = false
      }

      return this.roles
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
    async assignRole(userId: string, roleId: number, rangeId: number | null = null) {
      await http.post(`/users/${userId}/roles`, { roleId, rangeId })
    },
    async revokeRole(userId: string, roleId: number, rangeId: number | null = null) {
      const query = rangeId !== null ? `?rangeId=${rangeId}` : ''
      await http.delete(`/users/${userId}/roles/${roleId}${query}`)
    },
    async promotePendingUser(userId: string, role: UserRole) {
      await this.fetchRoles()
      const roleDefinition = this.roles.find((definition) => definition.name === role && definition.scope === 'global')

      if (!roleDefinition) {
        throw new Error(`Role ${role} is not available for promotion`)
      }

      await this.assignRole(userId, roleDefinition.id, null)
      this.pendingUsers = this.pendingUsers.filter((user) => user.id !== userId)
    },
    clear() {
      this.users = []
      this.pendingUsers = []
      this.roles = []
    },
  },
})
