import {
  IAuditService,
  IReservationsService,
  IRangesService,
  UserRole,
  getRangeRole,
} from '@strzel-sobie/common/models';
import {
  CalendarEventsDto,
  CancelPropositionCommand,
  CancelReservationCommand,
  CreatePropositionCommand,
  CreateRecordCommand,
  CreateRecordResult,
  CreateReservationCommand,
  CreateReservationFromPropositionCommand,
  CreateReservationOptions,
  CreateReservationPayload,
  CreatedPropositionDto,
  CreatedRecordDto,
  CreatedReservationDto,
  GetCalendarEventsQuery,
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidRecordTimeError,
  InvalidReservationTimeError,
  PersonSummaryDto,
  PropositionAlreadyClosedError,
  PropositionConflictError,
  PropositionDetailDto,
  PropositionNotFoundError,
  RangeDetailsDto,
  RecordCreationError,
  ReservationCancellationError,
  ReservationCreationError,
  ReservationConflictError,
  ReservationConflictItem,
  ReservationDetailDto,
  ReservationNotFoundError,
  Result,
  RangeClosedError,
  UnauthorizedPropositionError,
  OperatingHours,
  UserDto,
} from '@strzel-sobie/common';
import {
  CreatePropositionRecord,
  CreateRecordData,
  CreateReservationRecord,
  IReservationsRepository,
  Proposition,
  PropositionDetail,
  RecordEntity,
  Reservation,
  ReservationDetail,
  ReservationConflict,
} from '../domain/reservations.repository';

const normalizeReservationFlag = (value: unknown): boolean => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return value === 1;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === '1' || normalized === 'true';
  }
  return false;
};

