import type { UserRole } from './auth'

export type RoleScope = 'global' | 'range'

export interface RoleDefinition {
  id: number
  name: UserRole
  scope: RoleScope
}

export interface RoleAssignment extends RoleDefinition {
  rangeId?: number
}

export interface UserRow {
  id: string
  email: string
  createdAt: string
  globalRoles: RoleAssignment[]
  globalRoleNames: UserRole[]
  rangeRoles: Record<string, RoleAssignment[]>
}

export interface PendingUser {
  id: string
  email: string
  requestedRole?: UserRole
  submittedAt: string
}
