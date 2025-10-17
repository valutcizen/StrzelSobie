import { UserProfile } from './users/model';
import { UserRole } from './auth/model';

export function getRangeRole(
  user: UserProfile & { rangeRoles?: Record<string, UserProfile['roles']> },
  range_id: number
): { isAdmin: boolean; isMember: boolean; isGuest: boolean } {
  const isClubAdmin = user.roles.map((r) => r.name).includes(UserRole.ClubCommunityAdministrator);
  if (isClubAdmin) {
    return { isAdmin: true, isMember: true, isGuest: false };
  }

  const isMember = user.roles.map((r) => r.name).includes(UserRole.Member);
  const rangeRolesMap =
    user.range_roles ?? user.rangeRoles ?? {};
  const rolesForRange = rangeRolesMap[String(range_id)] ?? [];
  const rangeAdminRoles = rolesForRange.map((r) => r.name);
  const isAdmin = rangeAdminRoles.includes(UserRole.ShootingRangeAdministrator);
  const isGuest = !isMember && !isAdmin;

  return { isAdmin, isMember, isGuest };
}
