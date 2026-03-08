import {
  IAuditService,
  IEventsService,
  INotificationsService,
  IReservationsService,
  IRangesService,
  EventAudience,
  UserRole,
  getRangeRole,
} from '@strzel-sobie/common/models';
import {
  CalendarEventsDto,
  CancelPropositionCommand,
  CancelReservationCommand,
  CreateMessageTemplateCommand,
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
  MessageTemplateDto,
  ForbiddenError,
  InvalidPropositionTimeError,
  InvalidTargetAdminError,
  MemberRoleRequiredError,
  PropositionDeclarationRequiredError,
  InvalidRecordTimeError,
  InvalidReservationTimeError,
  MessageTemplateNotFoundError,
  OverlapDeclarationContextItemDto,
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
  RangeBookingNotAllowedError,
  RangeAdminRoleRequiredError,
  UnauthorizedPropositionError,
  OperatingHours,
  EventSummaryDto,
  UserDto,
  UpdateMessageTemplateCommand,
} from '@strzel-sobie/common';
import {
  CreatePropositionRecord,
  CreateRecordData,
  CreateReservationRecord,
  IReservationsRepository,
  AdminMessageTemplate,
  Proposition,
  PropositionDetail,
  RecordEntity,
  Reservation,
  ReservationDetail,
} from '../domain/reservations.repository';

type RoleLike = { name?: string | null } | string | null | undefined;
type RangeRolesRecord = Record<string, RoleLike[] | undefined>;
type UserRoleContext = {
  id: number | string;
  roles?: RoleLike[];
  rangeRoles?: RangeRolesRecord;
  range_roles?: RangeRolesRecord;
};

type BookingMetadata = {
  trackNos: number[];
  hasCoordinatorLicenseInGroup?: boolean;
  [key: string]: unknown;
};

const NOOP_NOTIFICATIONS_SERVICE: INotificationsService = {
  async notifyNewProposition() {
    return Result.ok(undefined);
  },
  async notifyPropositionConverted() {
    return Result.ok(undefined);
  },
  async notifyReservationCancelled() {
    return Result.ok(undefined);
  },
  async cleanupExpiredNotifications() {
    return Result.ok({ expiredCount: 0, expiredFailedEmailCount: 0 });
  },
};

