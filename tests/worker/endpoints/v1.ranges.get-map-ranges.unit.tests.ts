import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetMapRangesRoute } from '../../../src/worker/src/endpoints/v1/ranges/get-map-ranges';
import { Result, type RangeSummaryDto } from '@strzel-sobie/common';

type RangesServiceMock = {
  getRanges: ReturnType<typeof vi.fn>;
};

const createContext = (rangesService: RangesServiceMock, url: string) => {
  const json = vi.fn((payload: unknown, status?: number) => ({ payload, status }));
  const get = vi.fn((key: string) => {
    if (key === 'rangesService') {
      return rangesService;
    }
    if (key === 'embedMapConfig') {
      return { allowedTypes: ['club', 'office'], cacheVersion: '5' };
    }
    return undefined;
  });
  const req = {
    url,
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

describe('GetMapRangesRoute endpoint contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('uses embed scope config to filter range types', async () => {
    const endpoint = new GetMapRangesRoute();
    const ranges: RangeSummaryDto[] = [
      {
        id: 1,
        slug: 'club-a',
        displayName: 'Club A',
        type: 'club',
        allowsReservations: true,
        latitude: 50.1,
        longitude: 19.1,
        extras: {
          mapBubbleDescription: 'Plain text info',
          mapBubbleShowExactLocationLinks: true,
        },
      },
      {
        id: 2,
        slug: 'office-a',
        displayName: 'Office A',
        type: 'office',
        allowsReservations: false,
        latitude: 50.2,
        longitude: 19.2,
      },
    ];
    const rangesService = {
      getRanges: vi.fn().mockResolvedValue(Result.ok(ranges)),
    };
    const { ctx, spies } = createContext(rangesService, 'http://localhost/api/v1/map-ranges?scope=embed');

    const response = await endpoint.handle(ctx as never);

    expect(rangesService.getRanges).toHaveBeenCalledWith({ types: ['club', 'office'] });
    expect(spies.json).toHaveBeenCalledWith(
      [
        expect.objectContaining({ slug: 'club-a', type: 'club' }),
        expect.objectContaining({ slug: 'office-a', type: 'office' }),
      ],
      200,
    );
    expect(response.status).toBe(200);
    expect(response.payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: 'club-a',
          mapBubbleDescription: 'Plain text info',
          mapBubbleShowExactLocationLinks: true,
        }),
      ]),
    );
  });

  it('returns 400 for invalid type query value', async () => {
    const endpoint = new GetMapRangesRoute();
    const rangesService = {
      getRanges: vi.fn(),
    };
    const { ctx, spies } = createContext(rangesService, 'http://localhost/api/v1/map-ranges?type=invalid');

    const response = await endpoint.handle(ctx as never);

    expect(rangesService.getRanges).not.toHaveBeenCalled();
    expect(spies.json).toHaveBeenCalledWith({ error: 'Invalid range type filter' }, 400);
    expect(response).toEqual({ payload: { error: 'Invalid range type filter' }, status: 400 });
  });
});
