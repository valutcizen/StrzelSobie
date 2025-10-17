import {
  IReservationsService,
  CalendarEventsDto,
  GetCalendarEventsQuery,
  Result,
  IRangesService,
  getRangeRole,
} from '@strzel-sobie/common';
import { IReservationsRepository, Proposition, Reservation } from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly reservationsRepository: IReservationsRepository
  ) {}

  public async getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>> {
    const { rangeSlug, startDate, endDate, user } = query;

    const rangeIdResult = await this.rangesService.getRangeIdBySlug(rangeSlug);
    if (!rangeIdResult.isSuccess) {
      return Result.fail(rangeIdResult.getError());
    }
    const rangeId = rangeIdResult.getValue();

    const [propositionsResult, reservationsResult]: [Result<Proposition[]>, Result<Reservation[]>] =
      await Promise.all([
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
          tracksRequested: r.tracks_requested,
          isPublic: r.is_public,
          isJoinable: r.is_joinable,
          details: showDetails
            ? {
                coordinatorId: r.coordinator_id,
                numParticipants: r.num_participants,
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
        tracksRequested: p.tracks_requested,
      })),
      reservations: filteredReservations,
    };

    return Result.ok(calendarEvents);
  }
}
