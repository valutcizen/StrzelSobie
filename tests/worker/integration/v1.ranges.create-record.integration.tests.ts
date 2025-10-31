import { describe, expect, it, vi } from 'vitest';
import { InvalidRecordTimeError, Result, type CreatedRecordDto } from '@strzel-sobie/common/models';
import { CreateRecord } from '../../../src/worker/src/endpoints/v1/ranges/create-record';
import { createWorkerTestClient } from '../utils/app';
import { mockConsoleError } from '../utils/console';

mockConsoleError();

const rangeAdmin = {
  id: 22,
  email: 'admin@range.com',
  isDeleted: 0,
  createdAt: '2024-02-14T08:00:00.000Z',
  roles: [{ id: 4, name: 'RangeAdmin', scope: 'global' }],
  rangeRoles: {},
};

describe('POST /api/v1/ranges/:rangeSlug/records', () => {
  it('creates a manual record through the reservations service', async () => {
    const record: CreatedRecordDto = {
      id: 88,
      rangeId: 5,
      adminId: 22,
      eventDate: '2024-05-10',
      startTime: '09:00',
      endTime: '10:00',
      numParticipants: 6,
      createdAt: '2024-04-01T12:00:00.000Z',
    };

    const reservationsService = {
      createRecord: vi.fn().mockResolvedValue(Result.ok(record)),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/records', CreateRecord);
      },
      dependencies: { reservationsService, user: rangeAdmin },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/records', {
      json: {
        eventDate: '2024-05-10',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
    });

    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'forest-hills',
      {
        eventDate: '2024-05-10',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
      rangeAdmin,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(record);
    expect(response.headers.get('location')).toBe('/api/v1/ranges/forest-hills/records/88');
  });

  it('returns validation errors reported by the reservations service', async () => {
    const reservationsService = {
      createRecord: vi
        .fn()
        .mockResolvedValue(Result.fail(new InvalidRecordTimeError('Invalid window'))),
    };

    const { client } = createWorkerTestClient({
      register: (router) => {
        router.post('/api/v1/ranges/:rangeSlug/records', CreateRecord);
      },
      dependencies: { reservationsService, user: rangeAdmin },
    });

    const response = await client.post('/api/v1/ranges/forest-hills/records', {
      json: {
        eventDate: '2024-05-10',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
    });

    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'forest-hills',
      {
        eventDate: '2024-05-10',
        startTime: '09:00',
        endTime: '10:00',
        numParticipants: 6,
      },
      rangeAdmin,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      code: 'invalid_record_time',
      message: 'Invalid window',
    });
  });
});
