import { AuditLogEntry, IAuditService, IRangesService, UserRole } from '@strzel-sobie/common/models';
import {
  CreateRangeCommand,
  ForbiddenError,
  InvalidRangeSlugError,
  RangeType,
  RangeTypeChangeImpact,
  RangeTypeChangeConfirmationRequiredError,
  isValidRangeSlug,
  RangeAlreadyExistsError,
  RangeListResponseDto,
  RangeDetailsDto,
  RangeExtras,
  RangeParkingLocation,
  RangeNotFoundError,
  RangeSummaryDto,
  Result,
  UpdateRangeCommand,
  UserDto,
} from '@strzel-sobie/common';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange, ShootingRangeSummary } from '../domain/shooting-range.model';

// Default location: Warsaw Central Railway Station.
const DEFAULT_RANGE_COORDINATES = {
  latitude: 52.2285,
  longitude: 21.0037,
};
const DEFAULT_TOTAL_TRACKS = 1;

export class RangesService implements IRangesService {
  constructor(
    private readonly rangesRepository: IRangesRepository,
    private readonly auditService: IAuditService,
    private readonly resolveAdministratorContacts?: (
      rangeId: number,
      viewer: UserDto
    ) => Promise<Result<Array<{ userId: number; email: string | null; phoneNumber: string | null; displayName: string | null }>>>
  ) {}

