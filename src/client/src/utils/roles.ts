import type { UserRole } from '@/types/auth'

export const USER_ROLES: readonly UserRole[] = [
  'Guest',
  'Member',
  'Coordinator',
  'Confirmator',
  'Shooting Range Administrator',
  'Club/Community Administrator',
] as const

export const EDITABLE_USER_ROLES: readonly UserRole[] = USER_ROLES.filter(
  (role) => role !== 'Guest',
) as UserRole[]

const ROLE_TRANSLATION_KEYS: Record<UserRole, string> = {
  Guest: 'roles.guest',
  Member: 'roles.member',
  Coordinator: 'roles.coordinator',
  Confirmator: 'roles.confirmator',
  'Shooting Range Administrator': 'roles.shootingRangeAdmin',
  'Club/Community Administrator': 'roles.clubCommunityAdmin',
}

export const getRoleTranslationKey = (role: UserRole) => ROLE_TRANSLATION_KEYS[role]

export const isUserRole = (value: string): value is UserRole =>
  USER_ROLES.includes(value as UserRole)

export const normalizeUserRoles = (roles: string[]): UserRole[] => {
  const userRoles = new Set<UserRole>()

  for (const role of roles) {
    if (isUserRole(role)) {
      userRoles.add(role)
    }
  }

  userRoles.add('Guest')

  return Array.from(userRoles)
}
