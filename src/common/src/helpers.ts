import { UserProfile } from './users/model'
import { UserRole } from './auth/model';

export function getRangeRole(user: UserProfile, range_id: number): {isAdmin: boolean, isMember: boolean, isGuest: boolean} {
    const isClubAdmin = user.roles.map(r => r.name).includes(UserRole.ClubCommunityAdministrator);
    if (isClubAdmin){
        return {isAdmin: true, isMember: true, isGuest: false}
    }
    const isMember = user.roles.map(r => r.name).includes(UserRole.Member);
    const rangeAdminRoles = user.range_roles[range_id].map(r => r.name);
    const isAdmin = rangeAdminRoles.includes(UserRole.ShootingRangeAdministrator);
    const isGuest = !isMember && !isAdmin;

    return { isAdmin, isMember, isGuest }
}