  public async getRanges(options?: { types?: Array<ShootingRange['type']> }): Promise<Result<RangeListResponseDto>> {

    try {
      const data = await this.rangesRepository.findAll({ types: options?.types });

      const ranges = data.map((range: ShootingRangeSummary) => {
        const base: RangeSummaryDto = {
          id: range.id,
          slug: range.slug,
          displayName: range.displayName,
          type: range.type,
          allowsReservations: range.allowsReservations,
          latitude: range.latitude,
          longitude: range.longitude,
          extras: this.parseExtras(range.extras),
        };
        return base;
      });

      return Result.ok(ranges);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async existsRangeById(rangeId: number): Promise<Result<boolean>> {
    try {
      const range = await this.rangesRepository.existsRangeById(rangeId);
      return Result.ok(range);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async previewRangeTypeChange(
    rangeSlug: string,
    nextType: RangeType,
    user: UserDto,
  ): Promise<Result<RangeTypeChangeImpact>> {
    const range = await this.rangesRepository.findBySlug(rangeSlug);
    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    if (!this.canManageRange(range.id, user)) {
      return Result.fail(new ForbiddenError('User is not an admin for this range'));
    }

    if (range.type === nextType) {
      return Result.ok({
        nextType,
        futureReservations: 0,
        futureEvents: 0,
        requiresConfirmation: false,
      });
    }

    const today = new Date().toISOString().slice(0, 10);
    const impact = await this.rangesRepository.countFutureAvailabilityImpact(range.id, today);
    const requiresConfirmation = impact.futureReservations > 0 || impact.futureEvents > 0;

    return Result.ok({
      nextType,
      futureReservations: impact.futureReservations,
      futureEvents: impact.futureEvents,
      requiresConfirmation,
    });
  }

  public async getRangeDetails(slug: string, user: UserDto | null = null): Promise<Result<RangeDetailsDto>> {
    const range = await this.rangesRepository.findBySlug(slug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    try {
      const firingLines = await this.getRangeFiringLines(range.id);
      const administratorContacts = await this.getAdministratorContacts(range.id, user);
      const dto = this.buildRangeDetailsDto(range, firingLines, administratorContacts, user);

      return Result.ok(dto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto,
    options?: { confirmTypeChange?: boolean }
  ): Promise<Result<RangeDetailsDto>> {
    const range = await this.rangesRepository.findBySlug(rangeSlug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    if (!this.canManageRange(range.id, user)) {
      return Result.fail(new ForbiddenError('User is not an admin for this range'));
    }

    const previousType = range.type;
    const nextType = command.type ?? range.type;
    const isTypeChanging = nextType !== range.type;
    let typeChangeImpact: RangeTypeChangeImpact | null = null;

    if (isTypeChanging) {
      const preview = await this.previewRangeTypeChange(rangeSlug, nextType, user);
      if (!preview.isSuccess) {
        return Result.fail(preview.getError());
      }
      typeChangeImpact = preview.getValue();
      if (typeChangeImpact.requiresConfirmation && !options?.confirmTypeChange) {
        return Result.fail(new RangeTypeChangeConfirmationRequiredError({
          nextType,
          futureReservations: typeChangeImpact.futureReservations,
          futureEvents: typeChangeImpact.futureEvents,
        }));
      }
    }

    let droppedData: Record<string, unknown> | undefined;
    if (isTypeChanging) {
      droppedData = {
        allowsReservations: range.allowsReservations,
        publicDescription: range.publicDescription ?? null,
        memberDescription: range.memberDescription ?? null,
        totalTracks: range.totalTracks ?? null,
        operatingHours: this.parseOperatingHours(range.operatingHours),
        extras: this.parseExtrasObject(range.extras),
      };

      range.publicDescription = null;
      range.memberDescription = null;
      range.totalTracks = null;
      range.operatingHours = '{}';
      range.extras = '{}';
    }

    const nextAllowsReservations =
      nextType === 'club'
        ? command.allowsReservations ?? range.allowsReservations ?? true
        : false;

    range.type = nextType;
    range.allowsReservations = nextAllowsReservations;

    if (command.displayName !== undefined) {
      range.displayName = command.displayName;
    }

    if (command.publicDescription !== undefined) {
      range.publicDescription = command.publicDescription;
    }

    if (command.memberDescription !== undefined) {
      range.memberDescription = command.memberDescription;
    }

    if (command.latitude !== undefined) {
      range.latitude = command.latitude ?? null;
    }

    if (command.longitude !== undefined) {
      range.longitude = command.longitude ?? null;
    }

    if (command.parkingLocation !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.parkingLocation = command.parkingLocation
        ? {
            latitude: command.parkingLocation.latitude,
            longitude: command.parkingLocation.longitude,
          }
        : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.allowMemberEvents !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.allowMemberEvents = command.allowMemberEvents;
      range.extras = JSON.stringify(extras);
    }

    if (command.approximateLocation !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.approximateLocation = command.approximateLocation;
      range.extras = JSON.stringify(extras);
    }

    if (command.mapLogoUrl !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.mapLogoUrl =
        typeof command.mapLogoUrl === 'string' && command.mapLogoUrl.trim().length > 0
          ? command.mapLogoUrl.trim()
          : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.voivodeship !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.voivodeship =
        typeof command.voivodeship === 'string' && command.voivodeship.trim().length > 0
          ? command.voivodeship.trim()
          : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.address !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.address =
        typeof command.address === 'string' && command.address.trim().length > 0
          ? command.address.trim()
          : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.phone !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.phone =
        typeof command.phone === 'string' && command.phone.trim().length > 0
          ? command.phone.trim()
          : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.details !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.details =
        typeof command.details === 'string' && command.details.trim().length > 0
          ? command.details.trim()
          : null;
      range.extras = JSON.stringify(extras);
    }

    if (command.totalTracks !== undefined) {
      range.totalTracks = command.totalTracks;
    }

    if (command.operatingHours) {
      range.operatingHours = JSON.stringify(command.operatingHours);
    }

    await this.rangesRepository.update(range);

    const log: AuditLogEntry = {
        action_type: 'RANGE_UPDATE',
        target_id: range.id,
        details: {
            user: user,
            command: command,
            ...(isTypeChanging
              ? {
                  typeChange: {
                    previousType,
                    nextType,
                    droppedData: droppedData ?? {},
                    confirmationAccepted: options?.confirmTypeChange ?? false,
                    impact: typeChangeImpact,
                  },
                }
              : {}),
        }
    };

    const auditResult = await this.auditService.logAction(log);
    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    const updatedFiringLines = await this.getRangeFiringLines(range.id);
    const dto = this.buildRangeDetailsDto(range, updatedFiringLines, [], user);
    return Result.ok(dto);
  }

  public async createRange(command: CreateRangeCommand, user: UserDto): Promise<Result<RangeDetailsDto>> {
    if (!this.isGlobalAdmin(user)) {
      return Result.fail(new ForbiddenError('User is not allowed to create ranges'));
    }

    const normalizedSlug = command.slug.trim();
    if (!isValidRangeSlug(normalizedSlug)) {
      return Result.fail(new InvalidRangeSlugError());
    }

    const existing = await this.rangesRepository.findBySlug(normalizedSlug);
    if (existing) {
      return Result.fail(new RangeAlreadyExistsError(normalizedSlug));
    }

    const normalizedType = command.type ?? 'club';
    const allowsReservations = normalizedType === 'club' ? command.allowsReservations ?? true : false;
    const operatingHours = command.operatingHours ? JSON.stringify(command.operatingHours) : '{}';
    const extras: RangeExtras = {};
    if (typeof command.mapLogoUrl === 'string' && command.mapLogoUrl.trim().length > 0) {
      extras.mapLogoUrl = command.mapLogoUrl.trim();
    } else if (command.mapLogoUrl === null) {
      extras.mapLogoUrl = null;
    }
    if (typeof command.voivodeship === 'string' && command.voivodeship.trim().length > 0) {
      extras.voivodeship = command.voivodeship.trim();
    } else if (command.voivodeship === null) {
      extras.voivodeship = null;
    }
    if (command.approximateLocation !== undefined) {
      extras.approximateLocation = command.approximateLocation;
    }

    const created = await this.rangesRepository.create({
      slug: normalizedSlug,
      displayName: (command.displayName ?? normalizedSlug).trim(),
      type: normalizedType,
      allowsReservations,
      isDeleted: false,
      publicDescription: command.publicDescription ?? null,
      memberDescription: command.memberDescription ?? null,
      latitude: command.latitude ?? DEFAULT_RANGE_COORDINATES.latitude,
      longitude: command.longitude ?? DEFAULT_RANGE_COORDINATES.longitude,
      totalTracks: command.totalTracks ?? DEFAULT_TOTAL_TRACKS,
      operatingHours,
      extras: JSON.stringify(extras),
    });

    const log: AuditLogEntry = {
      action_type: 'RANGE_CREATE',
      target_id: created.id,
      details: {
        user,
        command,
      },
    };

    const auditResult = await this.auditService.logAction(log);
    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    const createdFiringLines = await this.getRangeFiringLines(created.id);
    const dto = this.buildRangeDetailsDto(created, createdFiringLines, [], user);
    return Result.ok(dto);
  }

  public async getRangeIdBySlug(rangeSlug: string): Promise<Result<number>> {
    try {
      const rangeId = await this.rangesRepository.getRangeIdBySlug(rangeSlug);
      if (rangeId)
        return Result.ok(rangeId);
      return Result.fail(new RangeNotFoundError("Range not found"));
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async deleteRange(rangeSlug: string, user: UserDto): Promise<Result<void>> {
    try {
      const range = await this.rangesRepository.findBySlug(rangeSlug);

      if (!range) {
        return Result.fail(new RangeNotFoundError('Range not found'));
      }

      if (!this.canManageRange(range.id, user)) {
        return Result.fail(new ForbiddenError('User is not an admin for this range'));
      }

      const deletedSlug = `${range.slug}__deleted_${Date.now()}`;
      await this.rangesRepository.softDeleteById(range.id, deletedSlug);

      const auditResult = await this.auditService.logAction({
        action_type: 'RANGE_DELETE',
        target_id: range.id,
        details: {
          userId: user.id,
          rangeSlug,
          newSlug: deletedSlug,
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

  private canManageRange(rangeId: number, user: UserDto): boolean {
    const globalRoles = user.roles.map((role) => role.name);
    if (globalRoles.includes(UserRole.ClubCommunityAdministrator)) {
      return true;
    }

    const rangeRoles = user.rangeRoles[String(rangeId)] ?? [];
    const rangeRoleNames = rangeRoles.map((role) => role.name);
    return rangeRoleNames.includes(UserRole.ShootingRangeAdministrator) || rangeRoleNames.includes('Range Admin');
  }

  private buildRangeDetailsDto(
    range: ShootingRange,
    firingLines: Array<{
      id: number;
      name: string;
      tracksCount: number;
      lengthMeters: number | null;
      sortOrder: number;
    }>,
    administratorContacts: Array<{
      userId: number;
      email: string | null;
      phoneNumber: string | null;
      displayName: string | null;
    }>,
    user: UserDto | null = null
  ): RangeDetailsDto {
    const operatingHours = this.parseOperatingHours(range.operatingHours);
    const extras = this.parseExtras(range.extras);
    const parkingLocation = extras.parkingLocation ?? null;

    const dto: RangeDetailsDto = {
      id: range.id,
      slug: range.slug,
      displayName: range.displayName,
      type: range.type,
      allowsReservations: range.allowsReservations,
      isDeleted: range.isDeleted,
      publicDescription: range.publicDescription ?? null,
      memberDescription: this.getMemberDescription(range, user),
      latitude: range.latitude,
      longitude: range.longitude,
      totalTracks: range.totalTracks,
      operatingHours,
      extras,
      parkingLocation,
      firingLines: firingLines.map((line) => ({
        id: line.id,
        name: line.name,
        tracksCount: line.tracksCount,
        lengthMeters: line.lengthMeters,
        sortOrder: line.sortOrder,
      })),
      administratorContacts,
    };

    return dto;
  }

  private getMemberDescription(
    range: ShootingRange,
    user: UserDto | null
  ): string | null {
    if (!user) {
      return null;
    }

    const isMember = user.roles.some((role) => role.name === UserRole.Member);
    const isRangeAdmin = this.canManageRange(range.id, user);
    if (isMember || isRangeAdmin) {
      return range.memberDescription ?? null;
    }

    return null;
  }

  private isGlobalAdmin(user: UserDto): boolean {
    const globalRoles = user.roles.map((role) => role.name);
    return globalRoles.includes(UserRole.ClubCommunityAdministrator);
  }

  private async getRangeFiringLines(
    rangeId: number
  ): Promise<Array<{ id: number; name: string; tracksCount: number; lengthMeters: number | null; sortOrder: number }>> {
    const repositoryWithLines = this.rangesRepository as IRangesRepository & {
      findFiringLinesByRangeId?: (
        id: number
      ) => Promise<Array<{ id: number; name: string; tracksCount: number; lengthMeters: number | null; sortOrder: number }>>;
    };

    if (typeof repositoryWithLines.findFiringLinesByRangeId !== 'function') {
      return [];
    }

    return repositoryWithLines.findFiringLinesByRangeId(rangeId);
  }

  private async getAdministratorContacts(
    rangeId: number,
    user: UserDto | null
  ): Promise<Array<{ userId: number; email: string | null; phoneNumber: string | null; displayName: string | null }>> {
    if (!user || !this.resolveAdministratorContacts) {
      return [];
    }

    const userRoleNames = new Set(user.roles.map((role) => role.name));
    const rangeRoleNames = new Set((user.rangeRoles[String(rangeId)] ?? []).map((role) => role.name));
    const isMemberOrHigher =
      userRoleNames.has(UserRole.Member) ||
      userRoleNames.has(UserRole.Coordinator) ||
      userRoleNames.has(UserRole.Confirmator) ||
      userRoleNames.has(UserRole.ClubCommunityAdministrator) ||
      rangeRoleNames.has(UserRole.Member) ||
      rangeRoleNames.has(UserRole.Coordinator) ||
      rangeRoleNames.has(UserRole.ShootingRangeAdministrator);
    if (!isMemberOrHigher) {
      return [];
    }

    const result = await this.resolveAdministratorContacts(rangeId, user);
    return result.isSuccess ? result.getValue() : [];
  }

  private parseExtras(raw: unknown): RangeExtras {
    const extras = this.parseExtrasObject(raw);
    const parkingLocation = this.parseParkingLocation(extras.parkingLocation);
    const allowMemberEvents =
      typeof extras.allowMemberEvents === 'boolean' ? extras.allowMemberEvents : undefined;
    const approximateLocation =
      typeof extras.approximateLocation === 'boolean' ? extras.approximateLocation : undefined;
    const mapLogoUrl = this.parseOptionalString(extras.mapLogoUrl);
    const voivodeship = this.parseOptionalString(extras.voivodeship);
    const address = this.parseOptionalString(extras.address);
    const phone = this.parseOptionalString(extras.phone);
    const details = this.parseOptionalString(extras.details);
    const hasParkingLocation = Object.prototype.hasOwnProperty.call(extras, 'parkingLocation');
    const hasMapLogo = Object.prototype.hasOwnProperty.call(extras, 'mapLogoUrl');
    const hasVoivodeship = Object.prototype.hasOwnProperty.call(extras, 'voivodeship');
    const hasAddress = Object.prototype.hasOwnProperty.call(extras, 'address');
    const hasPhone = Object.prototype.hasOwnProperty.call(extras, 'phone');
    const hasDetails = Object.prototype.hasOwnProperty.call(extras, 'details');

    return {
      ...(parkingLocation ? { parkingLocation } : hasParkingLocation ? { parkingLocation: null } : {}),
      ...(allowMemberEvents !== undefined ? { allowMemberEvents } : {}),
      ...(approximateLocation !== undefined ? { approximateLocation } : {}),
      ...(mapLogoUrl !== undefined ? { mapLogoUrl } : hasMapLogo ? { mapLogoUrl: null } : {}),
      ...(voivodeship !== undefined ? { voivodeship } : hasVoivodeship ? { voivodeship: null } : {}),
      ...(address !== undefined ? { address } : hasAddress ? { address: null } : {}),
      ...(phone !== undefined ? { phone } : hasPhone ? { phone: null } : {}),
      ...(details !== undefined ? { details } : hasDetails ? { details: null } : {}),
    };
  }

  private parseExtrasObject(raw: unknown): Record<string, unknown> {
    if (!raw) {
      return {};
    }

    const source =
      typeof raw === 'string'
        ? raw
        : typeof raw === 'object' && !Array.isArray(raw)
          ? JSON.stringify(raw)
          : null;

    if (!source) {
      return {};
    }

    try {
      const parsed = JSON.parse(source);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }

    return {};
  }

  private parseParkingLocation(raw: unknown): RangeParkingLocation | null {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return null;
    }

    const { latitude, longitude } = raw as { latitude?: unknown; longitude?: unknown };
    const lat = this.parseCoordinate(latitude);
    const lng = this.parseCoordinate(longitude);

    if (lat === null || lng === null) {
      return null;
    }

    return { latitude: lat, longitude: lng };
  }

  private parseCoordinate(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim().length > 0) {
      const numeric = Number(value);
      return Number.isFinite(numeric) ? numeric : null;
    }

    if (value === undefined || value === null) {
      return null;
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  private parseOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private parseOperatingHours(raw: unknown): Record<string, { open: string; close: string } | null> {
    if (!raw) {
      return {};
    }

    const source =
      typeof raw === 'string'
        ? raw
        : typeof raw === 'object' && !Array.isArray(raw)
          ? JSON.stringify(raw)
          : null;

    if (!source) {
      return {};
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(source);
    } catch {
      return {};
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }

    return Object.entries(parsed as Record<string, unknown>).reduce(
      (acc, [day, value]) => {
        if (value === null) {
          acc[day] = null;
          return acc;
        }

        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const entry = value as { open?: string; close?: string };
          const openValue = entry.open ?? '';
          const closeValue = entry.close ?? '';
          const isClosed =
            String(openValue).toLowerCase() === 'closed' ||
            String(closeValue).toLowerCase() === 'closed';

          acc[day] = isClosed
            ? null
            : { open: String(openValue), close: String(closeValue) };
          return acc;
        }

        acc[day] = null;
        return acc;
      },
      {} as Record<string, { open: string; close: string } | null>,
    );
  }
}
