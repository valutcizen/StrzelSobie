export type UserRole =
  | 'Guest'
  | 'Member'
  | 'Coordinator'
  | 'Confirmator'
  | 'Shooting Range Administrator'
  | 'Club/Community Administrator'

export interface AuthenticatedUser {
  id: string
  email: string
  roles: UserRole[]
  defaultRangeSlug: string
}
