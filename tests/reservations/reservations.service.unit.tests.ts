import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  CreatePropositionCommand,
  CancelPropositionCommand,
  CreateRecordCommand,
  CreateReservationCommand,
  CreateReservationFromPropositionCommand,
  CancelReservationCommand,
  CreatedReservationDto,
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidRecordTimeError,
  InvalidReservationTimeError,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionNotFoundError,
  UnauthorizedPropositionError,
  RecordCreationError,
  ReservationCancellationError,
  ReservationConflictError,
  ReservationCreationError,
  ReservationNotFoundError,
  Result,
  RangeDetailsDto,
  Role,
  UserDto,
  UserProfile,
  UserRole,
} from '@strzel-sobie/common';
import { ReservationsService } from '../../src/reservations/src/application/reservations.service';
import type {
  IReservationsRepository,
  OverlappingUsage,
  Proposition,
  PropositionDetail,
  RecordEntity,
  Reservation,
  ReservationDetail,
  ReservationConflict,
} from '../../src/reservations/src/domain/reservations.repository';

type TestContext = {
  service: ReservationsService;
  rangesService: {
    getRangeDetails: ReturnType<typeof vi.fn>;
  };
  reservationsRepository: {
    getPropositions: ReturnType<typeof vi.fn>;
    getReservations: ReturnType<typeof vi.fn>;
    getOverlappingUsage: ReturnType<typeof vi.fn>;
    getOverlappingReservationsDetails: ReturnType<typeof vi.fn>;
    createProposition: ReturnType<typeof vi.fn>;
    createReservation: ReturnType<typeof vi.fn>;
    createReservationFromProposition: ReturnType<typeof vi.fn>;
    createRecord: ReturnType<typeof vi.fn>;
    markPropositionConverted: ReturnType<typeof vi.fn>;
    getPropositionById: ReturnType<typeof vi.fn>;
    getPropositionDetailById: ReturnType<typeof vi.fn>;
    cancelProposition: ReturnType<typeof vi.fn>;
    getReservationById: ReturnType<typeof vi.fn>;
    getReservationDetailById: ReturnType<typeof vi.fn>;
    deleteReservation: ReturnType<typeof vi.fn>;
  };
  auditService: {
    logAction: ReturnType<typeof vi.fn>;
  };
  rangeDetails: RangeDetailsDto;
};

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.clearAllMocks();
  consoleErrorSpy.mockClear();
});

afterAll(() => {
  consoleErrorSpy.mockRestore();
});

const createRole = (name: UserRole, scope: Role['scope'] = 'global', idSeed = Math.floor(Math.random() * 1000)): Role => ({
  id: idSeed,
  name,
  scope,
});

const createRangeDetails = (overrides: Partial<RangeDetailsDto> = {}): RangeDetailsDto => ({
  id: 1,
  slug: 'alpha-range',
  displayName: 'Alpha Range',
  totalTracks: 6,
  operatingHours: {},
  ...overrides,
});

const createUserDto = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 10,
  email: 'user@example.com',
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const createUserProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 10,
  email: 'user@example.com',
  phone_number: null,
  is_deleted: 0,
  created_at: '2024-01-01T00:00:00Z',
  roles: [],
  range_roles: {},
  ...overrides,
});

const createPropositionEntity = (overrides: Partial<Proposition> = {}): Proposition => ({
  id: 7,
  user_id: 10,
  range_id: 1,
  status: 'open',
  event_date: '2024-01-10',
  start_time: '10:00',
  end_time: '11:00',
  num_participants: 4,
  tracks_requested: 2,
  is_member: true,
  ...overrides,
});

const createPropositionDetailEntity = (
  overrides: Partial<PropositionDetail> = {}
): PropositionDetail => ({
  ...createPropositionEntity(overrides as Partial<Proposition>),
  created_at: '2024-01-05T10:00:00Z',
  requester_email: 'requester@example.com',
  requester_phone_number: null,
  ...overrides,
});

const createReservationEntity = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 42,
  range_id: 1,
  coordinator_id: 10,
  proposition_id: null,
  event_date: '2024-01-10',
  start_time: '12:00',
  end_time: '13:00',
  num_participants: 6,
  tracks_requested: 3,
  is_public: true,
  is_joinable: false,
  ...overrides,
});

const createReservationDetailEntity = (
  overrides: Partial<ReservationDetail> = {}
): ReservationDetail => ({
  ...createReservationEntity(overrides as Partial<Reservation>),
  created_at: '2024-01-06T09:00:00Z',
  coordinator_email: 'coordinator@example.com',
  coordinator_phone_number: null,
  ...overrides,
});

