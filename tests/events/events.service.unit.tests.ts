import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventsService } from '@strzel-sobie/events/src/application/events.service';
import type { IEventsRepository } from '@strzel-sobie/events/src/domain/events.repository';
import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  EventStatus,
  EventSignupNotAllowedError,
  EventSignupStatus,
  ForbiddenError,
  IAuditService,
  IRangesService,
  RangeDetailsDto,
  Result,
  Role,
  UserDto,
  UserRole,
} from '@strzel-sobie/common/models';
import type { EventRecord } from '@strzel-sobie/events/src/domain/events.repository';

type MockedRepository = {
  [K in keyof IEventsRepository]: ReturnType<typeof vi.fn<IEventsRepository[K]>>;
};

type MockedRangesService = {
  [K in keyof IRangesService]: ReturnType<typeof vi.fn<IRangesService[K]>>;
};

type MockedAuditService = {
  [K in keyof IAuditService]: ReturnType<typeof vi.fn<IAuditService[K]>>;
};

const makeRole = (name: string): Role => ({
  id: 1,
  name,
  scope: 'global',
});

const makeUser = (overrides: Partial<UserDto> = {}): UserDto => ({
  id: 10,
  email: 'user@example.com',
  isDeleted: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  roles: [],
  rangeRoles: {},
  ...overrides,
});

const mockUsers = {
  admin: makeUser({
    id: 1,
    email: 'admin@example.com',
    roles: [
      makeRole(UserRole.ClubCommunityAdministrator),
      makeRole(UserRole.Member),
      makeRole(UserRole.Guest),
    ],
  }),
  coordinator: makeUser({
    id: 2,
    email: 'coordinator@example.com',
    roles: [makeRole(UserRole.Coordinator), makeRole(UserRole.Member), makeRole(UserRole.Guest)],
  }),
  member: makeUser({
    id: 3,
    email: 'member@example.com',
    roles: [makeRole(UserRole.Member), makeRole(UserRole.Guest)],
  }),
  guest: makeUser({
    id: 4,
    email: 'guest@example.com',
    roles: [makeRole(UserRole.Guest)],
  }),
};

const makeRangeAdmin = (rangeId: number): UserDto => ({
  ...mockUsers.coordinator,
  rangeRoles: {
    [String(rangeId)]: [{ id: 1, name: UserRole.ShootingRangeAdministrator, scope: 'range' }],
  },
});

const makeRangeDetails = (overrides: Partial<RangeDetailsDto> = {}): RangeDetailsDto => ({
  id: 5,
  slug: 'alpha-range',
  displayName: 'Alpha Range',
  type: 'club',
  allowsReservations: true,
  isDeleted: false,
  publicDescription: null,
  memberDescription: null,
  latitude: 0,
  longitude: 0,
  totalTracks: 10,
  operatingHours: {},
  extras: {},
  parkingLocation: null,
  ...overrides,
});

const makeEvent = (overrides: Partial<EventRecord> = {}): EventRecord => ({
  id: 1,
  slug: 'steel-challenge',
  range_id: 5,
  created_by: 10,
  name: 'Steel Challenge',
  public_description: 'Public info',
  member_description: 'Members info',
  event_date: '2025-01-05',
  start_time: '10:00',
  end_time: '12:00',
  registration_type: EventRegistrationType.RegistrationRequired,
  audience: EventAudience.Public,
  capacity_type: EventCapacityType.Unlimited,
  capacity_limit: null,
  guest_policy: null,
  waitlist_limit: null,
  registration_deadline: null,
  status: EventStatus.Active,
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: null,
  ...overrides,
});

