import type { UserRole } from './auth'

export interface UserRow {
  id: string
  email: string
  roles: UserRole[]
  createdAt: string
}

export interface PendingUser {
  id: string
  email: string
  requestedRole?: UserRole
  submittedAt: string
}
