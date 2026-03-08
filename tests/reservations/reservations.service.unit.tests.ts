import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  CancelReservationCommand,
  CreatePropositionCommand,
  CreateRecordCommand,
  CreateReservationCommand,
  CreateReservationFromPropositionCommand,
  CreatedReservationDto,
  EventAudience,
  EventCapacityType,
  EventRegistrationType,
  EventStatus,
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidReservationTimeError,
  InvalidTargetAdminError,
  MemberRoleRequiredError,
  Proposition,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionDeclarationRequiredError,
  PropositionNotFoundError,
  RangeAdminRoleRequiredError,
  RangeDetailsDto,
  Reservation,
  ReservationCancellationError,
  ReservationConflictError,
  ReservationNotFoundError,
  Result,
  Role,
  UserDto,
  UserProfile,
  UserRole,
} from '@strzel-sobie/common/models';
import { ReservationsService } from '../../src/reservations/src/application/reservations.service';
import type {
  AdminMessageTemplate,
  IReservationsRepository,
  PropositionDetail,
  RecordEntity,
  ReservationDetail,
} from '../../src/reservations/src/domain/reservations.repository';

type Ctx = {
  service: ReservationsService;
  rangesService: {
    getRangeDetails: ReturnType<typeof vi.fn>;
  };
  reservationsRepository: {
    getPropositions: ReturnType<typeof vi.fn>;
    getReservations: ReturnType<typeof vi.fn>;
    getRecords: ReturnType<typeof vi.fn>;
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
    reopenProposition: ReturnType<typeof vi.fn>;
    listAdminMessageTemplates: ReturnType<typeof vi.fn>;
    createAdminMessageTemplate: ReturnType<typeof vi.fn>;
    updateAdminMessageTemplate: ReturnType<typeof vi.fn>;
    getAdminMessageTemplateById: ReturnType<typeof vi.fn>;
  };
  eventsService: {
    getRangeEvents: ReturnType<typeof vi.fn>;
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

const createRole = (name: UserRole, scope: Role['scope'] = 'global', id = 1): Role => ({
  id,
  name,
  scope,
});

const operatingHours: RangeDetailsDto['operatingHours'] = {
  monday: { open: '08:00', close: '20:00' },
  tuesday: { open: '08:00', close: '20:00' },
  wednesday: { open: '08:00', close: '20:00' },
  thursday: { open: '08:00', close: '20:00' },
  friday: { open: '08:00', close: '20:00' },
  saturday: { open: '08:00', close: '18:00' },
  sunday: null,
};

const createRangeDetails = (overrides: Partial<RangeDetailsDto> = {}): RangeDetailsDto => ({
  id: 1,
  slug: 'alpha-range',
  displayName: 'Alpha Range',
  type: 'club',
  allowsReservations: true,
  totalTracks: 6,
  operatingHours,
  extras: {},
  parkingLocation: null,
  firingLines: [
    { id: 1, name: 'Line 1', tracksCount: 6, lengthMeters: 25, sortOrder: 1 },
    { id: 2, name: 'Line 2', tracksCount: 4, lengthMeters: 50, sortOrder: 2 },
  ],
  administratorContacts: [],
  ...overrides,
});

const createUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 10,
  email: 'user@example.com',
  isDeleted: false,
  createdAt: '2024-01-01T00:00:00Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const createProfile = (overrides: Partial<UserProfile> = {}): UserProfile => ({
  id: 10,
  email: 'profile@example.com',
  phone_number: null,
  is_deleted: 0,
  created_at: '2024-01-01T00:00:00Z',
  roles: [],
  range_roles: {},
  ...overrides,
});

const metadata = (trackNos: number[], extra: Record<string, unknown> = {}) =>
  JSON.stringify({ ...extra, trackNos });

const createPropositionEntity = (overrides: Partial<Proposition> = {}): Proposition => ({
  id: 7,
  user_id: 10,
  range_id: 1,
  status: 'open',
  event_date: '2024-01-10',
  start_time: '10:00',
  end_time: '11:00',
  firing_line_id: 1,
  metadata_json: metadata([1, 2], { hasCoordinatorLicenseInGroup: true }),
  is_member: true,
  ...overrides,
});

