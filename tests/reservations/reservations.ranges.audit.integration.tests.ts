import { describe, it, expect, vi, type Mocked } from 'vitest';
import {
  Result,
  CancelReservationCommand,
  CreatePropositionCommand,
  CreateRecordCommand,
  CreateReservationCommand,
  IReservationsService,
  IRangesService,
  IUserService,
  IAuditService,
  User,
  Role,
  RangeDetailsDto,
  GetCalendarEventsQuery,
  UserDto,
  UserProfile,
  UserRole,
} from '@strzel-sobie/common/models';
import { ReservationsService } from '@strzel-sobie/reservations/src/application/reservations.service';
import type { IReservationsRepository, Proposition, Reservation, RecordEntity } from '@strzel-sobie/reservations/src/domain/reservations.repository';

describe('ReservationsService ↔ Ranges & Audit module integration', () => {
  it('requests range details from the ranges module when building calendar events', async () => {
    const ctx = createReservationsContext();
    const rangeDetails: RangeDetailsDto = {
      id: 5,
      slug: 'central-range',
      displayName: 'Central Range',
      totalTracks: 12,
      operatingHours: { monday: { open: '08:00', close: '18:00' } },
    };
    const memberRole: Role = { id: 1, name: UserRole.Member, scope: 'global' };
    const query: GetCalendarEventsQuery = {
      rangeSlug: rangeDetails.slug,
      startDate: '2024-05-01',
      endDate: '2024-05-07',
      user: createUserProfile({
        id: 33,
        email: 'member@example.com',
        roles: [memberRole],
        rangeRoles: {},
      }),
    };

    const proposition: Proposition = {
      id: 2,
      user_id: query.user.id,
      range_id: rangeDetails.id,
      status: 'open',
      event_date: '2024-05-02',
      start_time: '10:00',
      end_time: '12:00',
      num_participants: 5,
      tracks_requested: 2,
      is_member: true,
    };

    const reservation: Reservation = {
      id: 3,
      range_id: rangeDetails.id,
      coordinator_id: query.user.id,
      proposition_id: null,
      event_date: '2024-05-03',
      start_time: '11:00',
      end_time: '13:00',
      num_participants: 4,
      tracks_requested: 2,
      is_public: true,
      is_joinable: true,
    };

    ctx.rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    ctx.reservationsRepository.getPropositions.mockResolvedValue([proposition]);
    ctx.reservationsRepository.getReservations.mockResolvedValue([reservation]);

    const result = await ctx.service.getCalendarEvents(query);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesService.getRangeDetails).toHaveBeenCalledWith(rangeDetails.slug);
    expect(ctx.reservationsRepository.getPropositions).toHaveBeenCalledWith(
      rangeDetails.id,
      query.startDate,
      query.endDate
    );
    expect(ctx.reservationsRepository.getReservations).toHaveBeenCalledWith(
      rangeDetails.id,
      query.startDate,
      query.endDate
    );
  });

  it('logs reservation creation through the audit module after confirming range permissions', async () => {
    const ctx = createReservationsContext();
    const rangeDetails: RangeDetailsDto = {
      id: 9,
      slug: 'north-range',
      displayName: 'North Range',
      totalTracks: 10,
      operatingHours: {
        monday: { open: '08:00', close: '20:00' },
        tuesday: { open: '09:00', close: '17:00' },
      },
    };
    const adminRole: Role = { id: 10, name: UserRole.ClubCommunityAdministrator, scope: 'global' };
    const user: UserDto = {
      id: 4,
      email: 'admin@example.com',
      isDeleted: 0,
      createdAt: '2024-04-01T12:00:00.000Z',
      roles: [adminRole],
      rangeRoles: {},
    };
    const payload = {
      eventDate: '2024-06-10',
      startTime: '13:00',
      endTime: '15:00',
      numParticipants: 6,
      tracksRequested: 3,
      isPublic: true,
      isJoinable: false,
    } as const;
    const options = { force: false } as const;
    const reservation: Reservation = {
      id: 55,
      range_id: rangeDetails.id,
      coordinator_id: user.id,
      proposition_id: null,
      event_date: payload.eventDate,
      start_time: payload.startTime,
      end_time: payload.endTime,
      num_participants: payload.numParticipants,
      tracks_requested: payload.tracksRequested,
      is_public: payload.isPublic,
      is_joinable: payload.isJoinable,
    };

    ctx.rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    ctx.reservationsRepository.getOverlappingReservationsDetails.mockResolvedValue([]);
    ctx.reservationsRepository.createReservation.mockResolvedValue(reservation);
    ctx.auditService.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await ctx.service.createReservation(rangeDetails.slug, payload, options, user);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesService.getRangeDetails).toHaveBeenCalledWith(rangeDetails.slug);
    expect(ctx.auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'RESERVATION_CREATE',
        target_id: reservation.id,
        details: expect.objectContaining({
          rangeId: rangeDetails.id,
          rangeSlug: rangeDetails.slug,
          userId: user.id,
          tracksRequested: payload.tracksRequested,
        }),
      })
    );
  });

  it('records manual range usage and forwards details to the audit module', async () => {
    const ctx = createReservationsContext();
    const rangeDetails: RangeDetailsDto = {
      id: 2,
      slug: 'west-field',
      displayName: 'West Field',
      totalTracks: 8,
      operatingHours: { friday: { open: '10:00', close: '20:00' } },
    };
    const adminRole: Role = { id: 12, name: UserRole.ClubCommunityAdministrator, scope: 'global' };
    const user: UserDto = {
      id: 20,
      email: 'coordinator@example.com',
      isDeleted: 0,
      createdAt: '2024-02-01T09:00:00.000Z',
      roles: [adminRole],
      rangeRoles: {},
    };
    const command = {
      eventDate: '2024-07-04',
      startTime: '09:00',
      endTime: '11:00',
      numParticipants: 12,
    } as const;
    const record: RecordEntity = {
      id: 88,
      admin_id: user.id,
      range_id: rangeDetails.id,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      num_participants: command.numParticipants,
      created_at: '2024-07-04T09:05:00.000Z',
    };

    ctx.rangesService.getRangeDetails.mockResolvedValue(Result.ok(rangeDetails));
    ctx.reservationsRepository.createRecord.mockResolvedValue(record);
    ctx.auditService.logAction.mockResolvedValue(Result.ok(undefined));

    const result = await ctx.service.createRecord(rangeDetails.slug, command, user);

    expect(result.isSuccess).toBe(true);
    expect(ctx.rangesService.getRangeDetails).toHaveBeenCalledWith(rangeDetails.slug);
    expect(ctx.auditService.logAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: 'RECORD_CREATE',
        target_id: record.id,
        details: expect.objectContaining({
          rangeId: rangeDetails.id,
          adminId: user.id,
          eventDate: record.event_date,
        }),
      })
    );
  });
});