type RoleLike = { name?: string | null } | string | null | undefined;
type RangeRolesRecord = Record<string, RoleLike[] | undefined>;
type UserRoleContext = {
  id: number | string;
  roles?: RoleLike[];
  rangeRoles?: RangeRolesRecord;
  range_roles?: RangeRolesRecord;
};

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
      const roleNames = (user.roles ?? [])
        .map((role) => (typeof role === 'string' ? role : role?.name ?? ''))
        .filter((roleName) => roleName.length > 0);
      const isCoordinator = roleNames.includes(UserRole.Coordinator);

      let records: RecordEntity[] = [];
      if (isAdmin) {
        records = await this.reservationsRepository.getRecords(rangeId, startDate, endDate);
      }

      const uniquePropositionIds = Array.from(
        new Set(
          reservations
            .map((reservation: Reservation) => reservation.proposition_id)
            .filter((id): id is number => id !== null)
        )
      );

      const linkedPropositionDetails = new Map<number, PropositionDetailDto | null>();

      if (uniquePropositionIds.length > 0) {
        try {
          await Promise.all(
            uniquePropositionIds.map(async (propositionId) => {
              const detail = await this.getSanitizedPropositionDetail(propositionId, user);
              linkedPropositionDetails.set(propositionId, detail);
            })
          );
        } catch (error) {
          return Result.fail(error as Error);
        }
      }

      const shouldFilterPropositions = isGuest && !isCoordinator;
      const filteredPropositions = shouldFilterPropositions
        ? propositions.filter((p: Proposition) => p.user_id.toString() === user.id.toString())
        : propositions;

      const filteredReservations = reservations.map((r: Reservation) => {
        const isPublic = normalizeReservationFlag(r.is_public);
        const isJoinable = normalizeReservationFlag(r.is_joinable);
        const canViewPrivateDetails = isAdmin || isMember || isCoordinator;
        const canViewDetails = canViewPrivateDetails || isPublic;

        const tracksRequested = canViewDetails ? r.tracks_requested : null;
        const isJoinableForUser = canViewDetails ? isJoinable : null;
        const details = canViewDetails
          ? {
              coordinatorId: r.coordinator_id,
              numParticipants: r.num_participants,
            }
          : null;

        const propositionDetail =
          r.proposition_id !== null ? linkedPropositionDetails.get(r.proposition_id) ?? null : null;

        return {
          id: r.id,
          propositionId: r.proposition_id,
          eventDate: r.event_date,
          startTime: r.start_time,
          endTime: r.end_time,
          tracksRequested,
          isPublic,
          isJoinable: isJoinableForUser,
          details,
          proposition: propositionDetail,
        };
      });

      const calendarEvents: CalendarEventsDto = {
        propositions: filteredPropositions.map((p: Proposition) => ({
          id: p.id,
          userId: p.user_id,
          isMember: p.is_member,
          eventDate: p.event_date,
          startTime: p.start_time,
          endTime: p.end_time,
          tracksRequested: p.tracks_requested,
        })),
        reservations: filteredReservations,
        records: records.map((record) => ({
          id: record.id,
          adminId: record.admin_id,
          eventDate: record.event_date,
          startTime: record.start_time,
          endTime: record.end_time,
          numParticipants: record.num_participants,
          createdAt: record.created_at,
        })),
      };

      return Result.ok(calendarEvents);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getPropositionDetails(
    propositionId: number,
    user: UserDto
  ): Promise<Result<PropositionDetailDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot view propositions'));
    }

    try {
      const proposition = await this.reservationsRepository.getPropositionDetailById(propositionId);

      if (!proposition) {
        return Result.fail(new PropositionNotFoundError());
      }

      if (!this.canUserViewProposition(user, proposition)) {
        return Result.fail(new ForbiddenError('User is not allowed to view this proposition'));
      }

      return Result.ok(this.buildPropositionDetailDto(proposition));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getReservationDetails(
    reservationId: number,
    user: UserDto
  ): Promise<Result<ReservationDetailDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot view reservations'));
    }

    try {
      const reservation = await this.reservationsRepository.getReservationDetailById(reservationId);

      if (!reservation) {
        return Result.fail(new ReservationNotFoundError());
      }

      if (!this.canUserViewReservation(user, reservation)) {
        return Result.fail(new ForbiddenError('User is not allowed to view this reservation'));
      }

      const propositionDetailDto = await this.resolveLinkedPropositionDetail(
        reservation,
        user
      );

      const coordinator = this.buildPersonSummary(
        reservation.coordinator_id,
        reservation.coordinator_email,
        reservation.coordinator_phone_number
      );

      const dto: ReservationDetailDto = {
        id: reservation.id,
        rangeId: reservation.range_id,
        coordinatorId: reservation.coordinator_id,
        propositionId: reservation.proposition_id,
        proposition: propositionDetailDto,
        eventDate: reservation.event_date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        numParticipants: reservation.num_participants,
        tracksRequested: reservation.tracks_requested,
        isPublic: Boolean(reservation.is_public),
        isJoinable: Boolean(reservation.is_joinable),
        createdAt: reservation.created_at ?? null,
        coordinator,
      };

      return Result.ok(dto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async createReservation(
    rangeSlug: string,
    command: CreateReservationPayload,
    options: CreateReservationOptions,
    user: UserDto
  ): Promise<Result<CreatedReservationDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot create reservations'));
    }

    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();
    const rangeId = rangeDetails.id;

    if (!this.canUserCreateReservation(user, rangeId)) {
      return Result.fail(new ForbiddenError('User is not allowed to create reservations for this range'));
    }

    const force = Boolean(options.force);

    if (this.isReservationConversion(command)) {
      return this.createReservationFromPropositionCommand(
        rangeDetails,
        command,
        force,
        user
      );
    }

    return this.createReservationDirectly(rangeDetails, command, force, user);
  }

  public async createRecord(
    rangeSlug: string,
    command: CreateRecordCommand,
    user: UserDto
  ): Promise<CreateRecordResult> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot create records'));
    }

    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }

    const rangeDetails = rangeDetailsResult.getValue();
    const rangeId = rangeDetails.id;

    if (!this.canUserCreateRecord(user, rangeId)) {
      return Result.fail(new ForbiddenError('User is not allowed to create records for this range'));
    }

    const normalizedParticipants = Math.trunc(command.numParticipants);
    const validationError = this.validateRecordCommand(command, normalizedParticipants);
    if (validationError) {
      return Result.fail(validationError);
    }

    const recordData: CreateRecordData = {
      range_id: rangeId,
      admin_id: user.id,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      num_participants: normalizedParticipants,
    };

    let record: RecordEntity;
    try {
      record = await this.reservationsRepository.createRecord(recordData);
    } catch (error) {
      console.error('Failed to create manual record', error);
      return Result.fail(new RecordCreationError());
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'RECORD_CREATE',
      target_id: record.id,
      details: {
        adminId: user.id,
        rangeId,
        rangeSlug: rangeDetails.slug,
        eventDate: record.event_date,
        startTime: record.start_time,
        endTime: record.end_time,
        numParticipants: record.num_participants,
      },
    });

    if (!auditResult.isSuccess) {
      const auditError = auditResult.getError();
      console.error('Failed to log record creation', auditError);
      return Result.fail(new RecordCreationError());
    }

    const dto: CreatedRecordDto = {
      id: record.id,
      rangeId: record.range_id,
      adminId: record.admin_id,
      eventDate: record.event_date,
      startTime: record.start_time,
      endTime: record.end_time,
      numParticipants: record.num_participants,
      createdAt: record.created_at,
    };

    return Result.ok(dto);
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

    const operatingHoursError = this.ensureWithinOperatingHours(
      command.eventDate,
      command.startTime,
      command.endTime,
      rangeDetails.operatingHours
    );
    if (operatingHoursError) {
      return Result.fail(operatingHoursError);
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

  public async cancelProposition(
    command: CancelPropositionCommand,
    user: UserDto
  ): Promise<Result<void>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot cancel propositions'));
    }

    try {
      const proposition = await this.reservationsRepository.getPropositionById(
        command.propositionId
      );

      if (!proposition) {
        return Result.fail(new PropositionNotFoundError());
      }

      if (proposition.user_id !== user.id) {
        return Result.fail(
          new UnauthorizedPropositionError('User is not allowed to cancel this proposition')
        );
      }

      if (proposition.status !== 'open') {
        return Result.fail(new PropositionAlreadyClosedError());
      }

      const cancelledProposition = await this.reservationsRepository.cancelProposition(
        command.propositionId
      );

      if (!cancelledProposition) {
        return Result.fail(new PropositionAlreadyClosedError());
      }

      const auditResult = await this.auditService.logAction({
        action_type: 'PROPOSITION_CANCEL',
        target_id: cancelledProposition.id,
        details: {
          userId: user.id,
          rangeId: cancelledProposition.range_id,
          previousStatus: proposition.status,
          newStatus: cancelledProposition.status,
          eventDate: cancelledProposition.event_date,
          startTime: cancelledProposition.start_time,
          endTime: cancelledProposition.end_time,
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private async createReservationDirectly(
    rangeDetails: RangeDetailsDto,
    command: CreateReservationCommand,
    force: boolean,
    user: UserDto
  ): Promise<Result<CreatedReservationDto>> {
    const validationError = this.validateReservationCommand(command, rangeDetails.totalTracks);
    if (validationError) {
      return Result.fail(validationError);
    }

    const operatingHoursError = this.ensureWithinOperatingHours(
      command.eventDate,
      command.startTime,
      command.endTime,
      rangeDetails.operatingHours
    );
    if (operatingHoursError) {
      return Result.fail(operatingHoursError);
    }

    let conflicts: ReservationConflict[];
    try {
      conflicts = await this.reservationsRepository.getOverlappingReservationsDetails(
        rangeDetails.id,
        command.eventDate,
        command.startTime,
        command.endTime
      );
    } catch (error) {
      return Result.fail(error as Error);
    }

    const blockingConflicts = conflicts.filter((conflict) => conflict.type === 'reservation');

    if (blockingConflicts.length > 0 && !force) {
      return Result.fail(
        new ReservationConflictError({
          conflicts: this.mapReservationConflicts(conflicts),
          requiresForce: true,
        })
      );
    }

    const record: CreateReservationRecord = {
      range_id: rangeDetails.id,
      coordinator_id: user.id,
      proposition_id: null,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      num_participants: command.numParticipants,
      tracks_requested: command.tracksRequested,
      is_public: command.isPublic,
      is_joinable: command.isJoinable,
    };

    try {
      const reservation = await this.reservationsRepository.createReservation(record);

      const auditResult = await this.auditService.logAction({
        action_type: 'RESERVATION_CREATE',
        target_id: reservation.id,
        details: {
          userId: user.id,
          rangeId: rangeDetails.id,
          rangeSlug: rangeDetails.slug,
          eventDate: reservation.event_date,
          startTime: reservation.start_time,
          endTime: reservation.end_time,
          numParticipants: reservation.num_participants,
          tracksRequested: reservation.tracks_requested,
          forceApplied: force && blockingConflicts.length > 0,
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      const dto: CreatedReservationDto = {
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      };

      return Result.ok(dto);
    } catch (error) {
      console.error('Failed to create reservation directly', error);
      return Result.fail(new ReservationCreationError());
    }
  }

  private async createReservationFromPropositionCommand(
    rangeDetails: RangeDetailsDto,
    command: CreateReservationFromPropositionCommand,
    force: boolean,
    user: UserDto
  ): Promise<Result<CreatedReservationDto>> {
    let proposition: Proposition | null;
    try {
      proposition = await this.reservationsRepository.getPropositionById(command.propositionId);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!proposition) {
      return Result.fail(new PropositionNotFoundError());
    }

    if (proposition.range_id !== rangeDetails.id) {
      return Result.fail(new ForbiddenError('Proposition does not belong to this range'));
    }

    if (proposition.status !== 'open') {
      return Result.fail(new PropositionAlreadyClosedError());
    }

    const eventDate = command.eventDate ?? proposition.event_date;
    const startTime = command.startTime ?? proposition.start_time;
    const endTime = command.endTime ?? proposition.end_time;
    const tracksRequested = command.tracksRequested ?? proposition.tracks_requested;
    const numParticipants = command.numParticipants ?? proposition.num_participants;
    const isPublic = typeof command.isPublic === 'boolean' ? command.isPublic : false;
    const isJoinable = typeof command.isJoinable === 'boolean' ? command.isJoinable : false;

    const validationError = this.validateReservationCommand(
      {
        eventDate,
        startTime,
        endTime,
        numParticipants,
        tracksRequested,
        isPublic,
        isJoinable,
      },
      rangeDetails.totalTracks
    );
    if (validationError) {
      return Result.fail(validationError);
    }

    const operatingHoursError = this.ensureWithinOperatingHours(
      eventDate,
      startTime,
      endTime,
      rangeDetails.operatingHours
    );
    if (operatingHoursError) {
      return Result.fail(operatingHoursError);
    }

    let conflicts: ReservationConflict[];
    try {
      conflicts = await this.reservationsRepository.getOverlappingReservationsDetails(
        rangeDetails.id,
        eventDate,
        startTime,
        endTime,
        { excludePropositionId: proposition.id }
      );
    } catch (error) {
      return Result.fail(error as Error);
    }

    const blockingConflicts = conflicts.filter((conflict) => conflict.type === 'reservation');

    if (blockingConflicts.length > 0 && !force) {
      return Result.fail(
        new ReservationConflictError({
          conflicts: this.mapReservationConflicts(conflicts),
          requiresForce: true,
        })
      );
    }

    const record: CreateReservationRecord = {
      range_id: rangeDetails.id,
      coordinator_id: user.id,
      proposition_id: proposition.id,
      event_date: eventDate,
      start_time: startTime,
      end_time: endTime,
      num_participants: numParticipants,
      tracks_requested: tracksRequested,
      is_public: isPublic,
      is_joinable: isJoinable,
    };

    try {
      const reservation = await this.reservationsRepository.createReservationFromProposition(
        record,
        proposition.id
      );

      const auditResult = await this.auditService.logAction({
        action_type: 'RESERVATION_CONVERT',
        target_id: reservation.id,
        details: {
          userId: user.id,
          rangeId: rangeDetails.id,
          rangeSlug: rangeDetails.slug,
          propositionId: proposition.id,
          eventDate: reservation.event_date,
          startTime: reservation.start_time,
          endTime: reservation.end_time,
          numParticipants: reservation.num_participants,
          tracksRequested: reservation.tracks_requested,
          isPublic,
          isJoinable,
          forceApplied: force && blockingConflicts.length > 0,
          adjustments: {
            eventDateChanged: eventDate !== proposition.event_date,
            startTimeChanged: startTime !== proposition.start_time,
            endTimeChanged: endTime !== proposition.end_time,
            tracksRequestedChanged: tracksRequested !== proposition.tracks_requested,
            numParticipantsChanged: numParticipants !== proposition.num_participants,
            visibilityChanged: isPublic !== false || isJoinable !== false,
          },
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      const dto: CreatedReservationDto = {
        id: reservation.id,
        range_id: reservation.range_id,
        coordinator_id: reservation.coordinator_id,
      };

      return Result.ok(dto);
    } catch (error) {
      console.error('Failed to convert proposition to reservation', error);
      return Result.fail(new ReservationCreationError());
    }
  }

  private mapReservationConflicts(conflicts: ReservationConflict[]): ReservationConflictItem[] {
    return conflicts.map((conflict) => ({
      id: conflict.id,
      type: conflict.type,
      eventDate: conflict.event_date,
      startTime: conflict.start_time,
      endTime: conflict.end_time,
      tracksRequested: conflict.tracks_requested,
    }));
  }
  private async resolveLinkedPropositionDetail(
    reservation: ReservationDetail,
    user: UserRoleContext
  ): Promise<PropositionDetailDto | null> {
    if (reservation.proposition_id === null) {
      return null;
    }

    return this.getSanitizedPropositionDetail(reservation.proposition_id, user);
  }

  private async getSanitizedPropositionDetail(
    propositionId: number,
    user: UserRoleContext
  ): Promise<PropositionDetailDto | null> {
    const proposition = await this.reservationsRepository.getPropositionDetailById(propositionId);

    if (!proposition) {
      return null;
    }

    const detail = this.buildPropositionDetailDto(proposition);

    if (this.canUserViewProposition(user, proposition)) {
      return detail;
    }

    return {
      ...detail,
      requester: null,
    };
  }

  private buildPropositionDetailDto(proposition: PropositionDetail): PropositionDetailDto {
    const requester = this.buildPersonSummary(
      proposition.user_id,
      proposition.requester_email,
      proposition.requester_phone_number
    );

    return {
      id: proposition.id,
      rangeId: proposition.range_id,
      userId: proposition.user_id,
      status: proposition.status,
      eventDate: proposition.event_date,
      startTime: proposition.start_time,
      endTime: proposition.end_time,
      numParticipants: proposition.num_participants,
      tracksRequested: proposition.tracks_requested,
      createdAt: proposition.created_at ?? null,
      requester,
    };
  }

  private buildPersonSummary(
    id: number,
    email?: string | null,
    phoneNumber?: string | null
  ): PersonSummaryDto {
    return {
      id,
      email: email ?? null,
      phoneNumber: phoneNumber ?? null,
      displayName: null,
    };
  }

  private extractRoleName(role: RoleLike): string {
    if (typeof role === 'string') {
      return role;
    }
    if (role && typeof role === 'object' && 'name' in role && typeof role.name === 'string') {
      return role.name;
    }
    return '';
  }

  private getGlobalRoleNames(user: UserRoleContext): Set<string> {
    const roles = user.roles ?? [];
    const roleNames = roles
      .map((role) => this.extractRoleName(role ?? ''))
      .filter((roleName): roleName is string => roleName.length > 0);
    return new Set(roleNames);
  }

  private getRangeRoleNames(user: UserRoleContext, rangeId: number): Set<string> {
    const rangeRolesSource = user.rangeRoles ?? user.range_roles ?? {};
    const roles = rangeRolesSource[String(rangeId)] ?? [];
    const roleNames = (roles ?? [])
      .map((role) => this.extractRoleName(role ?? ''))
      .filter((roleName): roleName is string => roleName.length > 0);
    return new Set(roleNames);
  }

  private canUserViewProposition(user: UserRoleContext, proposition: PropositionDetail): boolean {
    if (proposition.user_id.toString() === String(user.id)) {
      return true;
    }

    const globalRoleNames = this.getGlobalRoleNames(user);
    const rangeRoleNames = this.getRangeRoleNames(user, proposition.range_id);

    if (
      globalRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      globalRoleNames.has(UserRole.Coordinator) ||
      globalRoleNames.has(UserRole.Member)
    ) {
      return true;
    }

    if (
      rangeRoleNames.has(UserRole.ShootingRangeAdministrator) ||
      rangeRoleNames.has(UserRole.Coordinator)
    ) {
      return true;
    }

    return false;
  }

  private canUserViewReservation(user: UserRoleContext, reservation: ReservationDetail): boolean {
    if (reservation.is_public) {
      return true;
    }

    const globalRoleNames = this.getGlobalRoleNames(user);
    const rangeRoleNames = this.getRangeRoleNames(user, reservation.range_id);

    if (
      globalRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      globalRoleNames.has(UserRole.Coordinator) ||
      globalRoleNames.has(UserRole.Member)
    ) {
      return true;
    }

    if (
      rangeRoleNames.has(UserRole.ShootingRangeAdministrator) ||
      rangeRoleNames.has(UserRole.Coordinator)
    ) {
      return true;
    }

    return false;
  }

  public async cancelReservation(
    command: CancelReservationCommand,
    user: UserDto
  ): Promise<Result<void>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot cancel reservations'));
    }

    let reservation: Reservation | null;
    try {
      reservation = await this.reservationsRepository.getReservationById(command.reservationId);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!reservation) {
      return Result.fail(new ReservationNotFoundError());
    }

    if (!this.canUserCancelReservation(user, reservation)) {
      return Result.fail(new ForbiddenError('User is not allowed to cancel this reservation'));
    }

    let deletedReservation: Reservation | null;
    try {
      deletedReservation = await this.reservationsRepository.deleteReservation(reservation.id);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!deletedReservation) {
      return Result.fail(new ReservationNotFoundError());
    }

    if (deletedReservation.proposition_id !== null) {
      try {
        const reopenedProposition = await this.reservationsRepository.reopenProposition(
          deletedReservation.proposition_id
        );
        if (!reopenedProposition) {
          console.error(
            'Failed to reopen proposition after reservation cancellation',
            deletedReservation.proposition_id
          );
          return Result.fail(new ReservationCancellationError());
        }
      } catch (error) {
        console.error('Failed to reopen proposition after reservation cancellation', error);
        return Result.fail(new ReservationCancellationError());
      }
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'RESERVATION_CANCEL',
      target_id: deletedReservation.id,
      details: {
        userId: user.id,
        rangeId: deletedReservation.range_id,
        reservationId: deletedReservation.id,
        eventDate: deletedReservation.event_date,
        startTime: deletedReservation.start_time,
        endTime: deletedReservation.end_time,
        numParticipants: deletedReservation.num_participants,
        tracksRequested: deletedReservation.tracks_requested,
        coordinatorId: deletedReservation.coordinator_id,
      },
    });

    if (!auditResult.isSuccess) {
      const auditError = auditResult.getError();
      console.error('Failed to log reservation cancellation', auditError);
      return Result.fail(new ReservationCancellationError());
    }

    return Result.ok(undefined as void);
  }

  private canUserCreateReservation(user: UserDto, rangeId: number): boolean {
    const globalRoleNames = new Set(user.roles.map((role) => role.name));
    if (
      globalRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      globalRoleNames.has(UserRole.Coordinator)
    ) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    const rangeRoleNames = new Set(rangeRoles.map((role) => role.name));

    if (
      rangeRoleNames.has(UserRole.ShootingRangeAdministrator) ||
      rangeRoleNames.has(UserRole.Coordinator)
    ) {
      return true;
    }

    return false;
  }

  private canUserCancelReservation(user: UserDto, reservation: Reservation): boolean {
    const globalRoleNames = new Set(user.roles.map((role) => role.name));
    if (
      globalRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      globalRoleNames.has(UserRole.Coordinator)
    ) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(reservation.range_id)] ?? [];
    const rangeRoleNames = new Set(rangeRoles.map((role) => role.name));

    if (rangeRoleNames.has(UserRole.ShootingRangeAdministrator)) {
      return true;
    }

    if (
      rangeRoleNames.has(UserRole.Coordinator) &&
      reservation.coordinator_id === user.id
    ) {
      return true;
    }

    return false;
  }

  private canUserCreateRecord(user: UserDto, rangeId: number): boolean {
    const globalRoleNames = new Set(user.roles.map((role) => role.name));
    if (globalRoleNames.has(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    const rangeRoleNames = new Set(rangeRoles.map((role) => role.name));

    return rangeRoleNames.has(UserRole.ShootingRangeAdministrator);
  }

  private isReservationConversion(
    command: CreateReservationPayload
  ): command is CreateReservationFromPropositionCommand {
    return typeof (command as CreateReservationFromPropositionCommand).propositionId === 'number';
  }

  private validateReservationCommand(
    command: CreateReservationCommand,
    totalTracks: number
  ): Error | null {
    const timeError = this.validateReservationTimeWindow(
      command.eventDate,
      command.startTime,
      command.endTime
    );
    if (timeError) {
      return timeError;
    }

    if (
      !Number.isInteger(command.numParticipants) ||
      command.numParticipants < 1 ||
      command.numParticipants > 50
    ) {
      return new InvalidReservationTimeError('Number of participants must be between 1 and 50');
    }

    const tracksError = this.validateReservationTracks(command.tracksRequested, totalTracks);
    if (tracksError) {
      return tracksError;
    }

    if (typeof command.isPublic !== 'boolean' || typeof command.isJoinable !== 'boolean') {
      return new InvalidReservationTimeError('Visibility flags must be boolean values');
    }

    return null;
  }

  private validateReservationTracks(tracksRequested: number, totalTracks: number): Error | null {
    if (!Number.isInteger(tracksRequested) || tracksRequested < 1) {
      return new InvalidReservationTimeError('Tracks requested must be a positive integer');
    }

    if (tracksRequested > totalTracks) {
      return new InvalidReservationTimeError('Tracks requested cannot exceed range capacity');
    }

    return null;
  }

  private validateReservationTimeWindow(
    eventDate: string,
    startTime: string,
    endTime: string
  ): Error | null {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(eventDate) || Number.isNaN(new Date(eventDate).getTime())) {
      return new InvalidReservationTimeError('Event date must be a valid YYYY-MM-DD value');
    }

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return new InvalidReservationTimeError('Start and end times must be in HH:MM format');
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    if (
      [startHours, startMinutes, endHours, endMinutes].some((value) => Number.isNaN(value)) ||
      startHours < 0 ||
      startHours > 23 ||
      endHours < 0 ||
      endHours > 23 ||
      startMinutes < 0 ||
      startMinutes > 59 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      return new InvalidReservationTimeError('Start and end times must represent valid clock values');
    }

    if (startMinutes % 5 !== 0 || endMinutes % 5 !== 0) {
      return new InvalidReservationTimeError('Times must be aligned to 5-minute increments');
    }

    const startsBeforeEnds =
      startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
    if (!startsBeforeEnds) {
      return new InvalidReservationTimeError('End time must be later than start time');
    }

    return null;
  }

  private ensureWithinOperatingHours(
    eventDate: string,
    startTime: string,
    endTime: string,
    operatingHours: OperatingHours
  ): Error | null {
    const dayKey = this.getOperatingDayKey(eventDate);
    if (!dayKey) {
      return new RangeClosedError('Range is closed for the selected date');
    }

    const window = operatingHours?.[dayKey];
    if (!window) {
      return new RangeClosedError('Range is closed for the selected date');
    }

    const openMinutes = this.toMinutes(window.open);
    const closeMinutes = this.toMinutes(window.close);
    const startMinutes = this.toMinutes(startTime);
    const endMinutes = this.toMinutes(endTime);

    if (
      openMinutes === null ||
      closeMinutes === null ||
      startMinutes === null ||
      endMinutes === null
    ) {
      return new RangeClosedError('Range operating hours are misconfigured');
    }

    if (startMinutes < openMinutes || endMinutes > closeMinutes) {
      return new RangeClosedError('Selected time is outside of range operating hours');
    }

    return null;
  }

  private getOperatingDayKey(eventDate: string): string | null {
    const dayNames = [
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ] as const;

    const date = new Date(`${eventDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return dayNames[date.getUTCDay()] ?? null;
  }

  private toMinutes(time: string): number | null {
    const [hours, minutes] = time.split(':').map(Number);
    if ([hours, minutes].some((value) => Number.isNaN(value))) {
      return null;
    }
    return hours * 60 + minutes;
  }

  private validateRecordCommand(
    command: CreateRecordCommand,
    normalizedParticipants: number
  ): Error | null {
    const timeError = this.validateRecordTimeWindow(
      command.eventDate,
      command.startTime,
      command.endTime
    );
    if (timeError) {
      return timeError;
    }

    if (!Number.isFinite(command.numParticipants)) {
      return new InvalidRecordTimeError('Number of participants must be between 1 and 500');
    }

    if (normalizedParticipants < 1 || normalizedParticipants > 500) {
      return new InvalidRecordTimeError('Number of participants must be between 1 and 500');
    }

    return null;
  }

  private validateRecordTimeWindow(
    eventDate: string,
    startTime: string,
    endTime: string
  ): Error | null {
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(eventDate) || Number.isNaN(new Date(eventDate).getTime())) {
      return new InvalidRecordTimeError('Event date must be a valid YYYY-MM-DD value');
    }

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return new InvalidRecordTimeError('Start and end times must be in HH:MM format');
    }

    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    if (
      [startHours, startMinutes, endHours, endMinutes].some((value) => Number.isNaN(value)) ||
      startHours < 0 ||
      startHours > 23 ||
      endHours < 0 ||
      endHours > 23 ||
      startMinutes < 0 ||
      startMinutes > 59 ||
      endMinutes < 0 ||
      endMinutes > 59
    ) {
      return new InvalidRecordTimeError('Start and end times must represent valid clock values');
    }

    if (startMinutes % 5 !== 0 || endMinutes % 5 !== 0) {
      return new InvalidRecordTimeError('Times must be aligned to 5-minute increments');
    }

    const startsBeforeEnds =
      startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
    if (!startsBeforeEnds) {
      return new InvalidRecordTimeError('End time must be later than start time');
    }

    return null;
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
