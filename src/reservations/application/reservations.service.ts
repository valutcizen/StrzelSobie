import { UserRole, IReservationsService, CalendarEventsDto, GetCalendarEventsQuery, Result, IRangesService, RangeNotFoundError, getRangeRole } from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly reservationsRepository: IReservationsRepository
  ) {}

  public async getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>> {
    const { rangeSlug, startDate, endDate, user } = query;

    const rangeId = await this.rangesService.getRangeIdBySlug(rangeSlug);
    if (!rangeId) {
      return Result.fail(new RangeNotFoundError("Range not found"));
    }

    const [propositionsResult, reservationsResult] : [Result<Proposition[], Error>, Result<Reservation[], Error>] = await Promise.all([
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

    const { isAdmin, isMember, isGuest } = getRangeRole(user, rangeId);

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
