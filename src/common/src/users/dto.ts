import { Role } from '../auth/model';
import { User, UserGlobalRole, UserRangeRole } from './model';

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
  range_roles: Record<string, Role[]>;
};

/**
 * Represents a paginated response for any given type `T`.
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
}

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

export type GetUsersOptions = {
  page?: number;
  limit?: number;
  sortBy?: 'id' | 'email' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  filter?: string;
};
