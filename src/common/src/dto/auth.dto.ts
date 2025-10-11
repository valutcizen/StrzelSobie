import { User } from '../models/users.models';

/**
 * Command model for registering a new user.
 * Corresponds to the request payload for `POST /api/v1/auth/register`.
 */
export type RegisterUserCommand = Pick<User, 'email'> & {
  password: string;
};

/**
 * DTO for a newly registered user.
 * Corresponds to the response payload for `POST /api/v1/auth/register`.
 */
export type RegisteredUserDto = Pick<User, 'id' | 'email'> & {
  roles: string[];
};

/**
 * Command model for user login.
 * Corresponds to the request payload for `POST /api/v1/auth/login`.
 */
export type LoginCommand = Pick<User, 'email'> & {
  password: string;
};

/**
 * DTO for the currently authenticated user's profile.
 * Corresponds to the response payload for `GET /api/v1/auth/me`.
 * Maps `phone_number` from the entity to `phoneNumber`.
 */
export type AuthenticatedUserDto = {
  id: User['id'];
  email: User['email'];
  phoneNumber: User['phone_number'];
  roles: string[];
  rangeRoles: Record<string, string[]>;
};