const createRecordEntity = (overrides: Partial<RecordEntity> = {}): RecordEntity => ({
  id: 5,
  admin_id: 10,
  range_id: 1,
  event_date: '2024-02-01',
  start_time: '09:00',
  end_time: '10:00',
  num_participants: 10,
  created_at: '2024-02-01T00:00:00Z',
  ...overrides,
});

const createConflict = (overrides: Partial<ReservationConflict> = {}): ReservationConflict => ({
  id: 90,
  type: 'reservation',
  event_date: '2024-01-10',
  start_time: '10:30',
  end_time: '11:30',
  tracks_requested: 2,
  ...overrides,
});

const createUsage = (overrides: Partial<OverlappingUsage> = {}): OverlappingUsage => ({
  propositions_tracks: 0,
  reservations_tracks: 0,
  ...overrides,
});

const createTestContext = (rangeOverrides: Partial<RangeDetailsDto> = {}): TestContext => {
  const rangeDetails = createRangeDetails(rangeOverrides);

  const rangesService = {
    getRangeDetails: vi.fn().mockResolvedValue(Result.ok(rangeDetails)),
  };

  const reservationsRepository = {
    getPropositions: vi.fn().mockResolvedValue([] as Proposition[]),
    getReservations: vi.fn().mockResolvedValue([] as Reservation[]),
    getOverlappingUsage: vi.fn().mockResolvedValue(createUsage()),
    getOverlappingReservationsDetails: vi.fn().mockResolvedValue([] as ReservationConflict[]),
    createProposition: vi.fn(),
    createReservation: vi.fn(),
    createReservationFromProposition: vi.fn(),
    createRecord: vi.fn(),
    markPropositionConverted: vi.fn().mockResolvedValue(undefined),
    getPropositionById: vi.fn(),
    getPropositionDetailById: vi.fn(),
    cancelProposition: vi.fn(),
    getReservationById: vi.fn(),
    getReservationDetailById: vi.fn(),
    deleteReservation: vi.fn(),
  };

  const auditService = {
    logAction: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
  };

  const service = new ReservationsService(
    rangesService as unknown as any,
    reservationsRepository as unknown as IReservationsRepository,
    auditService as unknown as any
  );

  return {
    service,
    rangesService,
    reservationsRepository,
    auditService,
    rangeDetails,
  };
};

const createDirectReservationCommand = (overrides: Partial<CreateReservationCommand> = {}): CreateReservationCommand => ({
  eventDate: '2024-01-10',
  startTime: '12:00',
  endTime: '13:00',
  numParticipants: 6,
  tracksRequested: 2,
  isPublic: true,
  isJoinable: true,
  ...overrides,
});

const createCoordinatorUser = (): UserDto => createUserDto({ roles: [createRole(UserRole.Coordinator)] });

type ReservationCommandOverrideFactory = (ctx: TestContext) => Partial<CreateReservationCommand>;
type RecordCommandOverrideFactory = (ctx: TestContext) => Partial<CreateRecordCommand>;
type PropositionCommandOverrideFactory = (ctx: TestContext) => Partial<CreatePropositionCommand>;

