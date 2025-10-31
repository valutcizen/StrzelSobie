import type { Role } from '@strzel-sobie/common/models'
import type { UserRole } from './auth'

export type RoleScope = Role['scope']
export type RoleDefinition = Role

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
  currentRoles?: UserRole[]
}
