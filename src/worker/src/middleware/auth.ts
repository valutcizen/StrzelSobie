
import { getCookie } from 'hono/cookie';
import { AuthService } from '@strzel-sobie/auth';
import { MiddlewareHandler } from 'hono';
import { IUserService, Role, UserDto } from '@strzel-sobie/common';


export const authMiddleware: MiddlewareHandler = async (c, next) => {
  const authService: AuthService = c.get('authService');
  const sessionToken = getCookie(c, 'session_token');

  if (!sessionToken) {
    if (!['/api/v1/auth/me', '/api/v1/auth/logout'].includes(c.req.path)) {
      console.error('Unauthorized request to protected endpoint', c.req.raw);
    }
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const sessionResult = await authService.validateSession(sessionToken);

  if (!sessionResult.isSuccess) {
    console.error('Invalid session token', sessionResult.getError());
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const session = sessionResult.getValue();

  if (!session) {
    console.error('Invalid session', session);
    return c.json({ message: 'Unauthorized' }, 401);
  }

  c.set('session', session);
  const userService: IUserService = c.get('userService');
  const userResult = await userService.getFullUserProfile(session.userId);

  if (!userResult.isSuccess) {
    console.error('Error while fetching user profile', userResult.getError());
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const userProfile = userResult.getValue();

  if (!userProfile) {
    console.error('User profile not found', userProfile);
    return c.json({ message: 'Unauthorized' }, 401);
  }

  const allRolesResult = await userService.getRoles();
  if (!allRolesResult.isSuccess) {
    console.error('Error while fetching roles', allRolesResult.getError());
    return c.json({ message: 'Internal server error' }, 500);
  }
  const allRoles = allRolesResult.getValue();
  const roleMap = new Map(allRoles.map((role) => [role.name, role]));

  const rangeRoles = Object.entries(userProfile.rangeRoles ?? {}).reduce(
    (acc, [rangeId, roleNames]) => {
      acc[rangeId] = roleNames
        .map((roleName) => roleMap.get(roleName))
        .filter((role) => role) as Role[];
      return acc;
    },
    {} as Record<string, Role[]>
  );

  const user: UserDto & { range_roles: Record<string, Role[]> } = {
    id: userProfile.id,
    email: userProfile.email,
    isDeleted: 0, // Assuming user is not deleted if authenticated
    createdAt: new Date().toISOString(), // This should be ideally from the user profile
    roles: userProfile.roles.map((roleName) => roleMap.get(roleName)).filter((role) => role) as Role[],
    rangeRoles,
    range_roles: rangeRoles,
  };

  c.set('user', user);

  await next();
};
