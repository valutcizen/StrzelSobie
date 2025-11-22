import { Role, UserDto, UserProfile } from '@strzel-sobie/common/models';

const getRangeRoles = (user: UserDto & { range_roles?: Record<string, Role[]> }): Record<string, Role[]> =>
  user.rangeRoles ?? user.range_roles ?? {};

export const mapUserDtoToUserProfile = (user: UserDto): UserProfile => ({
  id: user.id,
  email: user.email,
  phone_number: null,
  is_deleted: user.isDeleted ?? 0,
  created_at: user.createdAt ?? new Date().toISOString(),
  roles: user.roles ?? [],
  range_roles: getRangeRoles(user),
});
