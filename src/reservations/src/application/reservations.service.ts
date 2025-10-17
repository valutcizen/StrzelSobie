import { UserRole, IReservationsService, CalendarEventsDto, GetCalendarEventsQuery, Result, IRangesService, RangeNotFoundError, getRangeRole } from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly reservationsRepository: IReservationsRepository
  ) {}

  public async getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto>> {
    const { rangeSlug, startDate, endDate, user } = query;

    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();

    const rangeId = rangeDetails.id;

    try {
      const [propositions, reservations] = await Promise.all([
        this.reservationsRepository.getPropositions(rangeId, startDate, endDate),
        this.reservationsRepository.getReservations(rangeId, startDate, endDate),
      ]);

      const { isAdmin, isMember, isGuest } = getRangeRole(user, rangeId);

      const filteredPropositions = isAdmin
        ? propositions
        : propositions.filter((p: Proposition) => p.user_id.toString() === user.id.toString());

      const filteredReservations = reservations
        .filter((r: Reservation) => {
          if (isAdmin) return true;
          if (isGuest) return r.is_public;
          return true; // Members can see all for now, details are filtered next
        })
        .map((r: Reservation) => {
          const showDetails = isAdmin || r.coordinator_id.toString() === user.id.toString();
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
    } catch (error) {
      return Result.fail(error as Error);
    }
  }
}