const createTestContext = () => {
  const eventsRepository: MockedRepository = {
    getRangeEvents: vi.fn<IEventsRepository['getRangeEvents']>(),
    getEventById: vi.fn<IEventsRepository['getEventById']>(),
    getEventBySlug: vi.fn<IEventsRepository['getEventBySlug']>(),
    getEventParticipants: vi.fn<IEventsRepository['getEventParticipants']>(),
    getEventWaitlist: vi.fn<IEventsRepository['getEventWaitlist']>(),
    createEvent: vi.fn<IEventsRepository['createEvent']>(),
    updateEvent: vi.fn<IEventsRepository['updateEvent']>(),
    cancelEvent: vi.fn<IEventsRepository['cancelEvent']>(),
    getSignupByUser: vi.fn<IEventsRepository['getSignupByUser']>(),
    getSignupSummary: vi.fn<IEventsRepository['getSignupSummary']>(),
    createSignup: vi.fn<IEventsRepository['createSignup']>(),
    updateSignup: vi.fn<IEventsRepository['updateSignup']>(),
    deleteSignup: vi.fn<IEventsRepository['deleteSignup']>(),
    promoteWaitlistedSignup: vi.fn<IEventsRepository['promoteWaitlistedSignup']>(),
  };

  const rangesService: MockedRangesService = {
    existsRangeById: vi.fn<IRangesService['existsRangeById']>(),
    getRanges: vi.fn<IRangesService['getRanges']>(),
    getRangeDetails: vi.fn<IRangesService['getRangeDetails']>(),
    updateRangeDetails: vi.fn<IRangesService['updateRangeDetails']>(),
    getRangeIdBySlug: vi.fn<IRangesService['getRangeIdBySlug']>(),
    deleteRange: vi.fn<IRangesService['deleteRange']>(),
  };

  const auditService: MockedAuditService = {
    logAction: vi.fn<IAuditService['logAction']>(),
  };

  auditService.logAction.mockResolvedValue(Result.ok(undefined));

  const service = new EventsService(
    rangesService as unknown as IRangesService,
    eventsRepository as unknown as IEventsRepository,
    auditService as unknown as IAuditService
  );

  return { service, eventsRepository, rangesService, auditService };
};

