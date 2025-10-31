import { describe, expect, it, vi } from 'vitest';
import {
  PropositionNotFoundError,
  Result,
  UnauthorizedPropositionError,
  type PropositionDetailDto,
} from '@strzel-sobie/common';
import { GetPropositionDetail } from '../../../../../src/worker/src/endpoints/v1/propositions/get-proposition';
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

describe('GET /api/v1/propositions/:propositionId', () => {
  it('returns proposition details from the reservations service', async () => {
    const propositionDetail: PropositionDetailDto = {
      id: 55,
      status: 'pending',
    } as PropositionDetailDto;
    const reservationsService = {
      getPropositionDetails: vi.fn().mockResolvedValue(Result.ok(propositionDetail)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/propositions/:propositionId', GetPropositionDetail);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.get('/api/v1/propositions/55');

    expect(reservationsService.getPropositionDetails).toHaveBeenCalledWith(55, memberUser);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(propositionDetail);
  });

  it.each([
    [
      new UnauthorizedPropositionError('Forbidden'),
      403,
      { code: 'forbidden', message: 'Forbidden' },
    ],
    [
      new PropositionNotFoundError('Missing'),
      404,
      { code: 'proposition_not_found', message: 'Missing' },
    ],
  ])('maps %s to an error response', async (error, status, body) => {
    const reservationsService = {
      getPropositionDetails: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.get('/api/v1/propositions/:propositionId', GetPropositionDetail);
      },
      dependencies: { reservationsService, user: memberUser },
    });

    const response = await client.get('/api/v1/propositions/55');

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual(body);
  });
});
