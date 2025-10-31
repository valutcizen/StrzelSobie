import { describe, expect, it } from 'vitest';
import { getRangeRole, UserRole } from '@strzel-sobie/common/models';

const baseUser = {
  id: 1,
  email: 'user@example.com',
  phone_number: null,
  is_deleted: 0 as const,
  created_at: '2024-01-01T00:00:00.000Z',
};

describe('getRangeRole helper', () => {
  it('detects club admin when roles are provided as strings', () => {
    const user = {
      ...baseUser,
      roles: [UserRole.ClubCommunityAdministrator] as unknown as { name: string }[],
      range_roles: {},
    };

    const result = getRangeRole(user, 1);

    expect(result).toEqual({ isAdmin: true, isMember: true, isGuest: false });
  });

  it('detects range admin from string-based range roles', () => {
    const user = {
      ...baseUser,
      roles: [UserRole.Guest] as unknown as { name: string }[],
      range_roles: {
        '1': [UserRole.ShootingRangeAdministrator] as unknown as { name: string }[],
      },
    };

    const result = getRangeRole(user, 1);

    expect(result).toEqual({ isAdmin: true, isMember: false, isGuest: false });
  });

  it('defaults to guest when only the guest role is present', () => {
    const user = {
      ...baseUser,
      roles: [UserRole.Guest] as unknown as { name: string }[],
      range_roles: {},
    };

    const result = getRangeRole(user, 1);

    expect(result).toEqual({ isAdmin: false, isMember: false, isGuest: true });
  });
});
