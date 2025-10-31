import { UserRole as CommonUserRole } from '@strzel-sobie/common/models'

export const UserRoleEnum = CommonUserRole
export type UserRole = (typeof CommonUserRole)[keyof typeof CommonUserRole]

export type RangeRolesMap = Record<string, UserRole[]>

export interface AuthenticatedUser {
  id: string
  email: string
  roles: UserRole[]
  rangeRoles: RangeRolesMap
  defaultRangeSlug: string
}
