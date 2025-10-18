import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  CreateRecordCommand,
  ForbiddenError,
  InvalidRecordTimeError,
  IRangesService,
  RangeDetailsDto,
  RecordCreationError,
  Result,
  UserDto,
  UserRole,
  RangeNotFoundError,
  IAuditService,
} from '@strzel-sobie/common';
import { ReservationsService } from '../../src/reservations/src/application/reservations.service';
import {
  CreateRecordData,
  IReservationsRepository,
  RecordEntity,
} from '../../src/reservations/src/domain/reservations.repository';

type RepositoryMocks = {
  createRecord: ReturnType<typeof vi.fn>;
};

type RangesServiceMocks = {
  getRangeDetails: ReturnType<typeof vi.fn>;
};

type AuditServiceMocks = {
  logAction: ReturnType<typeof vi.fn>;
};

const createUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 42,
  email: 'admin@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const createRangeDetails = (overrides: Partial<RangeDetailsDto> = {}): RangeDetailsDto => ({
  id: 7,
  slug: 'central-range',
  displayName: 'Central Range',
  totalTracks: 12,
  operatingHours: {},
  ...overrides,
});

const createRecordEntity = (overrides: Partial<RecordEntity> = {}): RecordEntity => ({
  id: 99,
  admin_id: 42,
  range_id: 7,
  event_date: '2024-05-01',
  start_time: '10:00',
  end_time: '11:00',
  num_participants: 5,
  created_at: '2024-05-01T10:00:00Z',
  ...overrides,
});

const makeRangeRole = (name: UserRole) => ({
  id: name.length,
  name,
  scope: 'range' as const,
});

const makeGlobalRole = (name: UserRole) => ({
  id: name.length * 10,
  name,
  scope: 'global' as const,
});

const setup = () => {
  const repositoryMocks: RepositoryMocks = {
    createRecord: vi.fn(),
  };
  const reservationsRepository = repositoryMocks as unknown as IReservationsRepository;

  const rangesServiceMocks: RangesServiceMocks = {
    getRangeDetails: vi.fn(),
  };
  const rangesService = rangesServiceMocks as unknown as IRangesService;

  const auditServiceMocks: AuditServiceMocks = {
    logAction: vi.fn(),
  };
  const auditService = auditServiceMocks as unknown as IAuditService;

  const service = new ReservationsService(rangesService, reservationsRepository, auditService);

  return { service, repositoryMocks, rangesServiceMocks, auditServiceMocks };
};

describe('ReservationsService.createRecord', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('creates a record when user is a range administrator', async () => {
    const { service, repositoryMocks, rangesServiceMocks, auditServiceMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser({
      rangeRoles: {
        [rangeDetails.id]: [makeRangeRole(UserRole.ShootingRangeAdministrator)],
      },
    });

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    const persistedRecord = createRecordEntity({ num_participants: 4 });
    repositoryMocks.createRecord.mockResolvedValue(persistedRecord);
    auditServiceMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const command: CreateRecordCommand = {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 4.6,
    };

    const result = await service.createRecord(rangeDetails.slug, command, user);

    expect(result.isSuccess).toBe(true);
    expect(repositoryMocks.createRecord).toHaveBeenCalled();
    const repositoryPayload = repositoryMocks.createRecord.mock.calls[0][0] as CreateRecordData;
    expect(repositoryPayload).toMatchObject({
      range_id: rangeDetails.id,
      admin_id: user.id,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      num_participants: 4,
    });
    expect(auditServiceMocks.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'RECORD_CREATE',
        target_id: persistedRecord.id,
      }),
    );
    expect(result.getValue()).toStrictEqual({
      id: persistedRecord.id,
      rangeId: persistedRecord.range_id,
      adminId: persistedRecord.admin_id,
      eventDate: persistedRecord.event_date,
      startTime: persistedRecord.start_time,
      endTime: persistedRecord.end_time,
      numParticipants: persistedRecord.num_participants,
      createdAt: persistedRecord.created_at,
    });
  });

  it('allows global club administrators to create records', async () => {
    const { service, repositoryMocks, rangesServiceMocks, auditServiceMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser({
      roles: [makeGlobalRole(UserRole.ClubCommunityAdministrator)],
    });

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    repositoryMocks.createRecord.mockResolvedValue(createRecordEntity());
    auditServiceMocks.logAction.mockResolvedValue(Result.ok(undefined));

    const command: CreateRecordCommand = {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 2,
    };

    const result = await service.createRecord(rangeDetails.slug, command, user);

    expect(result.isSuccess).toBe(true);
  });

  it('rejects deleted users', async () => {
    const { service, rangesServiceMocks, repositoryMocks } = setup();
    const user = createUser({ isDeleted: 1 });

    const result = await service.createRecord('central-range', {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 2,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(rangesServiceMocks.getRangeDetails).not.toHaveBeenCalled();
    expect(repositoryMocks.createRecord).not.toHaveBeenCalled();
  });

  it('returns forbidden when user lacks administrative access', async () => {
    const { service, rangesServiceMocks, repositoryMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser();

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));

    const result = await service.createRecord(rangeDetails.slug, {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 3,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
    expect(repositoryMocks.createRecord).not.toHaveBeenCalled();
  });

  it('propagates range lookup failure', async () => {
    const { service, rangesServiceMocks } = setup();
    const user = createUser({
      rangeRoles: {
        7: [makeRangeRole(UserRole.ShootingRangeAdministrator)],
      },
    });
    const notFoundError = new RangeNotFoundError('Range missing');

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.fail(notFoundError));

    const result = await service.createRecord('missing-range', {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 3,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(notFoundError);
  });

  it('validates record time window', async () => {
    const { service, rangesServiceMocks, repositoryMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser({
      rangeRoles: {
        [rangeDetails.id]: [makeRangeRole(UserRole.ShootingRangeAdministrator)],
      },
    });

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));

    const result = await service.createRecord(rangeDetails.slug, {
      eventDate: '2024-05-01',
      startTime: '11:00',
      endTime: '10:00',
      numParticipants: 3,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(InvalidRecordTimeError);
    expect(repositoryMocks.createRecord).not.toHaveBeenCalled();
  });

  it('handles repository failures gracefully', async () => {
    const { service, repositoryMocks, rangesServiceMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser({
      rangeRoles: {
        [rangeDetails.id]: [makeRangeRole(UserRole.ShootingRangeAdministrator)],
      },
    });

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    repositoryMocks.createRecord.mockRejectedValue(new Error('insert failed'));

    const result = await service.createRecord(rangeDetails.slug, {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 3,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RecordCreationError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create manual record', expect.any(Error));
  });

  it('returns an error when audit logging fails', async () => {
    const { service, repositoryMocks, rangesServiceMocks, auditServiceMocks } = setup();
    const rangeDetails = createRangeDetails();
    const user = createUser({
      rangeRoles: {
        [rangeDetails.id]: [makeRangeRole(UserRole.ShootingRangeAdministrator)],
      },
    });

    rangesServiceMocks.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    repositoryMocks.createRecord.mockResolvedValue(createRecordEntity());
    auditServiceMocks.logAction.mockResolvedValue(Result.fail(new Error('audit failed')));

    const result = await service.createRecord(rangeDetails.slug, {
      eventDate: '2024-05-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 3,
    }, user);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(RecordCreationError);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to log record creation', expect.any(Error));
  });
});
