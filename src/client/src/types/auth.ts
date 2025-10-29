export type UserRole =
  | 'Guest'
  | 'Member'
  | 'Coordinator'
  | 'Confirmator'
  | 'Shooting Range Administrator'
  | 'Club/Community Administrator'

export type RangeRolesMap = Record<string, UserRole[]>

export interface AuthenticatedUser {
  id: string
  email: string
  roles: UserRole[]
  rangeRoles: RangeRolesMap
  defaultRangeSlug: string
}
