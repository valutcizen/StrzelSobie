import { describe, expect, it, vi } from 'vitest';
import {
  Result,
  PropositionNotFoundError,
  CantDeletePropositionError,
  UnauthorizedPropositionError,
} from '@strzel-sobie/common/models';
import { DeleteProposition } from '../../../../../src/worker/src/endpoints/v1/propositions/delete-proposition';
import { createWorkerTestClient } from '../../../utils/app';
import { mockConsoleError } from '../../../utils/console';

mockConsoleError();

const memberUser = {
  id: 18,
  email: 'member@example.com',
  isDeleted: 0,
  createdAt: '2024-02-01T09:00:00.000Z',
  roles: [{ id: 3, name: 'Member', scope: 'global' }],
  rangeRoles: {},
};

describe('DELETE /api/v1/propositions/:propositionId', () => {
  it('cancels the proposition using the reservations service', async () => {
    const reservationsService = {
      cancelProposition: vi.fn().mockResolvedValue(Result.ok(undefined)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/propositions/:propositionId', DeleteProposition);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.delete('/api/v1/propositions/44');

    expect(reservationsService.cancelProposition).toHaveBeenCalledWith(
      { propositionId: 44 },
      memberUser,
    );
    expect(response.status).toBe(204);
    expect(await response.text()).toBe('');
  });

  it.each([
    [new UnauthorizedPropositionError('Forbidden'), 403, { code: 'forbidden', message: 'Forbidden' }],
    [new PropositionNotFoundError('Missing'), 404, { code: 'proposition_not_found', message: 'Missing' }],
  ])('maps %s to an error response', async (error, status, body) => {
    const reservationsService = {
      cancelProposition: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.delete('/api/v1/propositions/:propositionId', DeleteProposition);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.delete('/api/v1/propositions/44');

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
  });
});
