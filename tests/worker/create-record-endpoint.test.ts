import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Result, CreatedRecordDto, ForbiddenError, RecordCreationError } from '@strzel-sobie/common';
import { CreateRecord } from '../../src/worker/src/endpoints/v1/ranges/create-record';
import { AppContext } from '../../src/worker/src/types';

const createMockUser = () => ({
  id: 42,
  email: 'admin@example.com',
});

describe('CreateRecord endpoint', () => {
  let endpoint: CreateRecord;
  let reservationsService: { createRecord: ReturnType<typeof vi.fn> };
  let ctx: AppContext;
  let getValidatedDataSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    endpoint = new CreateRecord();
    reservationsService = {
      createRecord: vi.fn(),
    };

    const header = vi.fn();
    const json = vi.fn((body, status) => ({ body, status }));

    ctx = {
      get: vi.fn((key: string) => {
        if (key === 'reservationsService') {
          return reservationsService;
        }
        if (key === 'user') {
          return createMockUser();
        }
        return undefined;
      }),
      header,
      json,
    } as unknown as AppContext;

    getValidatedDataSpy = vi
      .spyOn(endpoint, 'getValidatedData')
      .mockResolvedValue({
        params: { rangeSlug: 'central-range' },
        body: {
          eventDate: '2024-05-01',
          startTime: '10:00',
          endTime: '11:00',
          numParticipants: 4,
        },
      });

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    getValidatedDataSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('returns 201 with created record payload', async () => {
    const record: CreatedRecordDto = {
      id: 99,
      rangeId: 7,
      adminId: 42,
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 4,
      createdAt: '2024-05-01T10:00:00Z',
    };

    reservationsService.createRecord.mockResolvedValue(Result.ok(record));

    const response = await endpoint.handle(ctx);

    expect(reservationsService.createRecord).toHaveBeenCalledWith(
      'central-range',
      {
        eventDate: '2024-05-01',
        startTime: '10:00',
        endTime: '11:00',
        numParticipants: 4,
      },
      expect.objectContaining({ id: 42 })
    );
    expect(ctx.header).toHaveBeenCalledWith(
      'Location',
      '/api/v1/ranges/central-range/records/99'
    );
    expect(response).toEqual({
      body: record,
      status: 201,
    });
  });

  it('maps domain errors to HTTP responses', async () => {
    const forbidden = new ForbiddenError('no access');
    reservationsService.createRecord.mockResolvedValue(Result.fail(forbidden));

    const response = await endpoint.handle(ctx);

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: 'forbidden',
      message: forbidden.message,
    });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('logs unexpected errors and returns 500', async () => {
    reservationsService.createRecord.mockResolvedValue(Result.fail(new RecordCreationError()));

    const response = await endpoint.handle(ctx);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: 'record_creation_failed',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Unexpected error during record creation',
      expect.any(RecordCreationError)
    );
  });
});
