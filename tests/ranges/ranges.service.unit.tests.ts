import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import {
  ForbiddenError,
  RangeNotFoundError,
  Result,
  type UpdateRangeCommand,
  type UserDto,
} from '@strzel-sobie/common';
import type { IRangesRepository } from '@strzel-sobie/ranges/src/domain/ranges.repository';
import type { ShootingRange } from '@strzel-sobie/ranges/src/domain/shooting-range.model';
import { RangesService } from '@strzel-sobie/ranges/src/application/ranges.service';
import type { IAuditService } from '@strzel-sobie/common/src/audit/service';

const asMock = <Args extends unknown[], Return>(fn: (...args: Args) => Return) =>
  fn as unknown as Mock<Args, Return>;

describe('RangesService contract', () => {
  let rangesRepository: IRangesRepository;
  let auditService: IAuditService;
  let service: RangesService;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  const buildRange = (overrides: Partial<ShootingRange> = {}): ShootingRange => ({
    id: 1,
    slug: 'alpha-range',
    displayName: 'Alpha Range',
    totalTracks: 6,
    operatingHours: JSON.stringify({ monday: { open: '09:00', close: '17:00' } }),
    ...overrides,
  });

  const buildUser = (overrides: Partial<UserDto> = {}): UserDto => ({
    id: 10,
    email: 'user@example.com',
    isDeleted: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    roles: [],
    rangeRoles: {},
    ...overrides,
  });

  beforeEach(() => {
    rangesRepository = {
      findAll: vi.fn(),
      findBySlug: vi.fn(),
      update: vi.fn(),
      getRangeIdBySlug: vi.fn(),
      existsRangeById: vi.fn(),
    };

    auditService = {
      logAction: vi.fn(),
    };

    service = new RangesService(rangesRepository, auditService);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns mapped summaries when ranges exist', async () => {
    const ranges: ShootingRange[] = [
      buildRange({ id: 2, slug: 'beta', displayName: 'Beta Range' }),
      buildRange({ id: 3, slug: 'gamma', displayName: 'Gamma Range' }),
    ];
    asMock(rangesRepository.findAll).mockResolvedValue(ranges);

    const result = await service.getRanges();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([
      { id: 2, slug: 'beta', displayName: 'Beta Range' },
      { id: 3, slug: 'gamma', displayName: 'Gamma Range' },
    ]);
  });

  it('wraps repository success when checking range existence', async () => {
    asMock(rangesRepository.existsRangeById).mockResolvedValue(true);

    const result = await service.existsRangeById(4);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(true);
  });

  it('propagates repository failure when checking range existence', async () => {
    const failure = new Error('lookup failed');
    asMock(rangesRepository.existsRangeById).mockRejectedValue(failure);

    const result = await service.existsRangeById(5);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(failure);
    expect(consoleErrorSpy).toHaveBeenCalledWith(failure);
  });

  it('returns range details with parsed operating hours', async () => {
    const rawRange = buildRange();
    asMock(rangesRepository.findBySlug).mockResolvedValue(rawRange);

    const result = await service.getRangeDetails(rawRange.slug);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      ...rawRange,
      operatingHours: { monday: { open: '09:00', close: '17:00' } },
    });
  });

  it('fails with RangeNotFoundError when slug is unknown', async () => {
    asMock(rangesRepository.findBySlug).mockResolvedValue(null);

    const result = await service.getRangeDetails('missing');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
  });

  it('fails when operating hours JSON cannot be parsed', async () => {
    asMock(rangesRepository.findBySlug).mockResolvedValue(
      buildRange({ operatingHours: 'not-json' })
    );

    const result = await service.getRangeDetails('alpha-range');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toEqual(new Error('Failed to parse operating hours'));
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('refuses updates for non-admin users', async () => {
    asMock(rangesRepository.findBySlug).mockResolvedValue(buildRange());

    const result = await service.updateRangeDetails(
      'alpha-range',
      { totalTracks: 7 },
      buildUser()
    );

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(rangesRepository.update).not.toHaveBeenCalled();
    expect(auditService.logAction).not.toHaveBeenCalled();
  });

  it('updates range for global administrators', async () => {
    const storedRange = buildRange();
    asMock(rangesRepository.findBySlug).mockResolvedValue(storedRange);
    asMock(rangesRepository.update).mockResolvedValue();
    asMock(auditService.logAction).mockResolvedValue(Result.ok(undefined));

    const command: UpdateRangeCommand = {
      totalTracks: 12,
      operatingHours: { monday: null },
    };
    const user = buildUser({
      roles: [{ id: 1, name: 'Club/Community Administrator', scope: 'global' }],
    });

    const result = await service.updateRangeDetails(storedRange.slug, command, user);

    expect(result.isSuccess).toBe(true);
    expect(rangesRepository.update).toHaveBeenCalledWith({
      ...storedRange,
      totalTracks: 12,
      operatingHours: JSON.stringify(command.operatingHours),
    });
    expect(auditService.logAction).toHaveBeenCalledWith({
      action_type: 'RANGE_UPDATE',
      target_id: storedRange.id,
      details: expect.objectContaining({ user, command }),
    });
  });

  it('updates range for range administrators without optional fields', async () => {
    const storedRange = buildRange({ id: 9, slug: 'local' });
    asMock(rangesRepository.findBySlug).mockResolvedValue(storedRange);
    asMock(rangesRepository.update).mockResolvedValue();
    asMock(auditService.logAction).mockResolvedValue(Result.ok(undefined));

    const user = buildUser({
      roles: [],
      rangeRoles: {
        [String(storedRange.id)]: [{ id: 2, name: 'Range Admin', scope: 'range' }],
      },
    });

    const result = await service.updateRangeDetails(storedRange.slug, {}, user);

    expect(result.isSuccess).toBe(true);
    expect(rangesRepository.update).toHaveBeenCalledWith(storedRange);
    expect(auditService.logAction).toHaveBeenCalledOnce();
  });

  it('fails to update missing ranges', async () => {
    asMock(rangesRepository.findBySlug).mockResolvedValue(null);

    const result = await service.updateRangeDetails('missing', {}, buildUser());

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
  });

  it('returns range id for known slugs', async () => {
    asMock(rangesRepository.getRangeIdBySlug).mockResolvedValue(33);

    const result = await service.getRangeIdBySlug('alpha');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(33);
  });

  it('fails when range id cannot be found', async () => {
    asMock(rangesRepository.getRangeIdBySlug).mockResolvedValue(null);

    const result = await service.getRangeIdBySlug('missing');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
  });

  it('propagates repository errors when fetching range id', async () => {
    const failure = new Error('db down');
    asMock(rangesRepository.getRangeIdBySlug).mockRejectedValue(failure);

    const result = await service.getRangeIdBySlug('alpha');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(failure);
    expect(consoleErrorSpy).toHaveBeenCalledWith(failure);
  });
});
