import { UserRole, IReservationsService, CalendarEventsDto, GetCalendarEventsQuery, Result, IAdminService } from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly adminService: IAdminService,
    private readonly reservationsRepository: IReservationsRepository
  ) {}

  public async getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>> {
    const { rangeSlug, startDate, endDate, user } = query;

    const rangeDetailsResult = await this.adminService.getRangeDetails(rangeSlug);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();
    if (!rangeDetails) {
      return Result.fail(new Error('Range not found'));
    }
    const rangeId = rangeDetails.id.toString();

    const [propositionsResult, reservationsResult] = await Promise.all([
      this.reservationsRepository.getPropositions(rangeId, startDate, endDate),
      this.reservationsRepository.getReservations(rangeId, startDate, endDate),
    ]);

    if (!propositionsResult.isSuccess) {
      return Result.fail(propositionsResult.getError());
    }
    if (!reservationsResult.isSuccess) {
      return Result.fail(reservationsResult.getError());
    }

    const propositions = propositionsResult.getValue();
    const reservations = reservationsResult.getValue();

    const isClubAdmin = user.roles.includes(UserRole.ClubCommunityAdministrator);
    const rangeAdminRoles = user.rangeRoles[rangeSlug] || [];
    const isRangeAdmin = rangeAdminRoles.includes(UserRole.ShootingRangeAdministrator);
    const isAdmin = isClubAdmin || isRangeAdmin;
    const isMember = user.roles.includes(UserRole.Member);
    const isGuest = !isMember && !isAdmin;

    const filteredPropositions = isAdmin
      ? propositions
      : propositions.filter((p: Proposition) => p.user_id.toString() === user.id);

    const filteredReservations = reservations
      .filter((r: Reservation) => {
        if (isAdmin) return true;
        if (isGuest) return r.is_public;
        return true; // Members can see all for now, details are filtered next
      })
      .map((r: Reservation) => {
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
      propositions: filteredPropositions.map((p: Proposition) => ({
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