export class ReservationsService implements IReservationsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly reservationsRepository: IReservationsRepository,
    private readonly eventsService: IEventsService,
    private readonly auditService: IAuditService,
    private readonly notificationsService: INotificationsService = NOOP_NOTIFICATIONS_SERVICE
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
      const [propositions, reservations, eventsResult] = await Promise.all([
        this.reservationsRepository.getPropositions(rangeId, startDate, endDate),
        this.reservationsRepository.getReservations(rangeId, startDate, endDate),
        this.eventsService.getRangeEvents(rangeSlug, this.normalizeEventsUser(user)),
      ]);

      if (!eventsResult.isSuccess) {
        return Result.fail(eventsResult.getError());
      }

      const events = eventsResult
        .getValue()
        .data
        .filter((event) => event.eventDate >= startDate && event.eventDate <= endDate)
        .map((event) => this.mapRangeEventSummary(event));

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
        const canViewDetails = isAdmin || isMember || isCoordinator;
        const metadata = this.parseBookingMetadata(r.metadata_json);
        const trackNos = canViewDetails ? metadata.trackNos : [];
        const firingLineId = canViewDetails ? r.firing_line_id : 0;
        const details = canViewDetails
          ? {
              approvedByAdminId: r.approved_by_admin_id,
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
          firingLineId,
          trackNos,
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
          firingLineId: p.firing_line_id,
          trackNos: this.parseBookingMetadata(p.metadata_json).trackNos,
          hasCoordinatorLicenseInGroup: Boolean(
            this.parseBookingMetadata(p.metadata_json).hasCoordinatorLicenseInGroup
          ),
        })),
        reservations: filteredReservations,
        events,
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

      const dto = this.buildPropositionDetailDto(proposition);
      const overlapDeclarationContext = await this.buildOverlapDeclarationContext({
        rangeId: proposition.range_id,
        eventDate: proposition.event_date,
        startTime: proposition.start_time,
        endTime: proposition.end_time,
        firingLineId: proposition.firing_line_id,
        trackNos: dto.trackNos,
        excludePropositionId: proposition.id,
      });

      return Result.ok({
        ...dto,
        overlapDeclarationContext,
      });
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

      const approvedByAdmin = this.buildPersonSummary(
        reservation.approved_by_admin_id,
        reservation.approved_by_admin_email,
        reservation.approved_by_admin_phone_number
      );
      const reservationMetadata = this.parseBookingMetadata(reservation.metadata_json);
      const overlapDeclarationContext = await this.buildOverlapDeclarationContext({
        rangeId: reservation.range_id,
        eventDate: reservation.event_date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        firingLineId: reservation.firing_line_id,
        trackNos: reservationMetadata.trackNos,
        excludeReservationId: reservation.id,
      });

      const dto: ReservationDetailDto = {
        id: reservation.id,
        rangeId: reservation.range_id,
        approvedByAdminId: reservation.approved_by_admin_id,
        propositionId: reservation.proposition_id,
        proposition: propositionDetailDto,
        eventDate: reservation.event_date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        firingLineId: reservation.firing_line_id,
        trackNos: reservationMetadata.trackNos,
        metadata: reservationMetadata,
        overlapDeclarationContext,
        createdAt: reservation.created_at ?? null,
        approvedByAdmin,
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
      return Result.fail(new RangeAdminRoleRequiredError());
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

  public async listMessageTemplates(
    rangeSlug: string,
    includeInactive: boolean,
    user: UserDto
  ): Promise<Result<MessageTemplateDto[]>> {
    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug, user);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();
    if (!this.canUserManageTemplates(user, rangeDetails.id)) {
      return Result.fail(new ForbiddenError('User is not allowed to list message templates'));
    }
    if (!this.reservationsRepository.listAdminMessageTemplates) {
      return Result.ok([]);
    }

    try {
      const templates = await this.reservationsRepository.listAdminMessageTemplates(
        rangeDetails.id,
        includeInactive
      );
      return Result.ok(templates.map((template) => this.mapMessageTemplate(template)));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async createMessageTemplate(
    rangeSlug: string,
    command: CreateMessageTemplateCommand,
    user: UserDto
  ): Promise<Result<MessageTemplateDto>> {
    const rangeDetailsResult = await this.rangesService.getRangeDetails(rangeSlug, user);
    if (!rangeDetailsResult.isSuccess) {
      return Result.fail(rangeDetailsResult.getError());
    }
    const rangeDetails = rangeDetailsResult.getValue();
    if (!this.canUserManageTemplates(user, rangeDetails.id)) {
      return Result.fail(new ForbiddenError('User is not allowed to create message templates'));
    }
    if (!this.reservationsRepository.createAdminMessageTemplate) {
      return Result.fail(new Error('Message templates repository is not configured'));
    }
    if (!command.name.trim() || !command.content.trim()) {
      return Result.fail(new InvalidReservationTimeError('Template name and content are required'));
    }

    try {
      const template = await this.reservationsRepository.createAdminMessageTemplate({
        range_id: rangeDetails.id,
        created_by_admin_id: user.id,
        name: command.name.trim(),
        content: command.content,
      });
      return Result.ok(this.mapMessageTemplate(template));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async updateMessageTemplate(
    templateId: number,
    command: UpdateMessageTemplateCommand,
    user: UserDto
  ): Promise<Result<MessageTemplateDto>> {
    if (
      !this.reservationsRepository.getAdminMessageTemplateById ||
      !this.reservationsRepository.updateAdminMessageTemplate
    ) {
      return Result.fail(new Error('Message templates repository is not configured'));
    }

    const current = await this.reservationsRepository.getAdminMessageTemplateById(templateId);
    if (!current) {
      return Result.fail(new MessageTemplateNotFoundError());
    }
    if (!this.canUserManageTemplates(user, current.range_id)) {
      return Result.fail(new ForbiddenError('User is not allowed to update message templates'));
    }

    const updated = await this.reservationsRepository.updateAdminMessageTemplate(templateId, {
      name: command.name?.trim(),
      content: command.content,
      is_active:
        typeof command.isActive === 'boolean' ? (command.isActive ? 1 : 0) : undefined,
    });
    if (!updated) {
      return Result.fail(new MessageTemplateNotFoundError());
    }

    return Result.ok(this.mapMessageTemplate(updated));
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

    if (rangeDetails.allowsReservations === false) {
      return Result.fail(new RangeBookingNotAllowedError());
    }

    if (!this.canUserCreateProposition(user, rangeId)) {
      return Result.fail(new MemberRoleRequiredError());
    }

    if (typeof command.hasCoordinatorLicenseInGroup !== 'boolean') {
      return Result.fail(new PropositionDeclarationRequiredError());
    }

    const userRoleNames = new Set(user.roles.map((role) => role.name));
    const hasCoordinatorRole = userRoleNames.has(UserRole.Coordinator);
    const coordinatorDeclaration = hasCoordinatorRole ? true : command.hasCoordinatorLicenseInGroup;

    const selectedFiringLine = rangeDetails.firingLines.find((line) => line.id === command.firingLineId);
    if (!selectedFiringLine) {
      return Result.fail(new InvalidPropositionTimeError('Invalid firing line selected'));
    }

    const validationError = this.validatePropositionCommand(command, selectedFiringLine.tracksCount);
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
      const [propositions, reservations] = await Promise.all([
        this.reservationsRepository.getPropositions(rangeId, command.eventDate, command.eventDate),
        this.reservationsRepository.getReservations(rangeId, command.eventDate, command.eventDate),
      ]);
      const conflicts = this.findTrackConflicts(
        {
          eventDate: command.eventDate,
          startTime: command.startTime,
          endTime: command.endTime,
          firingLineId: command.firingLineId,
          trackNos: command.trackNos,
        },
        propositions,
        reservations
      );
      if (conflicts.length > 0) {
        return Result.fail(new PropositionConflictError());
      }

      if (
        command.targetAdminUserId !== undefined &&
        command.targetAdminUserId !== null &&
        (!Number.isInteger(command.targetAdminUserId) || command.targetAdminUserId < 1)
      ) {
        return Result.fail(new InvalidTargetAdminError());
      }

      const metadata: BookingMetadata = {
        ...(command.metadata ?? {}),
        trackNos: command.trackNos,
        hasCoordinatorLicenseInGroup: coordinatorDeclaration,
      };

      const record: CreatePropositionRecord = {
        user_id: user.id,
        range_id: rangeId,
        event_date: command.eventDate,
        start_time: command.startTime,
        end_time: command.endTime,
        firing_line_id: command.firingLineId,
        metadata_json: JSON.stringify(metadata),
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
          firingLineId: command.firingLineId,
          trackNos: command.trackNos,
          targetAdminUserId: command.targetAdminUserId ?? null,
          hasCoordinatorLicenseInGroup: coordinatorDeclaration,
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      if (command.targetAdminUserId !== undefined && command.targetAdminUserId !== null) {
        const notifyAdminResult = await this.notificationsService.notifyNewProposition({
          recipientUserId: command.targetAdminUserId,
          propositionId: proposition.id,
          rangeId,
          rangeSlug,
          eventDate: command.eventDate,
          startTime: command.startTime,
          endTime: command.endTime,
          firingLineId: command.firingLineId,
          trackNos: command.trackNos,
          requesterUserId: user.id,
        });
        if (!notifyAdminResult.isSuccess) {
          console.error('Failed to dispatch proposition notification', notifyAdminResult.getError());
        }
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
    if (rangeDetails.allowsReservations === false) {
      return Result.fail(new RangeBookingNotAllowedError());
    }

    const selectedFiringLine = rangeDetails.firingLines.find((line) => line.id === command.firingLineId);
    if (!selectedFiringLine) {
      return Result.fail(new InvalidReservationTimeError('Invalid firing line selected'));
    }

    const validationError = this.validateReservationCommand(command, selectedFiringLine.tracksCount);
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
      const [propositions, reservations] = await Promise.all([
        this.reservationsRepository.getPropositions(rangeDetails.id, command.eventDate, command.eventDate),
        this.reservationsRepository.getReservations(rangeDetails.id, command.eventDate, command.eventDate),
      ]);
      const conflicts = this.findTrackConflicts(command, propositions, reservations);
      const blockingConflicts = conflicts.filter((conflict) => conflict.type === 'reservation');

      if (blockingConflicts.length > 0 && !force) {
        return Result.fail(
          new ReservationConflictError({
            conflicts: this.mapReservationConflicts(conflicts),
            requiresForce: true,
          })
        );
      }

      const metadata: BookingMetadata = {
        ...(command.metadata ?? {}),
        trackNos: this.normalizeTrackNos(command.trackNos),
      };
      const record: CreateReservationRecord = {
        range_id: rangeDetails.id,
        approved_by_admin_id: user.id,
        proposition_id: null,
        event_date: command.eventDate,
        start_time: command.startTime,
        end_time: command.endTime,
        firing_line_id: command.firingLineId,
        metadata_json: JSON.stringify(metadata),
      };
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
          firingLineId: command.firingLineId,
          trackNos: command.trackNos,
          forceApplied: force && blockingConflicts.length > 0,
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      const dto: CreatedReservationDto = {
        id: reservation.id,
        range_id: reservation.range_id,
        approved_by_admin_id: reservation.approved_by_admin_id,
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
    if (typeof command.adminMessage !== 'string' || command.adminMessage.trim().length === 0) {
      return Result.fail(new InvalidReservationTimeError('adminMessage is required for proposition conversion'));
    }

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

    const propositionMetadata = this.parseBookingMetadata(proposition.metadata_json);
    const eventDate = command.eventDate ?? proposition.event_date;
    const startTime = command.startTime ?? proposition.start_time;
    const endTime = command.endTime ?? proposition.end_time;
    const resolvedTrackNos = propositionMetadata.trackNos;
    const resolvedFiringLineId = proposition.firing_line_id;
    const selectedFiringLine = rangeDetails.firingLines.find((line) => line.id === resolvedFiringLineId);

    if (rangeDetails.allowsReservations === false) {
      return Result.fail(new ForbiddenError('Reservations are not available for this range'));
    }
    if (!selectedFiringLine) {
      return Result.fail(new InvalidReservationTimeError('Invalid firing line selected'));
    }

    const validationError = this.validateReservationCommand(
      {
        eventDate,
        startTime,
        endTime,
        firingLineId: resolvedFiringLineId,
        trackNos: resolvedTrackNos,
      },
      selectedFiringLine.tracksCount
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

    try {
      const [propositions, reservations] = await Promise.all([
        this.reservationsRepository.getPropositions(rangeDetails.id, eventDate, eventDate),
        this.reservationsRepository.getReservations(rangeDetails.id, eventDate, eventDate),
      ]);
      const conflicts = this.findTrackConflicts(
        {
          eventDate,
          startTime,
          endTime,
          firingLineId: resolvedFiringLineId,
          trackNos: resolvedTrackNos,
        },
        propositions,
        reservations,
        { excludePropositionId: proposition.id }
      );
      const blockingConflicts = conflicts.filter((conflict) => conflict.type === 'reservation');
      if (blockingConflicts.length > 0 && !force) {
        return Result.fail(
          new ReservationConflictError({
            conflicts: this.mapReservationConflicts(conflicts),
            requiresForce: true,
          })
        );
      }

      const reservationMetadata: BookingMetadata = {
        ...(command.metadata ?? {}),
        trackNos: this.normalizeTrackNos(resolvedTrackNos),
      };
      const record: CreateReservationRecord = {
        range_id: rangeDetails.id,
        approved_by_admin_id: user.id,
        proposition_id: proposition.id,
        event_date: eventDate,
        start_time: startTime,
        end_time: endTime,
        firing_line_id: resolvedFiringLineId,
        metadata_json: JSON.stringify(reservationMetadata),
      };
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
          firingLineId: resolvedFiringLineId,
          trackNos: resolvedTrackNos,
          forceApplied: force && blockingConflicts.length > 0,
          adjustments: {
            eventDateChanged: eventDate !== proposition.event_date,
            startTimeChanged: startTime !== proposition.start_time,
            endTimeChanged: endTime !== proposition.end_time,
            trackNosChanged:
              JSON.stringify(this.normalizeTrackNos(resolvedTrackNos)) !==
              JSON.stringify(this.normalizeTrackNos(propositionMetadata.trackNos)),
          },
        },
      });

      if (!auditResult.isSuccess) {
        return Result.fail(auditResult.getError());
      }

      const notifyMemberResult = await this.notificationsService.notifyPropositionConverted({
        recipientUserId: proposition.user_id,
        propositionId: proposition.id,
        reservationId: reservation.id,
        rangeId: rangeDetails.id,
        rangeSlug: rangeDetails.slug,
        eventDate: reservation.event_date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        firingLineId: reservation.firing_line_id,
        trackNos: this.normalizeTrackNos(resolvedTrackNos),
        approvedByAdminId: user.id,
        adminMessage: command.adminMessage,
      });
      if (!notifyMemberResult.isSuccess) {
        console.error(
          'Failed to dispatch proposition conversion notification',
          notifyMemberResult.getError()
        );
      }

      const dto: CreatedReservationDto = {
        id: reservation.id,
        range_id: reservation.range_id,
        approved_by_admin_id: reservation.approved_by_admin_id,
      };

      return Result.ok(dto);
    } catch (error) {
      console.error('Failed to convert proposition to reservation', error);
      return Result.fail(new ReservationCreationError());
    }
  }

  private mapReservationConflicts(
    conflicts: Array<{ id: number; type: 'reservation' | 'proposition'; eventDate: string; startTime: string; endTime: string; firingLineId: number; trackNos: number[] }>
  ): ReservationConflictItem[] {
    return conflicts.map((conflict) => ({
      id: conflict.id,
      type: conflict.type,
      eventDate: conflict.eventDate,
      startTime: conflict.startTime,
      endTime: conflict.endTime,
      firingLineId: conflict.firingLineId,
      trackNos: conflict.trackNos,
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
    const metadata = this.parseBookingMetadata(proposition.metadata_json);

    return {
      id: proposition.id,
      rangeId: proposition.range_id,
      userId: proposition.user_id,
      status: proposition.status,
      eventDate: proposition.event_date,
      startTime: proposition.start_time,
      endTime: proposition.end_time,
      firingLineId: proposition.firing_line_id,
      trackNos: metadata.trackNos,
      hasCoordinatorLicenseInGroup: Boolean(metadata.hasCoordinatorLicenseInGroup),
      metadata,
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

  private normalizeEventsUser(user: UserRoleContext): UserDto {
    const roleNames = (user.roles ?? [])
      .map((role) => (typeof role === 'string' ? role : role?.name ?? ''))
      .filter((roleName) => roleName.length > 0);

    const rangeRolesSource = user.rangeRoles ?? user.range_roles ?? {};
    const rangeRoles = Object.entries(rangeRolesSource).reduce((acc, [rangeId, roleList]) => {
      const names = (roleList ?? [])
        .map((role) => (typeof role === 'string' ? role : role?.name ?? ''))
        .filter((roleName) => roleName.length > 0);
      if (names.length > 0) {
        acc[rangeId] = names.map((name, index) => ({
          id: index + 1,
          name,
          scope: 'range' as const,
        }));
      }
      return acc;
    }, {} as UserDto['rangeRoles']);

    const isDeleted = (user as { isDeleted?: number }).isDeleted === 1 ? 1 : 0;

    return {
      id: typeof user.id === 'string' ? Number.parseInt(user.id, 10) : user.id,
      email: (user as { email?: string }).email ?? 'calendar@strzel-sobie.local',
      isDeleted,
      createdAt: (user as { createdAt?: string }).createdAt ?? new Date(0).toISOString(),
      roles: roleNames.map((name, index) => ({
        id: index + 1,
        name,
        scope: 'global' as const,
      })),
      rangeRoles,
    };
  }

  private mapRangeEventSummary(event: EventSummaryDto) {
    const audience: CalendarEventsDto['events'][number]['audience'] =
      event.audience === EventAudience.Public ? 'Public' : 'MembersOnly';

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      startTime: this.combineEventDateTime(event.eventDate, event.startTime),
      endTime: this.combineEventDateTime(event.eventDate, event.endTime),
      audience,
    };
  }

  private combineEventDateTime(eventDate: string, time: string): string {
    return `${eventDate}T${time}:00`;
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
        firingLineId: deletedReservation.firing_line_id,
        trackNos: this.parseBookingMetadata(deletedReservation.metadata_json).trackNos,
        approvedByAdminId: deletedReservation.approved_by_admin_id,
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
    if (globalRoleNames.has(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    const rangeRoleNames = new Set(rangeRoles.map((role) => role.name));

    return rangeRoleNames.has(UserRole.ShootingRangeAdministrator);
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
      reservation.approved_by_admin_id === user.id
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

  private canUserManageTemplates(user: UserDto, rangeId: number): boolean {
    const globalRoleNames = new Set(user.roles.map((role) => role.name));
    if (globalRoleNames.has(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    return rangeRoles.some((role) => role.name === UserRole.ShootingRangeAdministrator);
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
    if (!Number.isInteger(command.firingLineId) || command.firingLineId < 1) {
      return new InvalidReservationTimeError('firingLineId must be a positive integer');
    }

    const timeError = this.validateReservationTimeWindow(
      command.eventDate,
      command.startTime,
      command.endTime
    );
    if (timeError) {
      return timeError;
    }

    const tracksError = this.validateReservationTracks(command.trackNos, totalTracks);
    if (tracksError) {
      return tracksError;
    }

    return null;
  }

  private validateReservationTracks(trackNos: number[], totalTracks: number): Error | null {
    if (!Array.isArray(trackNos) || trackNos.length < 1) {
      return new InvalidReservationTimeError('trackNos must contain at least one track');
    }

    const allTrackNosAreValid =
      trackNos.every((trackNo) => Number.isInteger(trackNo) && trackNo >= 1 && trackNo <= totalTracks);
    if (!allTrackNosAreValid) {
      return new InvalidReservationTimeError('All track numbers must be within firing line capacity');
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
    if (globalRoleNames.has(UserRole.Member)) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    return rangeRoles.some((role) => role.name === UserRole.Member);
  }

  private validatePropositionCommand(
    command: CreatePropositionCommand,
    totalTracks: number
  ): Error | null {
    if (!Number.isInteger(command.firingLineId) || command.firingLineId < 1) {
      return new InvalidPropositionTimeError('firingLineId must be a positive integer');
    }

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

    if (
      !Array.isArray(command.trackNos) ||
      command.trackNos.length < 1 ||
      command.trackNos.some(
        (trackNo) => !Number.isInteger(trackNo) || trackNo < 1 || trackNo > totalTracks
      )
    ) {
      return new InvalidPropositionTimeError(
        'trackNos must contain values between 1 and the range capacity'
      );
    }

    return null;
  }

  private parseBookingMetadata(metadataJson: string | null | undefined): BookingMetadata {
    if (!metadataJson) {
      return { trackNos: [] };
    }

    try {
      const parsed = JSON.parse(metadataJson) as Partial<BookingMetadata>;
      return {
        ...parsed,
        trackNos: this.normalizeTrackNos(Array.isArray(parsed.trackNos) ? parsed.trackNos : []),
      };
    } catch {
      return { trackNos: [] };
    }
  }

  private mapMessageTemplate(template: AdminMessageTemplate): MessageTemplateDto {
    return {
      id: template.id,
      rangeId: template.range_id,
      createdByAdminId: template.created_by_admin_id,
      name: template.name,
      content: template.content,
      isActive: template.is_active === 1,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    };
  }

  private normalizeTrackNos(trackNos: number[]): number[] {
    const unique = Array.from(new Set(trackNos.filter((trackNo) => Number.isInteger(trackNo))));
    return unique.sort((a, b) => a - b);
  }

  private async buildOverlapDeclarationContext(params: {
    rangeId: number;
    eventDate: string;
    startTime: string;
    endTime: string;
    firingLineId: number;
    trackNos: number[];
    excludePropositionId?: number;
    excludeReservationId?: number;
  }): Promise<OverlapDeclarationContextItemDto[]> {
    const requestedTrackNos = this.normalizeTrackNos(params.trackNos);
    if (requestedTrackNos.length === 0) {
      return [];
    }

    const overlapsInTime = (startTime: string, endTime: string): boolean =>
      startTime < params.endTime && endTime > params.startTime;
    const hasTrackOverlap = (existingTrackNos: number[]): boolean =>
      existingTrackNos.some((trackNo) => requestedTrackNos.includes(trackNo));

    const [propositions, reservations] = await Promise.all([
      this.reservationsRepository.getPropositions(params.rangeId, params.eventDate, params.eventDate),
      this.reservationsRepository.getReservations(params.rangeId, params.eventDate, params.eventDate),
    ]);

    const propositionItems: OverlapDeclarationContextItemDto[] = propositions
      .filter((proposition) => proposition.id !== params.excludePropositionId)
      .filter((proposition) => proposition.status === 'open' || proposition.status === 'converted')
      .filter((proposition) => proposition.event_date === params.eventDate)
      .filter((proposition) => proposition.firing_line_id === params.firingLineId)
      .filter((proposition) => overlapsInTime(proposition.start_time, proposition.end_time))
      .map((proposition) => {
        const metadata = this.parseBookingMetadata(proposition.metadata_json);
        return {
          type: 'proposition' as const,
          id: proposition.id,
          eventDate: proposition.event_date,
          startTime: proposition.start_time,
          endTime: proposition.end_time,
          firingLineId: proposition.firing_line_id,
          trackNos: metadata.trackNos,
          hasCoordinatorLicenseInGroup:
            typeof metadata.hasCoordinatorLicenseInGroup === 'boolean'
              ? metadata.hasCoordinatorLicenseInGroup
              : null,
        };
      })
      .filter((item) => hasTrackOverlap(item.trackNos));

    const reservationItems: OverlapDeclarationContextItemDto[] = reservations
      .filter((reservation) => reservation.id !== params.excludeReservationId)
      .filter((reservation) => reservation.event_date === params.eventDate)
      .filter((reservation) => reservation.firing_line_id === params.firingLineId)
      .filter((reservation) => overlapsInTime(reservation.start_time, reservation.end_time))
      .map((reservation) => {
        const metadata = this.parseBookingMetadata(reservation.metadata_json);
        return {
          type: 'reservation' as const,
          id: reservation.id,
          eventDate: reservation.event_date,
          startTime: reservation.start_time,
          endTime: reservation.end_time,
          firingLineId: reservation.firing_line_id,
          trackNos: metadata.trackNos,
          hasCoordinatorLicenseInGroup:
            typeof metadata.hasCoordinatorLicenseInGroup === 'boolean'
              ? metadata.hasCoordinatorLicenseInGroup
              : null,
        };
      })
      .filter((item) => hasTrackOverlap(item.trackNos));

    const typeOrder = { reservation: 0, proposition: 1 } as const;
    return [...reservationItems, ...propositionItems].sort((a, b) => {
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      if (a.type !== b.type) {
        return typeOrder[a.type] - typeOrder[b.type];
      }
      return a.id - b.id;
    });
  }

  private findTrackConflicts(
    requested: {
      eventDate: string;
      startTime: string;
      endTime: string;
      firingLineId: number;
      trackNos: number[];
    },
    propositions: Proposition[],
    reservations: Reservation[],
    options?: { excludePropositionId?: number; excludeReservationId?: number }
  ): Array<{
    id: number;
    type: 'reservation' | 'proposition';
    eventDate: string;
    startTime: string;
    endTime: string;
    firingLineId: number;
    trackNos: number[];
  }> {
    const requestedTrackNos = this.normalizeTrackNos(requested.trackNos);
    const hasTrackOverlap = (existingTrackNos: number[]): boolean =>
      existingTrackNos.some((trackNo) => requestedTrackNos.includes(trackNo));
    const overlapsInTime = (startTime: string, endTime: string): boolean =>
      startTime < requested.endTime && endTime > requested.startTime;

    const propositionConflicts = propositions
      .filter((proposition) => proposition.status === 'open')
      .filter((proposition) => proposition.id !== options?.excludePropositionId)
      .filter((proposition) => proposition.event_date === requested.eventDate)
      .filter((proposition) => proposition.firing_line_id === requested.firingLineId)
      .filter((proposition) => overlapsInTime(proposition.start_time, proposition.end_time))
      .map((proposition) => ({
        id: proposition.id,
        type: 'proposition' as const,
        eventDate: proposition.event_date,
        startTime: proposition.start_time,
        endTime: proposition.end_time,
        firingLineId: proposition.firing_line_id,
        trackNos: this.parseBookingMetadata(proposition.metadata_json).trackNos,
      }))
      .filter((proposition) => hasTrackOverlap(proposition.trackNos));

    const reservationConflicts = reservations
      .filter((reservation) => reservation.id !== options?.excludeReservationId)
      .filter((reservation) => reservation.event_date === requested.eventDate)
      .filter((reservation) => reservation.firing_line_id === requested.firingLineId)
      .filter((reservation) => overlapsInTime(reservation.start_time, reservation.end_time))
      .map((reservation) => ({
        id: reservation.id,
        type: 'reservation' as const,
        eventDate: reservation.event_date,
        startTime: reservation.start_time,
        endTime: reservation.end_time,
        firingLineId: reservation.firing_line_id,
        trackNos: this.parseBookingMetadata(reservation.metadata_json).trackNos,
      }))
      .filter((reservation) => hasTrackOverlap(reservation.trackNos));

    return [...propositionConflicts, ...reservationConflicts];
  }

}
