import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetRangesRoute } from '../../../src/worker/src/endpoints/v1/ranges/get-ranges';
import { Result, type RangeSummaryDto } from '@strzel-sobie/common';

type RangesServiceMock = {
  getRanges: ReturnType<typeof vi.fn>;
};

const createContext = (rangesService: RangesServiceMock) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'rangesService') {
      return rangesService;
    }
    return undefined;
  });
  const req = {
    query: vi.fn().mockReturnValue({}),
  };

  const ctx = {
    json,
    get,
    req,
  };

  return {
    ctx,
    spies: {
      json,
      get,
    },
  };
};

describe('GetRangesRoute endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('returns all ranges when the service succeeds', async () => {
    const endpoint = new GetRangesRoute();
    const ranges: RangeSummaryDto[] = [
      { id: 1, slug: 'central-range', displayName: 'Central Range', type: 'club', allowsReservations: true },
      { id: 2, slug: 'east-side-range', displayName: 'East Side Range', type: 'club', allowsReservations: true },
    ];
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(Result.ok(ranges)),
    };

    const { ctx, spies } = createContext(rangesService);

    const response = await endpoint.handle(ctx as never);

    expect(spies.get).toHaveBeenCalledWith('rangesService');
    expect(rangesService.getRanges).toHaveBeenCalledOnce();
    expect(spies.json).toHaveBeenCalledWith(ranges, 200);
    expect(response).toEqual({ payload: ranges, status: 200 });
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('returns a 500 response when the service fails', async () => {
    const endpoint = new GetRangesRoute();
    const error = new Error('database unavailable');
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(Result.fail(error)),
    };

    const { ctx, spies } = createContext(rangesService);

    const response = await endpoint.handle(ctx as never);

    expect(spies.get).toHaveBeenCalledWith('rangesService');
    expect(rangesService.getRanges).toHaveBeenCalledOnce();
    expect(spies.json).toHaveBeenCalledWith({ error: 'Internal Server Error' }, 500);
    expect(response).toEqual({
      payload: { error: 'Internal Server Error' },
      status: 500,
    });
  });
});