describe('EventsService contract', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rejects event creation when user lacks permission', async () => {
    const { service, rangesService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));

    const result = await service.createEvent(
      rangeDetails.slug,
      {
        name: 'Member Meetup',
        publicDescription: 'Public',
        memberDescription: 'Members',
        eventDate: '2025-01-05',
        startTime: '10:00',
        endTime: '12:00',
        registrationType: EventRegistrationType.RegistrationRequired,
        audience: EventAudience.MembersOnly,
        capacityType: EventCapacityType.Unlimited,
      },
      mockUsers.member
    );

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(ForbiddenError);
  });

  it('creates events and logs audit entries for range admins', async () => {
    const { service, rangesService, eventsRepository, auditService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    const created = makeEvent({
      id: 99,
      range_id: rangeDetails.id,
      created_by: mockUsers.coordinator.id,
    });
    eventsRepository.createEvent.mockResolvedValue(created);

    const admin = makeRangeAdmin(rangeDetails.id);

    const result = await service.createEvent(
      rangeDetails.slug,
      {
        name: 'Admin Event',
        publicDescription: 'Public',
        memberDescription: null,
        eventDate: '2025-01-05',
        startTime: '10:00',
        endTime: '12:00',
        registrationType: EventRegistrationType.RegistrationRequired,
        audience: EventAudience.Public,
        capacityType: EventCapacityType.Unlimited,
      },
      admin
    );

    expect(result.isSuccess).toBe(true);
    expect(eventsRepository.createEvent).toHaveBeenCalled();
    expect(auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({ action_type: 'EVENT_CREATE', target_id: created.id })
    );
  });

  it('filters members-only events for guests in range listing', async () => {
    const { service, rangesService, eventsRepository } = createTestContext();
    const rangeDetails = makeRangeDetails();
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    eventsRepository.getRangeEvents.mockResolvedValue([
      makeEvent({ id: 1, audience: EventAudience.Public }),
      makeEvent({ id: 2, audience: EventAudience.MembersOnly }),
    ]);

    const result = await service.getRangeEvents(rangeDetails.slug, mockUsers.guest);

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().data).toHaveLength(1);
    expect(result.getValue().data[0].id).toBe(1);
  });

  it('returns participants when requester is event creator', async () => {
    const { service, eventsRepository, rangesService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    const event = makeEvent({
      id: 7,
      created_by: mockUsers.member.id,
      audience: EventAudience.Public,
    });
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    eventsRepository.getEventBySlug.mockResolvedValue(event);
    eventsRepository.getEventParticipants.mockResolvedValue([
      {
        user_id: 99,
        user_email: 'member@example.com',
        user_display_name: 'Member',
        guests: 1,
        signup_time: '2025-01-01T10:00:00Z',
      },
    ]);
    eventsRepository.getEventWaitlist.mockResolvedValue([]);

    const result = await service.getEventDetails(
      rangeDetails.slug,
      event.slug,
      mockUsers.member
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().participants).toHaveLength(1);
    expect(result.getValue().participants?.[0].userId).toBe(99);
  });

  it('waitlists signups when capacity is full', async () => {
    const { service, eventsRepository, rangesService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    const event = makeEvent({
      id: 20,
      capacity_type: EventCapacityType.Limited,
      capacity_limit: 2,
      waitlist_limit: 5,
    });
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    eventsRepository.getEventBySlug.mockResolvedValue(event);
    eventsRepository.getSignupByUser.mockResolvedValue(null);
    eventsRepository.getSignupSummary.mockResolvedValue({ confirmedSlots: 2, waitlistedSlots: 0 });
    eventsRepository.createSignup.mockResolvedValue({
      id: 55,
      event_id: event.id,
      user_id: mockUsers.member.id,
      guests: 0,
      status: EventSignupStatus.Waitlisted,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: null,
    });

    const result = await service.createSignup(
      rangeDetails.slug,
      event.slug,
      { guests: 0 },
      mockUsers.member
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().status).toBe(EventSignupStatus.Waitlisted);
    expect(eventsRepository.createSignup).toHaveBeenCalledWith(
      expect.objectContaining({ status: EventSignupStatus.Waitlisted })
    );
  });

  it('rejects updates that add guests when guests are not allowed', async () => {
    const { service, eventsRepository, rangesService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    const event = makeEvent({
      id: 21,
      audience: EventAudience.Public,
      guest_policy: EventGuestPolicy.NoGuests,
    });
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    eventsRepository.getEventBySlug.mockResolvedValue(event);

    const result = await service.updateSignup(
      rangeDetails.slug,
      event.slug,
      { guests: 2 },
      mockUsers.member
    );

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBeInstanceOf(EventSignupNotAllowedError);
  });

  it('promotes waitlist when confirmed signup is canceled', async () => {
    const { service, eventsRepository, rangesService } = createTestContext();
    const rangeDetails = makeRangeDetails();
    const event = makeEvent({
      id: 22,
      capacity_type: EventCapacityType.Limited,
      capacity_limit: 2,
    });
    rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    eventsRepository.getEventBySlug.mockResolvedValue(event);
    eventsRepository.getSignupByUser.mockResolvedValue({
      id: 88,
      event_id: event.id,
      user_id: mockUsers.member.id,
      guests: 1,
      status: EventSignupStatus.Confirmed,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: null,
    });
    eventsRepository.deleteSignup.mockResolvedValue({
      id: 88,
      event_id: event.id,
      user_id: mockUsers.member.id,
      guests: 1,
      status: EventSignupStatus.Confirmed,
      created_at: '2025-01-01T10:00:00Z',
      updated_at: null,
    });

    const result = await service.cancelSignup(
      rangeDetails.slug,
      event.slug,
      mockUsers.member
    );

    expect(result.isSuccess).toBe(true);
    expect(eventsRepository.promoteWaitlistedSignup).toHaveBeenCalledWith(event.id, 2);
  });
});
