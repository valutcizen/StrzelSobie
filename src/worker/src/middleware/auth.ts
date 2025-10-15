
import { getCookie } from 'hono/cookie';
import { AuthService } from '@strzel-sobie/auth';
import { MiddlewareHandler } from 'hono';
import { IUserService, Role, UserDto } from '@strzel-sobie/common';


export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authService: AuthService = c.get('authService');
  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const sessionResult = await authService.validateSession(sessionToken);

  if (!sessionResult.isSuccess) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const session = sessionResult.getValue();

  if (!session) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  c.set('session', session);
  const userService: IUserService = c.get('userService');
  const userResult = await userService.getFullUserProfile(session.userId);

  if (!userResult.isSuccess) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const userProfile = userResult.getValue();

  if (!userProfile) {
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const allRolesResult = await userService.getRoles();
  if (!allRolesResult.isSuccess) {
    return c.json({ message: 'Internal server error' }, 500);
  }
  const allRoles = allRolesResult.getValue();
  const roleMap = new Map(allRoles.map((role) => [role.name, role]));

  const user: UserDto = {
    id: userProfile.id,
    email: userProfile.email,
    isDeleted: 0, // Assuming user is not deleted if authenticated
    createdAt: new Date().toISOString(), // This should be ideally from the user profile
    roles: userProfile.roles.map((roleName) => roleMap.get(roleName)).filter((role) => role) as Role[],
    range_roles: Object.entries(userProfile.rangeRoles).reduce(
      (acc, [rangeId, roleNames]) => {
        acc[rangeId] = roleNames
          .map((roleName) => roleMap.get(roleName))
          .filter((role) => role) as Role[];
        return acc;
      },
      {} as Record<string, Role[]>
    ),
  };

  c.set('user', user);

  await next();
};
