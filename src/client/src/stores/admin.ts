import { defineStore } from 'pinia'
import { http } from '../services/http'
import type { PendingUser, RoleAssignment, RoleDefinition, RoleScope, UserRow } from '../types/admin'
import type { UserRole } from '../types/auth'
import { isUserRole, normalizeUserRoles } from '../utils/roles'
import type { AssignRoleCommand, PaginatedUsersDto, UserDto } from '@strzel-sobie/common'
import type { Role } from '@strzel-sobie/common/models'

const mapRoleToAssignment = (role: Role, rangeId?: number): RoleAssignment | null => {
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

const mapUserDtoToRow = (user: UserDto): UserRow => {
  const globalRoles = (user.roles ?? [])
    .map((role) => mapRoleToAssignment(role))
    .filter((role): role is RoleAssignment => role !== null && role.scope === 'global')

  const rangeRolesEntries = Object.entries(user.rangeRoles ?? {}).reduce<Record<string, RoleAssignment[]>>(
    (acc, [rangeId, roles]) => {
      const assignments = roles
        .map((role) => mapRoleToAssignment(role, Number(rangeId)))
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

const extractRoleNames = (roles: unknown): UserRole[] => {
  if (!Array.isArray(roles)) {
    return []
  }

  const roleNames = roles
    .map((role) => {
      if (typeof role === 'string' && isUserRole(role)) {
        return role
      }

      if (role && typeof role === 'object' && 'name' in role) {
        const name = (role as { name: unknown }).name
        if (typeof name === 'string' && isUserRole(name)) {
          return name
        }
      }

      return null
    })
    .filter((role): role is UserRole => role !== null)

  return normalizeUserRoles(roleNames)
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
        const { data } = await http.get<PaginatedUsersDto>('/users')
        this.users = data.data.map(mapUserDtoToRow)
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
        const { data } = await http.get<Role[]>('/user/roles')
        this.roles = data.filter((role): role is RoleDefinition => isUserRole(role.name))
      } finally {
        this.isLoadingRoles = false
      }

      return this.roles
    },
    async fetchPendingUsers() {
      this.isLoadingPending = true

      try {
        const { data } = await http.get<Partial<PaginatedUsersDto> & { users?: UserDto[] }>(
          '/users?status=pending-verification',
        )

        const mapToPendingUser = (user: UserDto | (UserDto & { currentRoles?: unknown })) => {
          const roleSourceRaw = (user as { currentRoles?: unknown }).currentRoles
          const roleSource = Array.isArray(roleSourceRaw) ? roleSourceRaw : user.roles ?? []

          return {
            id: String(user.id),
            email: user.email,
            submittedAt: user.createdAt,
            requestedRole: undefined,
            currentRoles: extractRoleNames(roleSource),
          }
        }

        if (Array.isArray(data.users)) {
          this.pendingUsers = data.users.map(mapToPendingUser)
          return this.pendingUsers
        }

        if (Array.isArray(data.data)) {
          this.pendingUsers = data.data.map(mapToPendingUser)
          return this.pendingUsers
        }

        this.pendingUsers = []
        return this.pendingUsers
      } finally {
        this.isLoadingPending = false
      }
    },
    async assignRole(userId: string, roleId: number, rangeId: number | null = null) {
      const payload: AssignRoleCommand = { roleId, rangeId }
      await http.post(`/users/${userId}/roles`, payload)
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

      const targetUser = this.pendingUsers.find((user) => user.id === userId)
      const isRoleAssigned = targetUser?.currentRoles?.includes(role) ?? false

      if (isRoleAssigned) {
        await this.revokeRole(userId, roleDefinition.id, null)
      } else {
        await this.assignRole(userId, roleDefinition.id, null)
      }

      this.pendingUsers = this.pendingUsers.map((user) => {
        if (user.id !== userId) {
          return user
        }

        const updatedRoles = new Set(user.currentRoles ?? [])

        if (isRoleAssigned) {
          updatedRoles.delete(role)
        } else {
          updatedRoles.add(role)
        }

        return {
          ...user,
          currentRoles: normalizeUserRoles(Array.from(updatedRoles)),
        }
      })
    },
    clear() {
      this.users = []
      this.pendingUsers = []
      this.roles = []
    },
  },
})
