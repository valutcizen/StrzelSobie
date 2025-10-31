import { UserRoleEnum, type UserRole } from '@/types/auth'

export const USER_ROLES: readonly UserRole[] = [
  UserRoleEnum.Guest,
  UserRoleEnum.Member,
  UserRoleEnum.Coordinator,
  UserRoleEnum.Confirmator,
  UserRoleEnum.ShootingRangeAdministrator,
  UserRoleEnum.ClubCommunityAdministrator,
] as const

export const EDITABLE_USER_ROLES: readonly UserRole[] = USER_ROLES.filter(
  (role) => role !== UserRoleEnum.Guest,
) as UserRole[]

const ROLE_TRANSLATION_KEYS: Record<UserRole, string> = {
  [UserRoleEnum.Guest]: 'roles.guest',
  [UserRoleEnum.Member]: 'roles.member',
  [UserRoleEnum.Coordinator]: 'roles.coordinator',
  [UserRoleEnum.Confirmator]: 'roles.confirmator',
  [UserRoleEnum.ShootingRangeAdministrator]: 'roles.shootingRangeAdmin',
  [UserRoleEnum.ClubCommunityAdministrator]: 'roles.clubCommunityAdmin',
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

  userRoles.add(UserRoleEnum.Guest)

  return Array.from(userRoles)
}