function createReservationsContext(): {
  reservationsRepository: Mocked<IReservationsRepository>;
  rangesService: Mocked<IRangesService>;
  auditService: Mocked<IAuditService>;
  service: ReservationsService;
} {
  const reservationsRepository: Mocked<IReservationsRepository> = {
    getPropositions: vi.fn(),
    getReservations: vi.fn(),
    getOverlappingUsage: vi.fn(),
    getOverlappingReservationsDetails: vi.fn(),
    createProposition: vi.fn(),
    createReservation: vi.fn(),
    createReservationFromProposition: vi.fn(),
    createRecord: vi.fn(),
    markPropositionConverted: vi.fn(),
    getPropositionById: vi.fn(),
    cancelProposition: vi.fn(),
    getReservationById: vi.fn(),
    deleteReservation: vi.fn(),
    reopenProposition: vi.fn(),
  };

  const rangesService: Mocked<IRangesService> = {
    existsRangeById: vi.fn(),
    getRanges: vi.fn(),
    getRangeDetails: vi.fn(),
    updateRangeDetails: vi.fn(),
    getRangeIdBySlug: vi.fn(),
  };

  const auditService: Mocked<IAuditService> = {
    logAction: vi.fn(),
  };

  const service = new ReservationsService(rangesService, reservationsRepository, auditService);

  return {
    reservationsRepository,
    rangesService,
    auditService,
    service,
  };
}

function createUserProfile({
  id,
  email,
  roles,
  rangeRoles,
}: {
  id: number;
  email: string;
  roles: Role[];
  rangeRoles: Record<string, Role[]>;
}): UserProfile {
  return {
    id,
    email,
    phone_number: null,
    is_deleted: 0,
    created_at: '2024-01-01T00:00:00.000Z',
    roles,
    range_roles: rangeRoles,
  };
}
