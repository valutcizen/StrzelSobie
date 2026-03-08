import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { RangesService } from '@strzel-sobie/ranges/src/application/ranges.service';
import {
  ForbiddenError,
  IAuditService,
  InvalidRangeSlugError,
  Role,
  RangeNotFoundError,
  Result,
  UpdateRangeCommand,
  UserDto,
  UserRole,
} from '@strzel-sobie/common/models';
import { IRangesRepository } from '@strzel-sobie/ranges/src/domain/ranges.repository';
import { ShootingRange, ShootingRangeSummary } from '@strzel-sobie/ranges/src/domain/shooting-range.model';

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
    type: 'club',
    allowsReservations: true,
    isDeleted: false,
    publicDescription: null,
    memberDescription: null,
    latitude: 0,
    longitude: 0,
    extras: '{}',
    ...overrides,
  });

  const buildRangeSummary = (overrides: Partial<ShootingRangeSummary> = {}): ShootingRangeSummary => ({
    id: 1,
    slug: 'alpha-range',
    displayName: 'Alpha Range',
    type: 'club',
    allowsReservations: true,
    latitude: 0,
    longitude: 0,
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
      countFutureAvailabilityImpact: vi.fn(),
      findBySlug: vi.fn(),
      findFiringLinesByRangeId: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
      update: vi.fn(),
      getRangeIdBySlug: vi.fn(),
      existsRangeById: vi.fn(),
      softDeleteById: vi.fn(),
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
    const ranges: ShootingRangeSummary[] = [
      buildRangeSummary({ id: 2, slug: 'beta', displayName: 'Beta Range' }),
      buildRangeSummary({ id: 3, slug: 'gamma', displayName: 'Gamma Range' }),
    ];
    asMock(rangesRepository.findAll).mockResolvedValue(ranges);

    const result = await service.getRanges();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual([
      { id: 2, slug: 'beta', displayName: 'Beta Range', type: 'club', allowsReservations: true, latitude: 0, longitude: 0, extras: {} },
      { id: 3, slug: 'gamma', displayName: 'Gamma Range', type: 'club', allowsReservations: true, latitude: 0, longitude: 0, extras: {} },
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
  });

  it('returns range details with parsed operating hours', async () => {
    const rawRange = buildRange();
    asMock(rangesRepository.findBySlug).mockResolvedValue(rawRange);

    const result = await service.getRangeDetails(rawRange.slug);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      id: rawRange.id,
      slug: rawRange.slug,
      displayName: rawRange.displayName,
      type: rawRange.type,
      allowsReservations: rawRange.allowsReservations,
      isDeleted: false,
      publicDescription: rawRange.publicDescription,
      memberDescription: rawRange.memberDescription,
      latitude: rawRange.latitude,
      longitude: rawRange.longitude,
      totalTracks: rawRange.totalTracks,
      operatingHours: { monday: { open: '09:00', close: '17:00' } },
      extras: {},
      parkingLocation: null,
      firingLines: [],
      administratorContacts: [],
    });
  });

  it('includes administrator contacts for member viewer when resolver is configured', async () => {
    const rawRange = buildRange();
    asMock(rangesRepository.findBySlug).mockResolvedValue(rawRange);
    const resolver = vi
      .fn()
      .mockResolvedValue(
        Result.ok([{ userId: 11, email: 'admin@example.com', phoneNumber: null, displayName: 'Admin' }])
      );
    const member = buildUser({
      roles: [{ id: 1, name: UserRole.Member, scope: 'global' }],
    });
    service = new RangesService(rangesRepository, auditService, resolver);

    const result = await service.getRangeDetails(rawRange.slug, member);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().administratorContacts).toEqual([
      { userId: 11, email: 'admin@example.com', phoneNumber: null, displayName: 'Admin' },
    ]);
    expect(resolver).toHaveBeenCalledWith(rawRange.id, member);
  });

  it('maps parking location from extras JSON', async () => {
    const rawRange = buildRange({
      extras: JSON.stringify({ parkingLocation: { latitude: 50.1234, longitude: 19.9876 } }),
    });
    asMock(rangesRepository.findBySlug).mockResolvedValue(rawRange);

    const result = await service.getRangeDetails(rawRange.slug);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toMatchObject({
      extras: { parkingLocation: { latitude: 50.1234, longitude: 19.9876 } },
      parkingLocation: { latitude: 50.1234, longitude: 19.9876 },
      firingLines: [],
      administratorContacts: [],
    });
  });

  it('omits parking location when extras payload is invalid', async () => {
    const rawRange = buildRange({
      extras: '{"parkingLocation":{"latitude":"bad","longitude":null}}',
    });
    asMock(rangesRepository.findBySlug).mockResolvedValue(rawRange);

    const result = await service.getRangeDetails(rawRange.slug);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toMatchObject({
      extras: {},
      parkingLocation: null,
      firingLines: [],
      administratorContacts: [],
    });
  });

  it('fails with RangeNotFoundError when slug is unknown', async () => {
    asMock(rangesRepository.findBySlug).mockResolvedValue(null);

    const result = await service.getRangeDetails('missing');

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
  });

  it('fails when operating hours JSON cannot be parsed', async () => {
    const storedRange = buildRange({ operatingHours: 'not-json' });
    asMock(rangesRepository.findBySlug).mockResolvedValue(storedRange);

    const result = await service.getRangeDetails('alpha-range');

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      id: storedRange.id,
      slug: storedRange.slug,
      displayName: storedRange.displayName,
      type: storedRange.type,
      allowsReservations: storedRange.allowsReservations,
      isDeleted: false,
      publicDescription: storedRange.publicDescription,
      memberDescription: storedRange.memberDescription,
      latitude: storedRange.latitude,
      longitude: storedRange.longitude,
      totalTracks: storedRange.totalTracks,
      operatingHours: {},
      extras: {},
      parkingLocation: null,
      firingLines: [],
      administratorContacts: [],
    });
  });

  it('rejects createRange when slug has spaces or uppercase letters', async () => {
    const user = buildUser({
      roles: [{ id: 1, name: UserRole.ClubCommunityAdministrator, scope: 'global' }],
    });

    const result = await service.createRange(
      {
        slug: 'A A',
        displayName: 'Bad Range',
      },
      user,
    );

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidRangeSlugError);
    expect(rangesRepository.findBySlug).not.toHaveBeenCalled();
    expect(rangesRepository.create).not.toHaveBeenCalled();
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
  });

  describe('deleteRange', () => {
    const range = (overrides: Partial<ShootingRange> = {}) =>
      buildRange({ id: 77, slug: 'central', ...overrides });

    const admin = (): UserDto =>
      buildUser({
        roles: [{ id: 1, name: UserRole.ClubCommunityAdministrator, scope: 'global' } as Role],
      });

    const rangeAdmin = (rangeId: number): UserDto =>
      buildUser({
        rangeRoles: {
          [String(rangeId)]: [{ id: 2, name: 'Range Admin', scope: 'range' } as Role],
        },
      });

    beforeEach(() => {
      vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    });

    it('soft deletes range and frees slug for club admin', async () => {
      asMock(rangesRepository.findBySlug).mockResolvedValue(range());
      asMock(auditService.logAction).mockResolvedValue(Result.ok(undefined));

      const result = await service.deleteRange('central', admin());

      expect(result.isSuccess).toBe(true);
      expect(rangesRepository.softDeleteById).toHaveBeenCalledWith(77, 'central__deleted_1700000000000');
      expect(auditService.logAction).toHaveBeenCalled();
    });

    it('soft deletes range for range admin', async () => {
      const existing = range();
      asMock(rangesRepository.findBySlug).mockResolvedValue(existing);
      asMock(auditService.logAction).mockResolvedValue(Result.ok(undefined));

      const result = await service.deleteRange(existing.slug, rangeAdmin(existing.id));

      expect(result.isSuccess).toBe(true);
      expect(rangesRepository.softDeleteById).toHaveBeenCalledWith(existing.id, 'central__deleted_1700000000000');
    });

    it('returns forbidden for non-admin user', async () => {
      asMock(rangesRepository.findBySlug).mockResolvedValue(range());
      asMock(auditService.logAction).mockResolvedValue(Result.ok(undefined));

      const result = await service.deleteRange('central', buildUser());

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
      expect(rangesRepository.softDeleteById).not.toHaveBeenCalled();
    });

    it('returns not found when range missing', async () => {
      asMock(rangesRepository.findBySlug).mockResolvedValue(null);

      const result = await service.deleteRange('missing', admin());

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RangeNotFoundError);
      expect(rangesRepository.softDeleteById).not.toHaveBeenCalled();
    });
  });
});
