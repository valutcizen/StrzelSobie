import { UserProfile } from './users/model';
import { UserRole } from './auth/model';

type RoleLike = { name: string } | string;

const getRoleName = (role: RoleLike): string =>
  typeof role === 'string' ? role : role?.name ?? '';

export function getRangeRole(
  user: UserProfile & { rangeRoles?: Record<string, UserProfile['roles']> },
  range_id: number
): { isAdmin: boolean; isMember: boolean; isGuest: boolean } {
  const roleNames = (user.roles ?? []).map(getRoleName).filter(Boolean);
  const isClubAdmin = roleNames.includes(UserRole.ClubCommunityAdministrator);
  if (isClubAdmin) {
    return { isAdmin: true, isMember: true, isGuest: false };
  }

  const rangeRolesMap = user.range_roles ?? user.rangeRoles ?? {};
  const rolesForRange = (rangeRolesMap[String(range_id)] ?? []) as RoleLike[];
  const rangeAdminRoles = rolesForRange.map(getRoleName).filter(Boolean);
  const isAdmin = rangeAdminRoles.includes(UserRole.ShootingRangeAdministrator);
  const isMember = roleNames.includes(UserRole.Member);
  const isGuest = !isMember && !isAdmin;

  return { isAdmin, isMember, isGuest };
}
