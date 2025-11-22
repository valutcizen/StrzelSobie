import { getCookie } from 'hono/cookie';
import { AuthService } from '@strzel-sobie/auth';
import { IUserService, Role, UserDto } from '@strzel-sobie/common/models';
import { Context } from '../types';

const createAnonymousUser = (): UserDto => ({
  id: -1,
  email: 'anonymous@strzel-sobie.local',
  isDeleted: 0,
  createdAt: new Date(0).toISOString(),
  roles: [],
  rangeRoles: {},
});

export const resolveOptionalUser = async (c: Context): Promise<UserDto> => {
  try {
    if (!c.req?.header) {
      return createAnonymousUser();
    }
    const sessionToken = getCookie(c, 'session_token');
    if (!sessionToken) {
      return createAnonymousUser();
    }

    const authService: AuthService = c.get('authService');
    const sessionResult = await authService.validateSession(sessionToken);
    if (!sessionResult.isSuccess) {
      return createAnonymousUser();
    }

    const session = sessionResult.getValue();
    if (!session) {
      return createAnonymousUser();
    }

    const userService: IUserService = c.get('userService');
    const userResult = await userService.getFullUserProfile(session.userId);
    if (!userResult.isSuccess) {
      return createAnonymousUser();
    }

    const userProfile = userResult.getValue();
    if (!userProfile) {
      return createAnonymousUser();
    }

    const allRolesResult = await userService.getRoles();
    if (!allRolesResult.isSuccess) {
      throw allRolesResult.getError();
    }

    const allRoles = allRolesResult.getValue();
    const roleMap = new Map(allRoles.map((role) => [role.name, role]));

    const rangeRolesSource =
      (userProfile as { rangeRoles?: Record<string, string[]> }).rangeRoles ??
      (userProfile as { range_roles?: Record<string, string[]> }).range_roles ??
      {};

    const rangeRoles = Object.entries(rangeRolesSource).reduce((acc, [rangeId, roleNames]) => {
      acc[rangeId] = (roleNames ?? [])
        .map((roleName) => roleMap.get(roleName))
        .filter((role): role is Role => Boolean(role));
      return acc;
    }, {} as Record<string, Role[]>);

    const inferredIsDeleted =
      'isDeleted' in userProfile
        ? (userProfile as { isDeleted?: number }).isDeleted ?? 0
        : 'is_deleted' in (userProfile as Record<string, unknown>)
        ? ((userProfile as Record<string, unknown>).is_deleted as number) ?? 0
        : 0;

    const inferredCreatedAt =
      'createdAt' in userProfile
        ? (userProfile as { createdAt?: string }).createdAt ?? new Date().toISOString()
        : new Date().toISOString();

    const user: UserDto = {
      id: userProfile.id,
      email: userProfile.email,
      isDeleted: inferredIsDeleted,
      createdAt: inferredCreatedAt,
      roles: userProfile.roles
        .map((roleName) => roleMap.get(roleName))
        .filter((role): role is Role => Boolean(role)),
      rangeRoles,
    };

    return user;
  } catch (error) {
    console.error('Failed to resolve optional user', error);
    return createAnonymousUser();
  }
};