describe('ReservationsService contract', () => {
  describe('getCalendarEvents', () => {
    it('returns failure when range details lookup fails', async () => {
      const ctx = createTestContext();
      const rangeError = new Error('range missing');
      ctx.rangesService.getRangeDetails.mockResolvedValueOnce(Result.fail<RangeDetailsDto>(rangeError));

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: createUserProfile(),
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(rangeError);
    });

    it('returns failure when repository throws during event fetch', async () => {
      const ctx = createTestContext();
      const repoError = new Error('db unavailable');
      ctx.reservationsRepository.getPropositions.mockRejectedValueOnce(repoError);
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([]);

      const adminProfile = createUserProfile({
        roles: [createRole(UserRole.ClubCommunityAdministrator)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: adminProfile,
      });

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(repoError);
    });

    it('keeps all events and details for range administrators', async () => {
      const ctx = createTestContext();
      const propositionA = createPropositionEntity({ id: 1, user_id: 10, range_id: ctx.rangeDetails.id });
      const propositionB = createPropositionEntity({ id: 2, user_id: 99, range_id: ctx.rangeDetails.id });
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([propositionA, propositionB]);

      const reservationA = createReservationEntity({ id: 11, coordinator_id: 10 });
      const reservationB = createReservationEntity({ id: 12, coordinator_id: 99, is_public: false });
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([reservationA, reservationB]);

      const adminProfile = createUserProfile({
        roles: [createRole(UserRole.ClubCommunityAdministrator)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: adminProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.propositions).toHaveLength(2);
      expect(events.reservations).toHaveLength(2);
      expect(events.reservations.every((event) => event.details !== null)).toBe(true);
    });

    it('keeps all propositions visible to members while exposing reservation details', async () => {
      const ctx = createTestContext();
      const ownProposition = createPropositionEntity({ id: 1, user_id: 10 });
      const otherProposition = createPropositionEntity({ id: 2, user_id: 11 });
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([ownProposition, otherProposition]);

      const ownReservation = createReservationEntity({ id: 20, coordinator_id: 10 });
      const otherReservation = createReservationEntity({ id: 21, coordinator_id: 15, is_public: true });
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([ownReservation, otherReservation]);

      const memberProfile = createUserProfile({
        id: 10,
        roles: [createRole(UserRole.Member)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: memberProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.propositions).toHaveLength(2);
      const reservationDetails = events.reservations.find((event) => event.id === otherReservation.id);
      expect(reservationDetails?.details?.coordinatorId).toBe(otherReservation.coordinator_id);
      const ownReservationEvent = events.reservations.find((event) => event.id === ownReservation.id);
      expect(ownReservationEvent?.details?.coordinatorId).toBe(ownReservation.coordinator_id);
    });

    it('filters propositions to the owner when the requester is a guest', async () => {
      const ctx = createTestContext();
      const ownProposition = createPropositionEntity({ id: 1, user_id: 77 });
      const otherProposition = createPropositionEntity({ id: 2, user_id: 11 });
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([ownProposition, otherProposition]);
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({ id: 40, coordinator_id: 12, is_public: true }),
      ]);

      const guestProfile = createUserProfile({ id: 77, roles: [createRole(UserRole.Guest)] });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: guestProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.propositions).toHaveLength(1);
      expect(events.propositions[0].id).toBe(ownProposition.id);
    });

    it('attaches linked proposition details to reservation events when viewer has access', async () => {
      const ctx = createTestContext();
      const propositionDetail = createPropositionDetailEntity({
        id: 55,
        user_id: 200,
        status: 'converted',
      });
      const reservation = createReservationEntity({
        id: 90,
        proposition_id: propositionDetail.id,
        range_id: ctx.rangeDetails.id,
      });

      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([reservation]);
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([]);
      ctx.reservationsRepository.getPropositionDetailById.mockResolvedValueOnce(propositionDetail);

      const coordinatorProfile = createUserProfile({
        id: propositionDetail.user_id,
        roles: [createRole(UserRole.Coordinator)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: coordinatorProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.reservations).toHaveLength(1);
      const reservationEvent = events.reservations[0];
      expect(reservationEvent.propositionId).toBe(propositionDetail.id);
      expect(reservationEvent.proposition?.id).toBe(propositionDetail.id);
      expect(reservationEvent.proposition?.requester?.email).toBe(propositionDetail.requester_email);
      expect(ctx.reservationsRepository.getPropositionDetailById).toHaveBeenCalledWith(propositionDetail.id);
    });

    it('redacts requester information when viewer cannot access linked proposition', async () => {
      const ctx = createTestContext();
      const propositionDetail = createPropositionDetailEntity({
        id: 56,
        status: 'converted',
        user_id: 400,
        requester_email: 'hidden@example.com',
      });
      const reservation = createReservationEntity({
        id: 91,
        proposition_id: propositionDetail.id,
        range_id: ctx.rangeDetails.id,
        is_public: true,
      });

      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([reservation]);
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([]);
      ctx.reservationsRepository.getPropositionDetailById.mockResolvedValueOnce(propositionDetail);

      const guestProfile = createUserProfile({
        id: 1,
        roles: [createRole(UserRole.Guest)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: guestProfile,
      });

      expect(result.isSuccess).toBe(true);
      const reservationEvent = result.getValue().reservations[0];
      expect(reservationEvent.propositionId).toBe(propositionDetail.id);
      expect(reservationEvent.proposition?.requester).toBeNull();
    });

    it('exposes public reservation details to guests while hiding private reservations', async () => {
      const ctx = createTestContext();
      const guestReservation = createReservationEntity({ id: 30, is_public: true, coordinator_id: 50, is_joinable: true });
      const privateReservation = createReservationEntity({ id: 31, is_public: false, coordinator_id: 51 });
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([guestReservation, privateReservation]);
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([
        createPropositionEntity({ id: 3, user_id: 50 }),
      ]);

      const guestProfile = createUserProfile({ id: 77 });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: guestProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.reservations).toHaveLength(2);

      const publicEvent = events.reservations.find((event) => event.id === guestReservation.id);
      const privateEvent = events.reservations.find((event) => event.id === privateReservation.id);

      expect(publicEvent?.details).toEqual({ coordinatorId: guestReservation.coordinator_id, numParticipants: guestReservation.num_participants });
      expect(publicEvent?.tracksRequested).toBe(guestReservation.tracks_requested);
      expect(publicEvent?.isPublic).toBe(true);
      expect(publicEvent?.isJoinable).toBe(guestReservation.is_joinable);
      expect(privateEvent?.details).toBeNull();
      expect(privateEvent?.tracksRequested).toBeNull();
      expect(privateEvent?.isPublic).toBe(false);
      expect(privateEvent?.isJoinable).toBeNull();
    });

    it('does not leak private details when guest shares coordinator id without privileges', async () => {
      const ctx = createTestContext();
      const privateReservation = createReservationEntity({
        id: 32,
        coordinator_id: 88,
        is_public: false,
        num_participants: 5,
      });
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([privateReservation]);

      const guestProfile = createUserProfile({
        id: 88,
        roles: [createRole(UserRole.Guest)],
      });

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: guestProfile,
      });

      expect(result.isSuccess).toBe(true);
      const events = result.getValue();
      expect(events.reservations).toHaveLength(1);
      const reservationDetails = events.reservations[0];
      expect(reservationDetails.details).toBeNull();
      expect(reservationDetails.tracksRequested).toBeNull();
      expect(reservationDetails.isPublic).toBe(false);
      expect(reservationDetails.isJoinable).toBeNull();
    });
  });

  describe('createReservation (direct)', () => {
    it('rejects deleted users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ isDeleted: true });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates range lookup failure', async () => {
      const ctx = createTestContext();
      const lookupError = new Error('range down');
      ctx.rangesService.getRangeDetails.mockResolvedValueOnce(Result.fail<RangeDetailsDto>(lookupError));

      const user = createUserDto({
        roles: [createRole(UserRole.Coordinator)],
      });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(lookupError);
    });

    it('rejects users without reservation permission', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [], rangeRoles: {} });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    const invalidReservationCases: Array<[string, ReservationCommandOverrideFactory]> = [
      ['event date uses invalid format', () => ({ eventDate: '20240110' })],
      ['event date contains invalid calendar values', () => ({ eventDate: '2024-13-10' })],
      ['start time uses invalid format', () => ({ startTime: '9am' })],
      ['time values fall outside allowed hours', () => ({ startTime: '24:00' })],
      ['time minutes fall outside allowed range', () => ({ startTime: '12:75' })],
      ['time minutes fall outside allowed range', () => ({ startTime: '12:75' })],
      ['time minutes fall outside allowed range', () => ({ startTime: '12:75' })],
      ['times are not aligned to five-minute increments', () => ({ startTime: '10:02', endTime: '11:01' })],
      ['end time is not later than start time', () => ({ startTime: '11:00', endTime: '11:00' })],
      ['participant count is not an integer', () => ({ numParticipants: 3.5 })],
      ['participant count is below minimum', () => ({ numParticipants: 0 })],
      ['participant count exceeds maximum', () => ({ numParticipants: 51 })],
      ['tracks requested is not an integer', () => ({ tracksRequested: 1.5 })],
      ['tracks requested is below minimum', () => ({ tracksRequested: 0 })],
      ['tracks requested exceed capacity', (ctx) => ({ tracksRequested: ctx.rangeDetails.totalTracks + 1 })],
      ['isPublic flag is not boolean', () => ({ isPublic: 'yes' as unknown as boolean })],
      ['isJoinable flag is not boolean', () => ({ isJoinable: 'yes' as unknown as boolean })],
    ];

    it.each(invalidReservationCases)('returns InvalidReservationTimeError when %s', async (_, overrideFactory) => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const command = createDirectReservationCommand(overrideFactory(ctx));

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        command,
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidReservationTimeError);
    });

    it('returns failure when conflict exists and force disabled', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const conflict = createConflict();
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([conflict]);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      const error = result.getError();
      expect(error).toBeInstanceOf(ReservationConflictError);
      if (error instanceof ReservationConflictError) {
        expect(error.details.conflicts[0].id).toBe(conflict.id);
      }
    });

    it('allows reservation creation when conflicts only include propositions', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: user.id });
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([
        createConflict({ type: 'proposition' }),
      ]);
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('propagates overlap lookup errors', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const overlapError = new Error('overlap failed');
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockRejectedValueOnce(overlapError);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(overlapError);
    });

    it('fails when audit logging fails after reservation creation', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(
        createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: user.id })
      );
      const auditError = new Error('audit down');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(auditError);
    });

    it('creates reservation when conflicts exist but force flag is set', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([createConflict()]);
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: user.id });
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: true },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('allows range administrators with scoped roles to create reservations', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id });
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.ShootingRangeAdministrator, 'range')],
        },
      });
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('allows range coordinators with scoped roles to create reservations', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 77 });
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.Coordinator, 'range')],
        },
      });
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('wraps repository errors as ReservationCreationError', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      ctx.reservationsRepository.createReservation.mockRejectedValueOnce(new Error('insert failed'));

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createDirectReservationCommand(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationCreationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('createReservation (conversion)', () => {
    const createConversionPayload = (
      overrides: Partial<CreateReservationFromPropositionCommand> = {}
    ): CreateReservationFromPropositionCommand => ({
      propositionId: 7,
      ...overrides,
    });

    it('propagates repository failure when loading proposition', async () => {
      const ctx = createTestContext();
      const loadError = new Error('lookup failed');
      ctx.reservationsRepository.getPropositionById.mockRejectedValueOnce(loadError);
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(loadError);
    });

    it('fails when proposition is missing', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(null);
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionNotFoundError);
    });

    it('guards against propositions belonging to another range', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(
        createPropositionEntity({ range_id: ctx.rangeDetails.id + 1 })
      );
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('requires proposition to be open', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(
        createPropositionEntity({ status: 'cancelled' })
      );
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionAlreadyClosedError);
    });

    it('validates adjusted time window', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(createPropositionEntity());
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload({ startTime: '25:00' }),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidReservationTimeError);
    });

    it('validates requested tracks against capacity', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(createPropositionEntity());
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload({ tracksRequested: ctx.rangeDetails.totalTracks + 1 }),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidReservationTimeError);
    });

    it('propagates overlap errors during conversion', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(createPropositionEntity());
      const overlapError = new Error('overlap failed');
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockRejectedValueOnce(overlapError);
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(overlapError);
    });

    it('requires force flag when conflicts exist', async () => {
      const ctx = createTestContext();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(createPropositionEntity());
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([createConflict()]);
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationConflictError);
    });

    it('converts proposition when conflicts only include other propositions', async () => {
      const ctx = createTestContext();
      const proposition = createPropositionEntity();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([
        createConflict({ type: 'proposition' }),
      ]);
      const user = createCoordinatorUser();
      const reservation = createReservationEntity({
        range_id: ctx.rangeDetails.id,
        coordinator_id: user.id,
        proposition_id: proposition.id,
      });
      ctx.reservationsRepository.createReservationFromProposition.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('converts proposition with conflicts when force flag enabled', async () => {
      const ctx = createTestContext();
      const proposition = createPropositionEntity();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([createConflict()]);
      const user = createCoordinatorUser();
      const reservation = createReservationEntity({
        range_id: ctx.rangeDetails.id,
        coordinator_id: user.id,
        proposition_id: proposition.id,
      });
      ctx.reservationsRepository.createReservationFromProposition.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: true },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });

    it('fails if audit logging fails after conversion', async () => {
      const ctx = createTestContext();
      const proposition = createPropositionEntity();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      const user = createCoordinatorUser();
      const reservation = createReservationEntity({
        range_id: ctx.rangeDetails.id,
        coordinator_id: user.id,
        proposition_id: proposition.id,
      });
      ctx.reservationsRepository.createReservationFromProposition.mockResolvedValueOnce(reservation);
      const auditError = new Error('audit failed');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: true },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(auditError);
    });

    it('returns ReservationCreationError when conversion repository rejects', async () => {
      const ctx = createTestContext();
      const proposition = createPropositionEntity();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      ctx.reservationsRepository.createReservationFromProposition.mockRejectedValueOnce(new Error('convert failed'));
      const user = createCoordinatorUser();

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationCreationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
  });

    it('converts proposition when validation passes and conflicts resolved', async () => {
      const ctx = createTestContext();
      const proposition = createPropositionEntity();
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValueOnce([]);
      const user = createCoordinatorUser();
      const reservation = createReservationEntity({
        range_id: ctx.rangeDetails.id,
        coordinator_id: user.id,
        proposition_id: proposition.id,
        start_time: '10:00',
        end_time: '11:00',
      });
      ctx.reservationsRepository.createReservationFromProposition.mockResolvedValueOnce(reservation);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        createConversionPayload(),
        { force: false },
        user
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      });
    });
  });

  describe('getReservationDetails', () => {
    it('includes proposition detail when viewer has access', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const proposition = createPropositionDetailEntity({ id: 77, status: 'converted', user_id: 99 });
      const reservation = createReservationDetailEntity({
        id: 120,
        proposition_id: proposition.id,
        range_id: ctx.rangeDetails.id,
        coordinator_id: user.id,
      });

      ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.getPropositionDetailById.mockResolvedValueOnce(proposition);

      const result = await ctx.service.getReservationDetails(reservation.id, user);

      expect(result.isSuccess).toBe(true);
      expect(ctx.reservationsRepository.getPropositionDetailById).toHaveBeenCalledWith(proposition.id);
      const detail = result.getValue();
      expect(detail.propositionId).toBe(proposition.id);
      expect(detail.proposition).not.toBeNull();
      expect(detail.proposition?.id).toBe(proposition.id);
      expect(detail.proposition?.status).toBe('converted');
      expect(detail.proposition?.requester?.id).toBe(proposition.user_id);
    });

    it('omits proposition detail when viewer lacks permission', async () => {
      const ctx = createTestContext();
      const user = createUserDto(); // guest without roles
      const proposition = createPropositionDetailEntity({ id: 81, user_id: 404 });
      const reservation = createReservationDetailEntity({
        id: 121,
        proposition_id: proposition.id,
        range_id: ctx.rangeDetails.id,
        is_public: true,
      });

    ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(reservation);
    ctx.reservationsRepository.getPropositionDetailById.mockResolvedValueOnce(proposition);

    const result = await ctx.service.getReservationDetails(reservation.id, user);

    expect(result.isSuccess).toBe(true);
    const detail = result.getValue();
    expect(detail.propositionId).toBe(proposition.id);
    expect(detail.proposition).not.toBeNull();
    expect(detail.proposition?.status).toBe(proposition.status);
    expect(detail.proposition?.requester).toBeNull();
  });

  it('propagates repository failures when loading linked proposition', async () => {
      const ctx = createTestContext();
      const user = createCoordinatorUser();
      const reservation = createReservationDetailEntity({
        id: 122,
        proposition_id: 91,
        range_id: ctx.rangeDetails.id,
      });
      const loadError = new Error('lookup failed');

      ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.getPropositionDetailById.mockRejectedValueOnce(loadError);

      const result = await ctx.service.getReservationDetails(reservation.id, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(loadError);
    });
  });

  describe('createRecord', () => {
    const command: CreateRecordCommand = {
      eventDate: '2024-03-01',
      startTime: '09:00',
      endTime: '10:00',
      numParticipants: 12,
    };

    it('rejects deleted users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ isDeleted: true });

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates range lookup failures', async () => {
      const ctx = createTestContext();
      const rangeError = new Error('range missing');
      ctx.rangesService.getRangeDetails.mockResolvedValueOnce(Result.fail<RangeDetailsDto>(rangeError));
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(rangeError);
    });

    it('rejects users without record permission', async () => {
      const ctx = createTestContext();
      const user = createUserDto();

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    const invalidRecordCases: Array<[string, RecordCommandOverrideFactory]> = [
      ['event date uses invalid format', () => ({ eventDate: '2024/03/01' })],
      ['event date contains invalid calendar values', () => ({ eventDate: '2024-13-01' })],
      ['start time uses invalid format', () => ({ startTime: '9am' })],
      ['time values fall outside allowed hours', () => ({ startTime: '24:00' })],
      ['times are not aligned to five-minute increments', () => ({ startTime: '09:02', endTime: '10:01' })],
      ['end time is not later than start time', () => ({ startTime: '10:00', endTime: '09:00' })],
      ['participant count is not finite', () => ({ numParticipants: Number.POSITIVE_INFINITY })],
      ['participant count below minimum after truncation', () => ({ numParticipants: 0.2 })],
      ['participant count exceeds maximum', () => ({ numParticipants: 1000 })],
    ];

    it.each(invalidRecordCases)('returns InvalidRecordTimeError when %s', async (_, overrideFactory) => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      const invalidCommand = { ...command, ...overrideFactory(ctx) };

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, invalidCommand, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidRecordTimeError);
    });

    it('returns RecordCreationError when repository throws', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      ctx.reservationsRepository.createRecord.mockRejectedValueOnce(new Error('insert failed'));

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RecordCreationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('returns RecordCreationError when audit logging fails', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      ctx.reservationsRepository.createRecord.mockResolvedValueOnce(createRecordEntity({ range_id: ctx.rangeDetails.id }));
      const auditError = new Error('audit failed');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RecordCreationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('allows range administrators with scoped roles to create records', async () => {
      const ctx = createTestContext();
      const record = createRecordEntity({ range_id: ctx.rangeDetails.id });
      const user = createUserDto({
        id: record.admin_id,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.ShootingRangeAdministrator, 'range')],
        },
      });
      ctx.reservationsRepository.createRecord.mockResolvedValueOnce(record);

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().adminId).toBe(record.admin_id);
    });

    it('truncates participant counts before persisting records', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      const fractionalParticipants = 17.8;
      const record = createRecordEntity({
        range_id: ctx.rangeDetails.id,
        admin_id: user.id,
        num_participants: Math.trunc(fractionalParticipants),
      });
      ctx.reservationsRepository.createRecord.mockResolvedValueOnce(record);

      const result = await ctx.service.createRecord(
        ctx.rangeDetails.slug,
        { ...command, numParticipants: fractionalParticipants },
        user
      );

      expect(ctx.reservationsRepository.createRecord).toHaveBeenCalledWith(
        expect.objectContaining({ num_participants: Math.trunc(fractionalParticipants) })
      );
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().numParticipants).toBe(Math.trunc(fractionalParticipants));
    });

    it('returns created record DTO on success', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      const record = createRecordEntity({ range_id: ctx.rangeDetails.id, admin_id: user.id });
      ctx.reservationsRepository.createRecord.mockResolvedValueOnce(record);

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(true);
      const dto = result.getValue();
      expect(dto.id).toBe(record.id);
      expect(dto.adminId).toBe(user.id);
    });
  });

  describe('createProposition', () => {
    const command: CreatePropositionCommand = {
      eventDate: '2024-04-01',
      startTime: '10:00',
      endTime: '11:00',
      numParticipants: 4,
      tracksRequested: 2,
    };

    it('rejects deleted users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ isDeleted: true });

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates range detail errors', async () => {
      const ctx = createTestContext();
      const rangeError = new Error('range missing');
      ctx.rangesService.getRangeDetails.mockResolvedValueOnce(Result.fail<RangeDetailsDto>(rangeError));
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(rangeError);
    });

    it('rejects unauthorized users', async () => {
      const ctx = createTestContext();
      const user = createUserDto();

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UnauthorizedPropositionError);
    });

    const invalidPropositionCases: Array<[string, PropositionCommandOverrideFactory]> = [
      ['event date uses invalid format', () => ({ eventDate: '2024/04/01' })],
      ['event date contains invalid calendar values', () => ({ eventDate: '2024-13-01' })],
      ['start time uses invalid format', () => ({ startTime: '10am' })],
      ['time values fall outside allowed hours', () => ({ startTime: '24:00' })],
      ['times are not aligned to five-minute increments', () => ({ startTime: '10:02', endTime: '11:01' })],
      ['end time is not later than start time', () => ({ startTime: '11:00', endTime: '10:30' })],
      ['participant count is not an integer', () => ({ numParticipants: 3.5 })],
      ['participant count is below minimum', () => ({ numParticipants: 0 })],
      ['participant count exceeds maximum', () => ({ numParticipants: 51 })],
      ['tracks requested is not an integer', () => ({ tracksRequested: 1.5 })],
      ['tracks requested is below minimum', () => ({ tracksRequested: 0 })],
      ['tracks requested exceeds capacity', (ctx) => ({ tracksRequested: ctx.rangeDetails.totalTracks + 1 })],
    ];

    it.each(invalidPropositionCases)('returns InvalidPropositionTimeError when %s', async (_, overrideFactory) => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const invalidCommand = { ...command, ...overrideFactory(ctx) };

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, invalidCommand, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidPropositionTimeError);
    });

    it('allows users with range member roles to create propositions', async () => {
      const ctx = createTestContext();
      const user = createUserDto({
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.Member, 'range')],
        },
      });
      const proposition = createPropositionEntity({ range_id: ctx.rangeDetails.id, user_id: user.id });
      ctx.reservationsRepository.createProposition.mockResolvedValueOnce(proposition);

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(proposition.id);
    });

    it('detects track conflicts from overlapping usage', async () => {
      const ctx = createTestContext({ totalTracks: 4 });
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getOverlappingUsage.mockResolvedValueOnce(
        createUsage({ propositions_tracks: 3, reservations_tracks: 1 })
      );

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionConflictError);
    });

    it('propagates repository errors during creation flow', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const repoError = new Error('repository failed');
      ctx.reservationsRepository.getOverlappingUsage.mockRejectedValueOnce(repoError);

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(repoError);
    });

    it('propagates repository errors when proposition insert fails', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const repoError = new Error('insert failed');
      ctx.reservationsRepository.createProposition.mockRejectedValueOnce(repoError);

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(repoError);
    });

    it('fails when audit logging fails', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const proposition = createPropositionEntity({ range_id: ctx.rangeDetails.id, user_id: user.id });
      ctx.reservationsRepository.createProposition.mockResolvedValueOnce(proposition);
      const auditError = new Error('audit failed');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(auditError);
    });

    it('creates proposition when inputs valid and capacity allows', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const proposition = createPropositionEntity({ range_id: ctx.rangeDetails.id, user_id: user.id });
      ctx.reservationsRepository.createProposition.mockResolvedValueOnce(proposition);

      const result = await ctx.service.createProposition(ctx.rangeDetails.slug, command, user);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(proposition.id);
    });
  });

  describe('cancelProposition', () => {
    const command: CancelPropositionCommand = { propositionId: 11 };

    it('rejects deleted users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ isDeleted: true });

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates repository lookup failures', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const repoError = new Error('lookup failed');
      ctx.reservationsRepository.getPropositionById.mockRejectedValueOnce(repoError);

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(repoError);
    });

    it('returns error when proposition missing', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(null);

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionNotFoundError);
    });

    it('rejects cancellations by other users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ id: 10, roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(
        createPropositionEntity({ user_id: 99 })
      );

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(UnauthorizedPropositionError);
    });

    it('rejects already closed propositions', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ id: 10, roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(
        createPropositionEntity({ user_id: user.id, status: 'converted' })
      );

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionAlreadyClosedError);
    });

    it('returns error when repository does not cancel proposition', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ id: 10, roles: [createRole(UserRole.Member)] });
      const proposition = createPropositionEntity({ user_id: user.id, status: 'open' });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.cancelProposition.mockResolvedValueOnce(null);

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionAlreadyClosedError);
    });

    it('propagates audit failures during cancellation', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ id: 10, roles: [createRole(UserRole.Member)] });
      const proposition = createPropositionEntity({ user_id: user.id, status: 'open' });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.cancelProposition.mockResolvedValueOnce(
        createPropositionEntity({ ...proposition, status: 'cancelled' })
      );
      const auditError = new Error('audit failed');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(auditError);
    });

    it('cancels propositions successfully', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ id: 10, roles: [createRole(UserRole.Member)] });
      const proposition = createPropositionEntity({ user_id: user.id, status: 'open' });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.cancelProposition.mockResolvedValueOnce(
        createPropositionEntity({ ...proposition, status: 'cancelled' })
      );

      const result = await ctx.service.cancelProposition(command, user);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeUndefined();
    });
  });

  describe('cancelReservation', () => {
    const command: CancelReservationCommand = { reservationId: 22 };

    it('rejects deleted users', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ isDeleted: true });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates repository lookup errors', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      const repoError = new Error('lookup failed');
      ctx.reservationsRepository.getReservationById.mockRejectedValueOnce(repoError);

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(repoError);
    });

    it('returns ReservationNotFoundError when reservation missing', async () => {
      const ctx = createTestContext();
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(null);

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationNotFoundError);
    });

    it('rejects users lacking cancel permission', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 99 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      const user = createUserDto({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('propagates repository delete errors', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 10 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      const deleteError = new Error('delete failed');
      ctx.reservationsRepository.deleteReservation.mockRejectedValueOnce(deleteError);
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.Coordinator, 'range')],
        },
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBe(deleteError);
    });

    it('returns ReservationNotFoundError when delete returns null', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 10 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(null);
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [createRole(UserRole.Coordinator)],
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationNotFoundError);
    });

    it('returns ReservationCancellationError when audit logging fails', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 10 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(reservation);
      const auditError = new Error('audit failed');
      ctx.auditService.logAction.mockResolvedValueOnce(Result.fail<void>(auditError));
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [createRole(UserRole.Coordinator)],
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationCancellationError);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('cancels reservations successfully for authorized users', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 10 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(reservation);
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [createRole(UserRole.Coordinator)],
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeUndefined();
    });

    it('allows range administrators with scoped roles to cancel reservations', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 99 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(reservation);
      const user = createUserDto({
        id: 200,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.ShootingRangeAdministrator, 'range')],
        },
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(true);
    });

    it('allows range coordinators to cancel their own reservations', async () => {
      const ctx = createTestContext();
      const reservation = createReservationEntity({ range_id: ctx.rangeDetails.id, coordinator_id: 55 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(reservation);
      const user = createUserDto({
        id: reservation.coordinator_id,
        roles: [],
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.Coordinator, 'range')],
        },
      });

      const result = await ctx.service.cancelReservation(command, user);

      expect(result.isSuccess).toBe(true);
    });
  });
});
