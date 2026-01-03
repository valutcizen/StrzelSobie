import {
  CreateEventCommand,
  CreateEventSignupCommand,
  EventDetailsDto,
  EventParticipantDto,
  EventSignupResultDto,
  EventsListResponseDto,
  UpdateEventCommand,
  UpdateEventSignupCommand,
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  EventSignupStatus,
  EventStatus,
  ForbiddenError,
  IAuditService,
  IRangesService,
  Result,
  UserDto,
  UserRole,
  EventNotFoundError,
  EventSignupAlreadyExistsError,
  EventSignupCapacityError,
  EventSignupClosedError,
  EventSignupNotAllowedError,
  EventSignupNotFoundError,
  EventValidationError,
  IEventsService,
} from '@strzel-sobie/common/models';
import {
  CreateEventRecord,
  CreateEventSignupRecord,
  EventParticipantRecord,
  EventRecord,
  EventSignupRecord,
  EventSignupSummary,
  IEventsRepository,
  UpdateEventRecord,
} from '../domain/events.repository';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}$/;

export class EventsService implements IEventsService {
  constructor(
    private readonly rangesService: IRangesService,
    private readonly eventsRepository: IEventsRepository,
    private readonly auditService: IAuditService
  ) {}

  public async getRangeEvents(
    rangeSlug: string,
    user?: UserDto | null
  ): Promise<Result<EventsListResponseDto>> {
    if (user?.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot view events'));
    }

    const rangeResult = await this.rangesService.getRangeDetails(rangeSlug, user ?? undefined);
    if (!rangeResult.isSuccess) {
      return Result.fail(rangeResult.getError());
    }

    const rangeDetails = rangeResult.getValue();

    try {
      const events = await this.eventsRepository.getRangeEvents(rangeDetails.id);
      const filtered = events.filter((event) =>
        this.canUserViewAudience(user, rangeDetails.id, event.audience)
      );

      return Result.ok({
        data: filtered.map((event) => this.mapSummary(event)),
      });
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getEventDetails(
    eventId: number,
    user?: UserDto | null
  ): Promise<Result<EventDetailsDto>> {
    if (user?.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot view events'));
    }

    let event: EventRecord | null;
    try {
      event = await this.eventsRepository.getEventById(eventId);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!event) {
      return Result.fail(new EventNotFoundError());
    }

    if (!this.canUserViewAudience(user, event.range_id, event.audience)) {
      return Result.fail(new ForbiddenError('User is not allowed to view this event'));
    }

    const shouldIncludeParticipants = this.canUserManageEvent(user, event);
    let participants: EventParticipantDto[] | undefined;
    let waitlist: EventParticipantDto[] | undefined;

    if (shouldIncludeParticipants) {
      try {
        const [participantRecords, waitlistRecords] = await Promise.all([
          this.eventsRepository.getEventParticipants(event.id),
          this.eventsRepository.getEventWaitlist(event.id),
        ]);
        participants = participantRecords.map(this.mapParticipant);
        waitlist = waitlistRecords.map(this.mapParticipant);
      } catch (error) {
        return Result.fail(error as Error);
      }
    }

    const dto = this.mapDetails(
      event,
      this.canUserSeeMemberDescription(user, event.range_id),
      participants,
      waitlist
    );

    return Result.ok(dto);
  }

  public async createEvent(
    rangeSlug: string,
    command: CreateEventCommand,
    user: UserDto
  ): Promise<Result<EventDetailsDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot create events'));
    }

    const rangeResult = await this.rangesService.getRangeDetails(rangeSlug, user);
    if (!rangeResult.isSuccess) {
      return Result.fail(rangeResult.getError());
    }

    const rangeDetails = rangeResult.getValue();
    if (!this.canUserCreateEvent(user, rangeDetails.id, rangeDetails.extras)) {
      return Result.fail(new ForbiddenError('User is not allowed to create events for this range'));
    }

    const validationError = this.validateCreateCommand(command);
    if (validationError) {
      return Result.fail(validationError);
    }

    const normalized = this.normalizeCreateCommand(command, user.id, rangeDetails.id);

    let created: EventRecord;
    try {
      created = await this.eventsRepository.createEvent(normalized);
    } catch (error) {
      return Result.fail(error as Error);
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_CREATE',
      target_id: created.id,
      details: {
        userId: user.id,
        rangeId: rangeDetails.id,
        rangeSlug: rangeDetails.slug,
        name: created.name,
        eventDate: created.event_date,
        startTime: created.start_time,
        endTime: created.end_time,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok(
      this.mapDetails(
        created,
        true,
        undefined,
        undefined
      )
    );
  }

  public async updateEvent(
    eventId: number,
    command: UpdateEventCommand,
    user: UserDto
  ): Promise<Result<EventDetailsDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot update events'));
    }

    const existing = await this.getEventOrFail(eventId);
    if (!existing.isSuccess) {
      return Result.fail(existing.getError());
    }

    const current = existing.getValue();
    if (!this.canUserManageEvent(user, current)) {
      return Result.fail(new ForbiddenError('User is not allowed to update this event'));
    }

    const merged = this.mergeEventForUpdate(current, command);
    const validationError = this.validateEventRecord(merged);
    if (validationError) {
      return Result.fail(validationError);
    }

    let updated: EventRecord | null;
    try {
      const updateRecord = this.buildUpdateRecord(command);
      updated = await this.eventsRepository.updateEvent(eventId, updateRecord);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!updated) {
      return Result.fail(new EventNotFoundError());
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_UPDATE',
      target_id: updated.id,
      details: {
        userId: user.id,
        eventId: updated.id,
        updates: command,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok(this.mapDetails(updated, true, undefined, undefined));
  }

  public async cancelEvent(eventId: number, user: UserDto): Promise<Result<void>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot cancel events'));
    }

    const existing = await this.getEventOrFail(eventId);
    if (!existing.isSuccess) {
      return Result.fail(existing.getError());
    }

    const current = existing.getValue();
    if (!this.canUserManageEvent(user, current)) {
      return Result.fail(new ForbiddenError('User is not allowed to cancel this event'));
    }

    let cancelled: EventRecord | null;
    try {
      cancelled = await this.eventsRepository.cancelEvent(eventId);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!cancelled) {
      return Result.fail(new EventNotFoundError());
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_CANCEL',
      target_id: cancelled.id,
      details: {
        userId: user.id,
        eventId: cancelled.id,
        rangeId: cancelled.range_id,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok(undefined as void);
  }

  public async createSignup(
    eventId: number,
    command: CreateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot sign up for events'));
    }

    const eventResult = await this.getEventOrFail(eventId);
    if (!eventResult.isSuccess) {
      return Result.fail(eventResult.getError());
    }

    const event = eventResult.getValue();
    const permissionError = this.validateSignupPermission(event, user);
    if (permissionError) {
      return Result.fail(permissionError);
    }

    const guests = this.normalizeGuests(command.guests);
    const guestsError = this.validateGuests(event, user, guests);
    if (guestsError) {
      return Result.fail(guestsError);
    }

    let existing: EventSignupRecord | null;
    try {
      existing = await this.eventsRepository.getSignupByUser(event.id, user.id);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (existing) {
      return Result.fail(new EventSignupAlreadyExistsError());
    }

    const summaryResult = await this.getSignupSummary(event);
    if (!summaryResult.isSuccess) {
      return Result.fail(summaryResult.getError());
    }

    const summary = summaryResult.getValue();
    const slotsRequested = 1 + guests;

    const status = this.resolveSignupStatus(event, summary, slotsRequested);
    if (!status) {
      return Result.fail(new EventSignupCapacityError());
    }

    const record: CreateEventSignupRecord = {
      event_id: event.id,
      user_id: user.id,
      guests,
      status,
    };

    let signup: EventSignupRecord;
    try {
      signup = await this.eventsRepository.createSignup(record);
    } catch (error) {
      return Result.fail(error as Error);
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_SIGNUP_CREATE',
      target_id: signup.id,
      details: {
        userId: user.id,
        eventId: event.id,
        guests,
        status: signup.status,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok({
      signupId: signup.id,
      status: this.mapSignupStatus(signup.status),
    });
  }

  public async updateSignup(
    eventId: number,
    command: UpdateEventSignupCommand,
    user: UserDto
  ): Promise<Result<EventSignupResultDto>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot update signups'));
    }

    const eventResult = await this.getEventOrFail(eventId);
    if (!eventResult.isSuccess) {
      return Result.fail(eventResult.getError());
    }

    const event = eventResult.getValue();
    const permissionError = this.validateSignupPermission(event, user);
    if (permissionError) {
      return Result.fail(permissionError);
    }

    const guests = this.normalizeGuests(command.guests);
    const guestsError = this.validateGuests(event, user, guests);
    if (guestsError) {
      return Result.fail(guestsError);
    }

    let existing: EventSignupRecord | null;
    try {
      existing = await this.eventsRepository.getSignupByUser(event.id, user.id);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!existing) {
      return Result.fail(new EventSignupNotFoundError());
    }

    const slotsRequested = 1 + guests;
    const currentSlots = 1 + existing.guests;
    if (slotsRequested > currentSlots && event.capacity_type === EventCapacityType.Limited) {
      const summaryResult = await this.getSignupSummary(event);
      if (!summaryResult.isSuccess) {
        return Result.fail(summaryResult.getError());
      }
      const summary = summaryResult.getValue();
      const available = Math.max(0, (event.capacity_limit ?? 0) - summary.confirmedSlots);
      const delta = slotsRequested - currentSlots;
      if (available < delta) {
        return Result.fail(new EventSignupCapacityError());
      }
    }

    if (
      slotsRequested > currentSlots &&
      existing.status === EventSignupStatus.Waitlisted &&
      event.waitlist_limit !== null
    ) {
      const summaryResult = await this.getSignupSummary(event);
      if (!summaryResult.isSuccess) {
        return Result.fail(summaryResult.getError());
      }
      const summary = summaryResult.getValue();
      const available = Math.max(0, event.waitlist_limit - summary.waitlistedSlots);
      const delta = slotsRequested - currentSlots;
      if (available < delta) {
        return Result.fail(new EventSignupCapacityError());
      }
    }

    let updated: EventSignupRecord | null;
    try {
      updated = await this.eventsRepository.updateSignup(event.id, user.id, guests);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!updated) {
      return Result.fail(new EventSignupNotFoundError());
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_SIGNUP_UPDATE',
      target_id: updated.id,
      details: {
        userId: user.id,
        eventId: event.id,
        guests,
        status: updated.status,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok({
      signupId: updated.id,
      status: this.mapSignupStatus(updated.status),
    });
  }

  public async cancelSignup(eventId: number, user: UserDto): Promise<Result<void>> {
    if (user.isDeleted) {
      return Result.fail(new ForbiddenError('Deleted users cannot cancel signups'));
    }

    const eventResult = await this.getEventOrFail(eventId);
    if (!eventResult.isSuccess) {
      return Result.fail(eventResult.getError());
    }

    const event = eventResult.getValue();
    let existing: EventSignupRecord | null;
    try {
      existing = await this.eventsRepository.getSignupByUser(event.id, user.id);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!existing) {
      return Result.fail(new EventSignupNotFoundError());
    }

    let removed: EventSignupRecord | null;
    try {
      removed = await this.eventsRepository.deleteSignup(event.id, user.id);
    } catch (error) {
      return Result.fail(error as Error);
    }

    if (!removed) {
      return Result.fail(new EventSignupNotFoundError());
    }

    if (
      existing.status === EventSignupStatus.Confirmed &&
      event.capacity_type === EventCapacityType.Limited
    ) {
      const slotsAvailable = 1 + existing.guests;
      try {
        await this.eventsRepository.promoteWaitlistedSignup(event.id, slotsAvailable);
      } catch (error) {
        return Result.fail(error as Error);
      }
    }

    const auditResult = await this.auditService.logAction({
      action_type: 'EVENT_SIGNUP_CANCEL',
      target_id: removed.id,
      details: {
        userId: user.id,
        eventId: event.id,
      },
    });

    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    return Result.ok(undefined as void);
  }

  private async getEventOrFail(eventId: number): Promise<Result<EventRecord>> {
    try {
      const event = await this.eventsRepository.getEventById(eventId);
      if (!event) {
        return Result.fail(new EventNotFoundError());
      }
      return Result.ok(event);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private mapSummary(event: EventRecord) {
    return {
      id: event.id,
      rangeId: event.range_id,
      name: event.name,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      registrationType: event.registration_type,
      audience: event.audience,
      capacityType: event.capacity_type,
      status: event.status,
    };
  }

  private mapDetails(
    event: EventRecord,
    includeMemberDescription: boolean,
    participants?: EventParticipantDto[],
    waitlist?: EventParticipantDto[]
  ): EventDetailsDto {
    return {
      id: event.id,
      rangeId: event.range_id,
      createdBy: event.created_by,
      name: event.name,
      publicDescription: event.public_description,
      memberDescription: includeMemberDescription ? event.member_description : null,
      eventDate: event.event_date,
      startTime: event.start_time,
      endTime: event.end_time,
      registrationType: event.registration_type,
      audience: event.audience,
      capacityType: event.capacity_type,
      capacityLimit: event.capacity_limit,
      guestPolicy: event.guest_policy,
      waitlistLimit: event.waitlist_limit,
      registrationDeadline: event.registration_deadline,
      status: event.status,
      createdAt: event.created_at,
      updatedAt: event.updated_at,
      participants,
      waitlist,
    };
  }

  private mapParticipant(record: EventParticipantRecord): EventParticipantDto {
    return {
      userId: record.user_id,
      email: record.user_email,
      displayName: record.user_display_name,
      guests: record.guests,
      signupTime: record.signup_time,
    };
  }

  private mapSignupStatus(status: EventSignupRecord['status']): EventSignupStatus {
    return status;
  }

  private getGlobalRoleNames(user: UserDto | null | undefined): Set<string> {
    const roles = user?.roles ?? [];
    return new Set(roles.map((role) => role.name));
  }

  private getRangeRoleNames(user: UserDto | null | undefined, rangeId: number): Set<string> {
    const rangeRoles = user?.rangeRoles?.[String(rangeId)] ?? [];
    return new Set(rangeRoles.map((role) => role.name));
  }

  private canUserViewAudience(
    user: UserDto | null | undefined,
    rangeId: number,
    audience: EventRecord['audience']
  ): boolean {
    if (audience === EventAudience.Public) {
      return true;
    }

    return this.canUserSeeMemberDescription(user, rangeId);
  }

  private canUserSeeMemberDescription(user: UserDto | null | undefined, rangeId: number): boolean {
    if (!user) {
      return false;
    }

    const globalRoles = this.getGlobalRoleNames(user);
    if (
      globalRoles.has(UserRole.ClubCommunityAdministrator) ||
      globalRoles.has(UserRole.Member)
    ) {
      return true;
    }

    const rangeRoles = this.getRangeRoleNames(user, rangeId);
    return rangeRoles.has(UserRole.ShootingRangeAdministrator);
  }

  private canUserManageEvent(user: UserDto | null | undefined, event: EventRecord): boolean {
    if (!user) {
      return false;
    }

    if (event.created_by === user.id) {
      return true;
    }

    const globalRoles = this.getGlobalRoleNames(user);
    if (globalRoles.has(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = this.getRangeRoleNames(user, event.range_id);
    return rangeRoles.has(UserRole.ShootingRangeAdministrator);
  }

  private canUserCreateEvent(
    user: UserDto,
    rangeId: number,
    extras: Record<string, unknown>
  ): boolean {
    const globalRoles = this.getGlobalRoleNames(user);
    if (globalRoles.has(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = this.getRangeRoleNames(user, rangeId);
    if (rangeRoles.has(UserRole.ShootingRangeAdministrator)) {
      return true;
    }

    const allowMemberEvents =
      typeof (extras as { allowMemberEvents?: unknown }).allowMemberEvents === 'boolean'
        ? Boolean((extras as { allowMemberEvents?: boolean }).allowMemberEvents)
        : false;

    return allowMemberEvents && globalRoles.has(UserRole.Member);
  }

  private validateSignupPermission(event: EventRecord, user: UserDto): Error | null {
    if (event.status !== EventStatus.Active) {
      return new EventSignupClosedError();
    }

    if (event.registration_type !== EventRegistrationType.RegistrationRequired) {
      return new EventSignupNotAllowedError('Event does not accept registrations');
    }

    if (!this.canUserViewAudience(user, event.range_id, event.audience)) {
      return new ForbiddenError('User is not allowed to sign up for this event');
    }

    if (event.registration_deadline) {
      const deadline = new Date(event.registration_deadline);
      if (Number.isNaN(deadline.getTime()) || Date.now() > deadline.getTime()) {
        return new EventSignupClosedError();
      }
    }

    return null;
  }

  private normalizeGuests(guests?: number): number {
    if (typeof guests !== 'number' || Number.isNaN(guests)) {
      return 0;
    }
    return Math.max(0, Math.trunc(guests));
  }

  private validateGuests(event: EventRecord, user: UserDto, guests: number): Error | null {
    if (guests === 0) {
      return null;
    }

    if (event.audience !== EventAudience.MembersOnly) {
      return new EventSignupNotAllowedError('Guests are only allowed for members-only events');
    }

    const globalRoles = this.getGlobalRoleNames(user);
    const rangeRoles = this.getRangeRoleNames(user, event.range_id);
    if (
      !globalRoles.has(UserRole.Member) &&
      !globalRoles.has(UserRole.ClubCommunityAdministrator) &&
      !rangeRoles.has(UserRole.ShootingRangeAdministrator)
    ) {
      return new EventSignupNotAllowedError('Guests are only allowed for members');
    }

    if (event.guest_policy !== EventGuestPolicy.GuestsAllowed) {
      return new EventSignupNotAllowedError('Guests are not allowed for this event');
    }

    return null;
  }

  private async getSignupSummary(event: EventRecord): Promise<Result<EventSignupSummary>> {
    if (event.capacity_type !== EventCapacityType.Limited) {
      return Result.ok({ confirmedSlots: 0, waitlistedSlots: 0 });
    }

    try {
      const summary = await this.eventsRepository.getSignupSummary(event.id);
      return Result.ok(summary);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  private resolveSignupStatus(
    event: EventRecord,
    summary: EventSignupSummary,
    slotsRequested: number
  ): EventSignupRecord['status'] | null {
    if (event.capacity_type !== EventCapacityType.Limited) {
      return EventSignupStatus.Confirmed;
    }

    const capacityLimit = event.capacity_limit ?? 0;
    const remaining = Math.max(0, capacityLimit - summary.confirmedSlots);
    if (remaining >= slotsRequested) {
      return EventSignupStatus.Confirmed;
    }

    if (event.waitlist_limit === null) {
      return EventSignupStatus.Waitlisted;
    }

    const waitlistRemaining = Math.max(0, event.waitlist_limit - summary.waitlistedSlots);
    if (waitlistRemaining >= slotsRequested) {
      return EventSignupStatus.Waitlisted;
    }

    return null;
  }

  private validateCreateCommand(command: CreateEventCommand): Error | null {
    if (!command.name || command.name.trim().length === 0) {
      return new EventValidationError('Event name is required');
    }

    if (!command.publicDescription || command.publicDescription.trim().length === 0) {
      return new EventValidationError('Public description is required');
    }

    if (!DATE_PATTERN.test(command.eventDate)) {
      return new EventValidationError('Event date must be in YYYY-MM-DD format');
    }

    if (!TIME_PATTERN.test(command.startTime) || !TIME_PATTERN.test(command.endTime)) {
      return new EventValidationError('Event times must be in HH:MM format');
    }

    if (!this.isStartBeforeEnd(command.startTime, command.endTime)) {
      return new EventValidationError('End time must be later than start time');
    }

    if (
      command.registrationType === EventRegistrationType.RegistrationRequired &&
      command.capacityType === EventCapacityType.Limited
    ) {
      if (!Number.isInteger(command.capacityLimit) || (command.capacityLimit ?? 0) <= 0) {
        return new EventValidationError('Capacity limit must be a positive integer');
      }
    }

    if (command.waitlistLimit !== undefined && command.waitlistLimit !== null) {
      if (!Number.isInteger(command.waitlistLimit) || command.waitlistLimit < 0) {
        return new EventValidationError('Waitlist limit must be zero or a positive integer');
      }
    }

    if (command.registrationDeadline) {
      const deadline = new Date(command.registrationDeadline);
      if (Number.isNaN(deadline.getTime())) {
        return new EventValidationError('Registration deadline must be a valid datetime');
      }
    }

    if (
      command.guestPolicy &&
      (command.audience !== EventAudience.MembersOnly ||
        command.registrationType !== EventRegistrationType.RegistrationRequired)
    ) {
      return new EventValidationError('Guest policy is only allowed for members-only events');
    }

    return null;
  }

  private validateEventRecord(event: EventRecord): Error | null {
    if (!event.name || event.name.trim().length === 0) {
      return new EventValidationError('Event name is required');
    }

    if (!DATE_PATTERN.test(event.event_date)) {
      return new EventValidationError('Event date must be in YYYY-MM-DD format');
    }

    if (!TIME_PATTERN.test(event.start_time) || !TIME_PATTERN.test(event.end_time)) {
      return new EventValidationError('Event times must be in HH:MM format');
    }

    if (!this.isStartBeforeEnd(event.start_time, event.end_time)) {
      return new EventValidationError('End time must be later than start time');
    }

    if (event.capacity_type === EventCapacityType.Limited) {
      if (!Number.isInteger(event.capacity_limit) || (event.capacity_limit ?? 0) <= 0) {
        return new EventValidationError('Capacity limit must be a positive integer');
      }
    }

    if (event.waitlist_limit !== null && event.waitlist_limit !== undefined) {
      if (!Number.isInteger(event.waitlist_limit) || event.waitlist_limit < 0) {
        return new EventValidationError('Waitlist limit must be zero or a positive integer');
      }
    }

    return null;
  }

  private normalizeCreateCommand(
    command: CreateEventCommand,
    userId: number,
    rangeId: number
  ): CreateEventRecord {
    const normalized = {
      range_id: rangeId,
      created_by: userId,
      name: command.name.trim(),
      public_description: command.publicDescription.trim(),
      member_description: command.memberDescription ?? null,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      registration_type: command.registrationType,
      audience: command.audience,
      capacity_type: command.capacityType,
      capacity_limit: command.capacityLimit ?? null,
      guest_policy: command.guestPolicy ?? null,
      waitlist_limit: command.waitlistLimit ?? null,
      registration_deadline: command.registrationDeadline ?? null,
      status: EventStatus.Active,
    } as CreateEventRecord;

    if (command.registrationType === EventRegistrationType.Notice) {
      return {
        ...normalized,
        capacity_type: EventCapacityType.Unlimited,
        capacity_limit: null,
        guest_policy: null,
        waitlist_limit: null,
        registration_deadline: null,
      };
    }

    return normalized;
  }

  private buildUpdateRecord(command: UpdateEventCommand): UpdateEventRecord {
    return {
      name: command.name,
      public_description: command.publicDescription,
      member_description: command.memberDescription,
      event_date: command.eventDate,
      start_time: command.startTime,
      end_time: command.endTime,
      registration_type: command.registrationType,
      audience: command.audience,
      capacity_type: command.capacityType,
      capacity_limit: command.capacityLimit,
      guest_policy: command.guestPolicy,
      waitlist_limit: command.waitlistLimit,
      registration_deadline: command.registrationDeadline,
      status: command.status,
    };
  }

  private mergeEventForUpdate(event: EventRecord, command: UpdateEventCommand): EventRecord {
    return {
      ...event,
      name: command.name ?? event.name,
      public_description: command.publicDescription ?? event.public_description,
      member_description: command.memberDescription ?? event.member_description,
      event_date: command.eventDate ?? event.event_date,
      start_time: command.startTime ?? event.start_time,
      end_time: command.endTime ?? event.end_time,
      registration_type: command.registrationType ?? event.registration_type,
      audience: command.audience ?? event.audience,
      capacity_type: command.capacityType ?? event.capacity_type,
      capacity_limit: command.capacityLimit ?? event.capacity_limit,
      guest_policy: command.guestPolicy ?? event.guest_policy,
      waitlist_limit: command.waitlistLimit ?? event.waitlist_limit,
      registration_deadline: command.registrationDeadline ?? event.registration_deadline,
      status: command.status ?? event.status,
    };
  }

  private isStartBeforeEnd(startTime: string, endTime: string): boolean {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);

    if (
      [startHours, startMinutes, endHours, endMinutes].some((value) => Number.isNaN(value))
    ) {
      return false;
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
      return false;
    }

    if (startMinutes % 5 !== 0 || endMinutes % 5 !== 0) {
      return false;
    }

    return startHours < endHours || (startHours === endHours && startMinutes < endMinutes);
  }
}
