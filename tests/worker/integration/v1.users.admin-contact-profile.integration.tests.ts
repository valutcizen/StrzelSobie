import { describe, expect, it, vi } from 'vitest';
import { Result } from '@strzel-sobie/common/models';
import { UpsertAdminContactProfile } from '../../../src/worker/src/endpoints/v1/user/upsert-admin-contact-profile';
import { UpsertAdminContactProfileOverride } from '../../../src/worker/src/endpoints/v1/user/upsert-admin-contact-profile-override';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const requester = {
  id: 1,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
  rangeRoles: {},
};

describe('Admin contact profile endpoints', () => {
  it('PATCH /api/v1/users/:userId/admin-contact-profile upserts profile', async () => {
    const userService = {
      upsertAdminContactProfile: vi.fn().mockResolvedValue(
        Result.ok({
          userId: 2,
          email: 'range.admin@example.com',
          phoneNumber: null,
          displayName: 'Range Admin',
          isHiddenGlobally: false,
        })
      ),
    };
    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch('/api/v1/users/:userId/admin-contact-profile', UpsertAdminContactProfile);
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.patch('/api/v1/users/2/admin-contact-profile', {
      json: { displayName: 'Range Admin' },
    });
    expect(response.status).toBe(200);
    expect(userService.upsertAdminContactProfile).toHaveBeenCalledWith(
      2,
      { displayName: 'Range Admin' },
      requester
    );
  });

  it('PATCH /api/v1/users/:userId/admin-contact-profile-overrides/:rangeId upserts override', async () => {
    const userService = {
      upsertAdminContactProfileOverride: vi.fn().mockResolvedValue(
        Result.ok({
          userId: 2,
          rangeId: 7,
          email: null,
          phoneNumber: null,
          displayName: 'Visible only here',
          isHiddenInRange: false,
        })
      ),
    };
    const { client } = createWorkerTestClient({
      register: (router) => {
        router.patch(
          '/api/v1/users/:userId/admin-contact-profile-overrides/:rangeId',
          UpsertAdminContactProfileOverride
        );
      },
      dependencies: { userService, user: requester },
    });

    const response = await client.patch('/api/v1/users/2/admin-contact-profile-overrides/7', {
      json: { displayName: 'Visible only here' },
    });
    expect(response.status).toBe(200);
    expect(userService.upsertAdminContactProfileOverride).toHaveBeenCalledWith(
      2,
      { rangeId: 7, displayName: 'Visible only here' },
      requester
    );
  });
});

