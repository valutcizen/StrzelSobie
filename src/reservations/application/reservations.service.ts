import { UserRole } from '@strzel-sobie/common/models/auth.models';
import { IReservationsService } from '@strzel-sobie/common/interfaces/reservations.service.interface';
import { CalendarEventsDto, GetCalendarEventsQuery } from '@strzel-sobie/common/dto/calendar.dto';
import { Result } from '@strzel-sobie/common/utils/result';
import { IAdminRepository } from '../../admin/domain/admin.repository';
import { IReservationsRepository } from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly reservationsRepository: IReservationsRepository
  ) {}

  public async getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>> {
    const { rangeSlug, startDate, endDate, user } = query;

    const rangeIdResult = await this.adminRepository.getRangeIdBySlug(rangeSlug);
    if (rangeIdResult.isErr()) {
      return Result.err(rangeIdResult.error);
    }
    const rangeId = rangeIdResult.value;

    const [propositionsResult, reservationsResult] = await Promise.all([
      this.reservationsRepository.getPropositions(rangeId, startDate, endDate),
      this.reservationsRepository.getReservations(rangeId, startDate, endDate),
    ]);

    if (propositionsResult.isErr()) {
      return Result.err(propositionsResult.error);
    }
    if (reservationsResult.isErr()) {
      return Result.err(reservationsResult.error);
    }

    const propositions = propositionsResult.value;
    const reservations = reservationsResult.value;

    const isClubAdmin = user.roles.includes(UserRole.ClubCommunityAdministrator);
    const rangeAdminRoles = user.rangeRoles[rangeSlug] || [];
    const isRangeAdmin = rangeAdminRoles.includes(UserRole.ShootingRangeAdministrator);
    const isAdmin = isClubAdmin || isRangeAdmin;
    const isMember = user.roles.includes(UserRole.Member);
    const isGuest = !isMember && !isAdmin;

    const filteredPropositions = isAdmin
      ? propositions
      : propositions.filter((p) => p.user_id.toString() === user.id);

    const filteredReservations = reservations
      .filter((r) => {
        if (isAdmin) return true;
        if (isGuest) return r.is_public;
        return true; // Members can see all for now, details are filtered next
      })
      .map((r) => {
        const showDetails = isAdmin || r.coordinator_id.toString() === user.id;
        return {
          id: r.id,
          eventDate: r.event_date,
          startTime: r.start_time,
          endTime: r.end_time,
          tracksRequested: r.tracks,
          isPublic: r.is_public,
          isJoinable: r.is_joinable,
          details: showDetails
            ? {
                coordinatorId: r.coordinator_id,
                numParticipants: r.participants_count,
              }
            : null,
        };
      });

    const calendarEvents: CalendarEventsDto = {
      propositions: filteredPropositions.map((p) => ({
        id: p.id,
        userId: p.user_id,
        isMember: true, // Placeholder
        eventDate: p.event_date,
        startTime: p.start_time,
        endTime: p.end_time,
        tracksRequested: p.tracks,
      })),
      reservations: filteredReservations,
    };

    return Result.ok(calendarEvents);
  }
}
