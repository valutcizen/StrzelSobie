import {
  UserRole,
  IReservationsService,
  CalendarEventsDto,
  GetCalendarEventsQuery,
  Result,
  IRangesService,
  RangeNotFoundError,
  getRangeRole,
  CreatePropositionCommand,
  CreatedPropositionDto,
  UserDto,
  IAuditService,
  PropositionConflictError,
  InvalidPropositionTimeError,
  UnauthorizedPropositionError,
  ForbiddenError,
} from '@strzel-sobie/common';
import {
  CreatePropositionRecord,
  IReservationsRepository,
  Proposition,
  Reservation,
} from '../domain/reservations.repository';

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly reservationsRepository: IReservationsRepository,
    private readonly auditService: IAuditService
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

  public async createProposition(
    rangeSlug: string,
    command: CreatePropositionCommand,
    user: UserDto
  ): Promise<Result<CreatedPropositionDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot create propositions'));
    }

    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();
    const rangeId = rangeDetails.id;

    if (!this.canUserCreateProposition(user, rangeId)) {
      return Result.fail(new UnauthorizedPropositionError());
    }

    const validationError = this.validatePropositionCommand(command, rangeDetails.totalTracks);
    if (validationError) {
      return Result.fail(validationError);
    }

    try {
      const usage = await this.reservationsRepository.getOverlappingUsage(
        rangeId,
        command.eventDate,
        command.startTime,
        command.endTime
      );

      const totalTracksUsed = usage.propositions_tracks + usage.reservations_tracks;
      if (totalTracksUsed + command.tracksRequested > rangeDetails.totalTracks) {
        return Result.fail(new PropositionConflictError());
      }

      const record: CreatePropositionRecord = {
        user_id: user.id,
        range_id: rangeId,
        event_date: command.eventDate,
        start_time: command.startTime,
        end_time: command.endTime,
        num_participants: command.numParticipants,
        tracks_requested: command.tracksRequested,
      };

      const proposition = await this.reservationsRepository.createProposition(record);

      const auditResult = await this.auditService.logAction({
        action_type: 'PROPOSITION_CREATE',
        target_id: proposition.id,
        details: {
          userId: user.id,
          rangeId,
          eventDate: command.eventDate,
          startTime: command.startTime,
          endTime: command.endTime,
          numParticipants: command.numParticipants,
          tracksRequested: command.tracksRequested,
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      const dto: CreatedPropositionDto = {
        id: proposition.id,
        user_id: proposition.user_id,
        range_id: proposition.range_id,
        status: proposition.status,
      };

      return Result.ok(dto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private canUserCreateProposition(user: UserDto, rangeId: number): boolean {
    const globalRoleNames = new Set(user.roles.map((role) => role.name));
    if (
      globalRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      globalRoleNames.has(UserRole.Coordinator) ||
      globalRoleNames.has(UserRole.Member) ||
      globalRoleNames.has(UserRole.Guest)
    ) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    const rangeRoleNames = new Set(rangeRoles.map((role) => role.name));

    if (
      rangeRoleNames.has(UserRole.ShootingRangeAdministrator) ||
      rangeRoleNames.has(UserRole.Coordinator) ||
      rangeRoleNames.has(UserRole.Member)
    ) {
      return true;
    }

    return false;
  }

  private validatePropositionCommand(
    command: CreatePropositionCommand,
    totalTracks: number
  ): Error | null {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(command.eventDate) || Number.isNaN(new Date(command.eventDate).getTime())) {
      return new InvalidPropositionTimeError('Event date must be a valid YYYY-MM-DD value');
    }

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(command.startTime) || !timePattern.test(command.endTime)) {
      return new InvalidPropositionTimeError('Start and end times must be in HH:MM format');
    }

    const [startHours, startMinutes] = command.startTime.split(':').map(Number);
    const [endHours, endMinutes] = command.endTime.split(':').map(Number);

    if (
      Number.isNaN(startHours) ||
      Number.isNaN(startMinutes) ||
      Number.isNaN(endHours) ||
      Number.isNaN(endMinutes)
    ) {
      return new InvalidPropositionTimeError('Start and end times must contain numeric values');
    }

    if (
      startHours < 0 ||
      startHours > 23 ||
      endHours < 0 ||
      endHours > 23 ||
      startMinutes < 0 ||
      startMinutes > 59 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      return new InvalidPropositionTimeError('Start and end times must represent valid clock values');
    }

    if (startMinutes % 5 !== 0 || endMinutes % 5 !== 0) {
      return new InvalidPropositionTimeError('Times must be aligned to 5-minute increments');
    }

    const startsBeforeEnds =
      startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
    if (!startsBeforeEnds) {
      return new InvalidPropositionTimeError('End time must be later than start time');
    }

    if (!Number.isInteger(command.numParticipants) || command.numParticipants < 1 || command.numParticipants > 50) {
      return new InvalidPropositionTimeError('Number of participants must be between 1 and 50');
    }

    if (
      !Number.isInteger(command.tracksRequested) ||
      command.tracksRequested < 1 ||
      command.tracksRequested > totalTracks
    ) {
      return new InvalidPropositionTimeError('Tracks requested must be between 1 and the range capacity');
    }

    return null;
  }
}