const createPropositionDetailEntity = (
  overrides: Partial<PropositionDetail> = {}
): PropositionDetail => ({
  ...createPropositionEntity(overrides),
  created_at: '2024-01-05T10:00:00Z',
  requester_email: 'requester@example.com',
  requester_phone_number: null,
  ...overrides,
});

const createReservationEntity = (overrides: Partial<Reservation> = {}): Reservation => ({
  id: 42,
  range_id: 1,
  approved_by_admin_id: 100,
  proposition_id: null,
  event_date: '2024-01-10',
  start_time: '12:00',
  end_time: '13:00',
  firing_line_id: 1,
  metadata_json: metadata([2, 3]),
  ...overrides,
});

const createReservationDetailEntity = (
  overrides: Partial<ReservationDetail> = {}
): ReservationDetail => ({
  ...createReservationEntity(overrides),
  created_at: '2024-01-06T09:00:00Z',
  approved_by_admin_email: 'admin@example.com',
  approved_by_admin_phone_number: null,
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

const createTemplate = (overrides: Partial<AdminMessageTemplate> = {}): AdminMessageTemplate => ({
  id: 1,
  range_id: 1,
  created_by_admin_id: 100,
  name: 'Default',
  content: 'Approved.',
  is_active: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

const createCtx = (rangeOverrides: Partial<RangeDetailsDto> = {}): Ctx => {
  const rangeDetails = createRangeDetails(rangeOverrides);

  const rangesService = {
    getRangeDetails: vi.fn().mockResolvedValue(Result.ok(rangeDetails)),
  };

  const reservationsRepository = {
    getPropositions: vi.fn().mockResolvedValue([] as Proposition[]),
    getReservations: vi.fn().mockResolvedValue([] as Reservation[]),
    getRecords: vi.fn().mockResolvedValue([] as RecordEntity[]),
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
    reopenProposition: vi.fn(),
    listAdminMessageTemplates: vi.fn().mockResolvedValue([] as AdminMessageTemplate[]),
    createAdminMessageTemplate: vi.fn(),
    updateAdminMessageTemplate: vi.fn(),
    getAdminMessageTemplateById: vi.fn(),
  };

  const eventsService = {
    getRangeEvents: vi.fn().mockResolvedValue(Result.ok({ data: [] })),
  };

  const auditService = {
    logAction: vi.fn().mockResolvedValue(Result.ok<void>(undefined)),
  };

  const service = new ReservationsService(
    rangesService as any,
    reservationsRepository as unknown as IReservationsRepository,
    eventsService as any,
    auditService as any
  );

  return {
    service,
    rangesService,
    reservationsRepository,
    eventsService,
    auditService,
    rangeDetails,
  };
};

const directReservation = (
  overrides: Partial<CreateReservationCommand> = {}
): CreateReservationCommand => ({
  eventDate: '2024-01-10',
  startTime: '12:00',
  endTime: '13:00',
  firingLineId: 1,
  trackNos: [2, 1, 2],
  ...overrides,
});

const propositionCommand = (
  overrides: Partial<CreatePropositionCommand> = {}
): CreatePropositionCommand => ({
  eventDate: '2024-01-10',
  startTime: '10:00',
  endTime: '11:00',
  firingLineId: 1,
  trackNos: [1, 2],
  hasCoordinatorLicenseInGroup: false,
  ...overrides,
});

const convertCommand = (
  overrides: Partial<CreateReservationFromPropositionCommand> = {}
): CreateReservationFromPropositionCommand => ({
  propositionId: 7,
  adminMessage: 'Approved with remarks',
  ...overrides,
});

describe('ReservationsService', () => {
  describe('createReservation (direct)', () => {
    it('requires range admin role', async () => {
      const ctx = createCtx();
      const member = createUser({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        directReservation(),
        { force: false },
        member
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(RangeAdminRoleRequiredError);
    });

    it('returns conflict without force when overlapping reservation exists', async () => {
      const ctx = createCtx();
      const admin = createUser({
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.ShootingRangeAdministrator, 'range')],
        },
      });

      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({
          id: 99,
          event_date: '2024-01-10',
          start_time: '12:30',
          end_time: '13:30',
          firing_line_id: 1,
          metadata_json: metadata([1]),
        }),
      ]);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        directReservation({ trackNos: [1] }),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationConflictError);
    });

    it('creates reservation with normalized trackNos when forced', async () => {
      const ctx = createCtx();
      const admin = createUser({
        roles: [createRole(UserRole.ClubCommunityAdministrator)],
      });
      const saved = createReservationEntity({ approved_by_admin_id: admin.id });

      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({
          id: 88,
          event_date: '2024-01-10',
          start_time: '12:15',
          end_time: '12:45',
          metadata_json: metadata([2]),
        }),
      ]);
      ctx.reservationsRepository.createReservation.mockResolvedValueOnce(saved);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        directReservation({ trackNos: [3, 1, 3] }),
        { force: true },
        admin
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual<CreatedReservationDto>({
        id: saved.id,
        range_id: saved.range_id,
        approved_by_admin_id: saved.approved_by_admin_id,
      });
      expect(ctx.reservationsRepository.createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata_json: JSON.stringify({ trackNos: [1, 3] }),
        })
      );
    });

    it('validates selected firing line', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        directReservation({ firingLineId: 999 }),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidReservationTimeError);
    });
  });

  describe('createReservation (conversion)', () => {
    it('requires non-empty adminMessage', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        convertCommand({ adminMessage: '   ' }),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidReservationTimeError);
    });

    it('fails when proposition does not exist', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(null);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        convertCommand(),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionNotFoundError);
    });

    it('fails when proposition is not open', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(
        createPropositionEntity({ status: 'converted' })
      );

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        convertCommand(),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionAlreadyClosedError);
    });

    it('converts proposition and supports time adjustments', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      const source = createPropositionEntity({
        id: 7,
        firing_line_id: 1,
        metadata_json: metadata([2, 3], { hasCoordinatorLicenseInGroup: true }),
      });
      const saved = createReservationEntity({
        proposition_id: source.id,
        approved_by_admin_id: admin.id,
        event_date: '2024-01-11',
        start_time: '14:00',
        end_time: '15:00',
      });

      ctx.reservationsRepository.getPropositionById.mockResolvedValueOnce(source);
      ctx.reservationsRepository.createReservationFromProposition.mockResolvedValueOnce(saved);

      const result = await ctx.service.createReservation(
        ctx.rangeDetails.slug,
        convertCommand({ eventDate: '2024-01-11', startTime: '14:00', endTime: '15:00' }),
        { force: false },
        admin
      );

      expect(result.isSuccess).toBe(true);
      expect(ctx.reservationsRepository.createReservationFromProposition).toHaveBeenCalledWith(
        expect.objectContaining({
          proposition_id: source.id,
          event_date: '2024-01-11',
          start_time: '14:00',
          end_time: '15:00',
          metadata_json: JSON.stringify({ trackNos: [2, 3] }),
        }),
        source.id
      );
    });
  });

  describe('createProposition', () => {
    it('is limited to members', async () => {
      const ctx = createCtx();
      const guest = createUser({ roles: [createRole(UserRole.Guest)] });

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        propositionCommand(),
        guest
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(MemberRoleRequiredError);
    });

    it('requires coordinator declaration flag', async () => {
      const ctx = createCtx();
      const member = createUser({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        {
          ...propositionCommand(),
          hasCoordinatorLicenseInGroup: undefined as unknown as boolean,
        },
        member
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionDeclarationRequiredError);
    });

    it('forces coordinator declaration to true for coordinator role', async () => {
      const ctx = createCtx();
      const coordinatorMember = createUser({
        roles: [createRole(UserRole.Member), createRole(UserRole.Coordinator)],
      });
      const saved = createPropositionEntity({ user_id: coordinatorMember.id });
      ctx.reservationsRepository.createProposition.mockResolvedValueOnce(saved);

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        propositionCommand({ hasCoordinatorLicenseInGroup: false }),
        coordinatorMember
      );

      expect(result.isSuccess).toBe(true);
      expect(ctx.reservationsRepository.createProposition).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata_json: JSON.stringify({
            trackNos: [1, 2],
            hasCoordinatorLicenseInGroup: true,
          }),
        })
      );
    });

    it('detects conflicts on same line + overlapping track', async () => {
      const ctx = createCtx();
      const member = createUser({ roles: [createRole(UserRole.Member)] });
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({
          id: 200,
          event_date: '2024-01-10',
          start_time: '10:30',
          end_time: '11:30',
          firing_line_id: 1,
          metadata_json: metadata([2]),
        }),
      ]);

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        propositionCommand({ trackNos: [2] }),
        member
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(PropositionConflictError);
    });

    it('validates targetAdminUserId shape', async () => {
      const ctx = createCtx();
      const member = createUser({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        propositionCommand({ targetAdminUserId: -5 }),
        member
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidTargetAdminError);
    });

    it('returns InvalidPropositionTimeError for unknown firing line', async () => {
      const ctx = createCtx();
      const member = createUser({ roles: [createRole(UserRole.Member)] });

      const result = await ctx.service.createProposition(
        ctx.rangeDetails.slug,
        propositionCommand({ firingLineId: 999 }),
        member
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(InvalidPropositionTimeError);
    });
  });

  describe('getCalendarEvents', () => {
    it('maps public events and hides reservation details for guest', async () => {
      const ctx = createCtx();
      const ownProposition = createPropositionEntity({ id: 1, user_id: 77 });
      const otherProposition = createPropositionEntity({ id: 2, user_id: 10 });
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([ownProposition, otherProposition]);
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({ id: 50, metadata_json: metadata([1, 2]) }),
      ]);
      ctx.eventsService.getRangeEvents.mockResolvedValueOnce(
        Result.ok({
          data: [
            {
              id: 55,
              slug: 'open-day',
              rangeId: ctx.rangeDetails.id,
              name: 'Open Day',
              eventDate: '2024-01-15',
              startTime: '10:00',
              endTime: '12:00',
              registrationType: EventRegistrationType.Notice,
              audience: EventAudience.Public,
              capacityType: EventCapacityType.Unlimited,
              status: EventStatus.Active,
            },
          ],
        })
      );

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: createProfile({ id: 77, roles: [createRole(UserRole.Guest)] }),
      });

      expect(result.isSuccess).toBe(true);
      const payload = result.getValue();
      expect(payload.propositions).toHaveLength(1);
      expect(payload.propositions[0].id).toBe(ownProposition.id);
      expect(payload.reservations[0].details).toBeNull();
      expect(payload.reservations[0].trackNos).toEqual([]);
      expect(payload.events).toEqual([
        {
          id: 55,
          slug: 'open-day',
          name: 'Open Day',
          startTime: '2024-01-15T10:00:00',
          endTime: '2024-01-15T12:00:00',
          audience: 'Public',
        },
      ]);
    });

    it('includes manual records for admins', async () => {
      const ctx = createCtx();
      ctx.reservationsRepository.getRecords.mockResolvedValueOnce([
        createRecordEntity({ range_id: ctx.rangeDetails.id, admin_id: 10 }),
      ]);

      const result = await ctx.service.getCalendarEvents({
        rangeSlug: ctx.rangeDetails.slug,
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        user: createProfile({ roles: [createRole(UserRole.ClubCommunityAdministrator)] }),
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().records).toHaveLength(1);
    });
  });

  describe('getReservationDetails', () => {
    it('returns forbidden for guest without roles', async () => {
      const ctx = createCtx();
      ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(
        createReservationDetailEntity({ id: 100 })
      );

      const result = await ctx.service.getReservationDetails(100, createUser());

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('returns detail for member and maps trackNos from metadata', async () => {
      const ctx = createCtx();
      const reservation = createReservationDetailEntity({
        id: 101,
        metadata_json: metadata([3, 1, 3]),
      });
      ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(reservation);

      const result = await ctx.service.getReservationDetails(
        101,
        createUser({ roles: [createRole(UserRole.Member)] })
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().trackNos).toEqual([1, 3]);
    });

    it('builds overlap declaration context for proposition details', async () => {
      const ctx = createCtx();
      const proposition = createPropositionDetailEntity({
        id: 11,
        event_date: '2024-01-10',
        start_time: '10:00',
        end_time: '11:00',
        firing_line_id: 1,
        metadata_json: metadata([2, 3], { hasCoordinatorLicenseInGroup: true }),
      });

      ctx.reservationsRepository.getPropositionDetailById.mockResolvedValueOnce(proposition);
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([
        createPropositionEntity({
          id: 11,
          status: 'open',
          event_date: '2024-01-10',
          start_time: '10:00',
          end_time: '11:00',
          firing_line_id: 1,
          metadata_json: metadata([2, 3], { hasCoordinatorLicenseInGroup: true }),
        }),
        createPropositionEntity({
          id: 12,
          status: 'open',
          event_date: '2024-01-10',
          start_time: '10:00',
          end_time: '11:00',
          firing_line_id: 1,
          metadata_json: metadata([3], { hasCoordinatorLicenseInGroup: false }),
        }),
        createPropositionEntity({
          id: 13,
          status: 'converted',
          event_date: '2024-01-10',
          start_time: '09:45',
          end_time: '10:15',
          firing_line_id: 1,
          metadata_json: metadata([2], { hasCoordinatorLicenseInGroup: true }),
        }),
        createPropositionEntity({
          id: 14,
          status: 'cancelled',
          event_date: '2024-01-10',
          start_time: '09:45',
          end_time: '10:15',
          firing_line_id: 1,
          metadata_json: metadata([2], { hasCoordinatorLicenseInGroup: true }),
        }),
      ]);
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({
          id: 20,
          event_date: '2024-01-10',
          start_time: '09:30',
          end_time: '10:30',
          firing_line_id: 1,
          metadata_json: metadata([3], { hasCoordinatorLicenseInGroup: false }),
        }),
        createReservationEntity({
          id: 21,
          event_date: '2024-01-10',
          start_time: '09:30',
          end_time: '10:30',
          firing_line_id: 1,
          metadata_json: metadata([6], { hasCoordinatorLicenseInGroup: true }),
        }),
      ]);

      const result = await ctx.service.getPropositionDetails(
        11,
        createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] })
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().overlapDeclarationContext).toEqual([
        {
          type: 'reservation',
          id: 20,
          eventDate: '2024-01-10',
          startTime: '09:30',
          endTime: '10:30',
          firingLineId: 1,
          trackNos: [3],
          hasCoordinatorLicenseInGroup: false,
        },
        {
          type: 'proposition',
          id: 13,
          eventDate: '2024-01-10',
          startTime: '09:45',
          endTime: '10:15',
          firingLineId: 1,
          trackNos: [2],
          hasCoordinatorLicenseInGroup: true,
        },
        {
          type: 'proposition',
          id: 12,
          eventDate: '2024-01-10',
          startTime: '10:00',
          endTime: '11:00',
          firingLineId: 1,
          trackNos: [3],
          hasCoordinatorLicenseInGroup: false,
        },
      ]);
    });

    it('builds overlap declaration context for reservation details and excludes self', async () => {
      const ctx = createCtx();
      const reservation = createReservationDetailEntity({
        id: 100,
        event_date: '2024-01-10',
        start_time: '10:00',
        end_time: '11:00',
        firing_line_id: 1,
        metadata_json: metadata([1, 2]),
      });
      ctx.reservationsRepository.getReservationDetailById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.getPropositions.mockResolvedValueOnce([
        createPropositionEntity({
          id: 201,
          status: 'open',
          event_date: '2024-01-10',
          start_time: '10:00',
          end_time: '10:30',
          firing_line_id: 1,
          metadata_json: metadata([1], { hasCoordinatorLicenseInGroup: true }),
        }),
      ]);
      ctx.reservationsRepository.getReservations.mockResolvedValueOnce([
        createReservationEntity({
          id: 100,
          event_date: '2024-01-10',
          start_time: '10:00',
          end_time: '11:00',
          firing_line_id: 1,
          metadata_json: metadata([1, 2], { hasCoordinatorLicenseInGroup: true }),
        }),
        createReservationEntity({
          id: 101,
          event_date: '2024-01-10',
          start_time: '10:00',
          end_time: '10:30',
          firing_line_id: 1,
          metadata_json: metadata([2]),
        }),
      ]);

      const result = await ctx.service.getReservationDetails(
        100,
        createUser({ roles: [createRole(UserRole.Member)] })
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().overlapDeclarationContext).toEqual([
        {
          type: 'reservation',
          id: 101,
          eventDate: '2024-01-10',
          startTime: '10:00',
          endTime: '10:30',
          firingLineId: 1,
          trackNos: [2],
          hasCoordinatorLicenseInGroup: null,
        },
        {
          type: 'proposition',
          id: 201,
          eventDate: '2024-01-10',
          startTime: '10:00',
          endTime: '10:30',
          firingLineId: 1,
          trackNos: [1],
          hasCoordinatorLicenseInGroup: true,
        },
      ]);
    });
  });

  describe('cancelReservation', () => {
    const command: CancelReservationCommand = { reservationId: 22 };

    it('returns ReservationNotFoundError for missing reservation', async () => {
      const ctx = createCtx();
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(null);

      const result = await ctx.service.cancelReservation(
        command,
        createUser({ roles: [createRole(UserRole.Coordinator)] })
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationNotFoundError);
    });

    it('returns ReservationCancellationError when reopening proposition fails', async () => {
      const ctx = createCtx();
      const reservation = createReservationEntity({ proposition_id: 71 });
      ctx.reservationsRepository.getReservationById.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.deleteReservation.mockResolvedValueOnce(reservation);
      ctx.reservationsRepository.reopenProposition.mockResolvedValueOnce(null);

      const result = await ctx.service.cancelReservation(
        command,
        createUser({ roles: [createRole(UserRole.Coordinator)] })
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ReservationCancellationError);
    });
  });

  describe('createRecord', () => {
    const command: CreateRecordCommand = {
      eventDate: '2024-03-01',
      startTime: '09:00',
      endTime: '10:00',
      numParticipants: 12,
    };

    it('requires admin role', async () => {
      const ctx = createCtx();
      const result = await ctx.service.createRecord(
        ctx.rangeDetails.slug,
        command,
        createUser({ roles: [createRole(UserRole.Member)] })
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });

    it('creates record for club admin', async () => {
      const ctx = createCtx();
      const admin = createUser({ roles: [createRole(UserRole.ClubCommunityAdministrator)] });
      const record = createRecordEntity({ admin_id: admin.id, range_id: ctx.rangeDetails.id });
      ctx.reservationsRepository.createRecord.mockResolvedValueOnce(record);

      const result = await ctx.service.createRecord(ctx.rangeDetails.slug, command, admin);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe(record.id);
    });
  });

  describe('message templates', () => {
    it('lists templates for range admin', async () => {
      const ctx = createCtx();
      const admin = createUser({
        rangeRoles: {
          [String(ctx.rangeDetails.id)]: [createRole(UserRole.ShootingRangeAdministrator, 'range')],
        },
      });
      ctx.reservationsRepository.listAdminMessageTemplates.mockResolvedValueOnce([createTemplate()]);

      const result = await ctx.service.listMessageTemplates(ctx.rangeDetails.slug, false, admin);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(1);
      expect(result.getValue()[0].isActive).toBe(true);
    });

    it('rejects listing templates for non-admin', async () => {
      const ctx = createCtx();

      const result = await ctx.service.listMessageTemplates(
        ctx.rangeDetails.slug,
        false,
        createUser({ roles: [createRole(UserRole.Member)] })
      );

      expect(result.isSuccess).toBe(false);
      expect(result.getError()).toBeInstanceOf(ForbiddenError);
    });
  });
});
