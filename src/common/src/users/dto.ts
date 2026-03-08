import { Role } from '../auth/model';
import { User, UserGlobalRole, UserRangeRole } from './model';
import { PaginatedQueryOptions, PaginatedResponse } from '../pagination';

export type UserIdentifierDto = {
  id: User['id'];
  email: User['email'];
};

/**
 * DTO for a user.
 * Corresponds to an item in the `data` array for `GET /api/v1/users`.
 * Maps `is_deleted` to `isDeleted` and `created_at` to `createdAt`.
 */
export type UserDto = {
  id: User['id'];
  email: User['email'];
  isDeleted: User['is_deleted'];
  createdAt: User['created_at'];
  roles: Role[];
  rangeRoles: Record<string, Role[]>;
};

/**
 * DTO for a paginated list of users.
 * Corresponds to the response payload for `GET /api/v1/users`.
 */
export type PaginatedUsersDto = PaginatedResponse<UserDto>;

/**
 * Command model for assigning a role to a user.
 * Corresponds to the request payload for `POST /api/v1/users/{userId}/roles`.
 */
export type AssignRoleCommand = {
  roleId: UserGlobalRole['role_id'];
  rangeId: UserRangeRole['range_id'] | null;
};

export type DeleteUserCommand = {
  targetUserId: User['id'];
  requester: UserDto;
};

export type GetUsersOptions = PaginatedQueryOptions<'id' | 'email' | 'createdAt'>;

export type AdminContactProfileDto = {
  userId: number;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  isHiddenGlobally: boolean;
};

export type AdminContactProfileOverrideDto = {
  userId: number;
  rangeId: number;
  email: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  isHiddenInRange: boolean;
};

export type UpsertAdminContactProfileCommand = {
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  isHiddenGlobally?: boolean;
};

export type UpsertAdminContactProfileOverrideCommand = {
  rangeId: number;
  email?: string | null;
  phoneNumber?: string | null;
  displayName?: string | null;
  isHiddenInRange?: boolean;
};
