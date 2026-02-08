import { AuditLogEntry, IAuditService, IRangesService, UserRole } from '@strzel-sobie/common/models';
import {
  CreateRangeCommand,
  ForbiddenError,
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
  constructor(private readonly rangesRepository: IRangesRepository, private readonly auditService: IAuditService) {}

  public async getRanges(): Promise<Result<RangeListResponseDto>> {

    try {
      const data = await this.rangesRepository.findAll();

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

  public async getRangeDetails(slug: string, user: UserDto | null = null): Promise<Result<RangeDetailsDto>> {
    const range = await this.rangesRepository.findBySlug(slug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    try {
      const dto = this.buildRangeDetailsDto(range, user);

      return Result.ok(dto);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto
  ): Promise<Result<RangeDetailsDto>> {
    const range = await this.rangesRepository.findBySlug(rangeSlug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    if (!this.canManageRange(range.id, user)) {
      return Result.fail(new ForbiddenError('User is not an admin for this range'));
    }

    const nextType = command.type ?? range.type;
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

    if (command.mapLogoUrl !== undefined) {
      const extras = this.parseExtrasObject(range.extras);
      extras.mapLogoUrl =
        typeof command.mapLogoUrl === 'string' && command.mapLogoUrl.trim().length > 0
          ? command.mapLogoUrl.trim()
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
            command: command
        }
    };

    const auditResult = await this.auditService.logAction(log);
    if (!auditResult.isSuccess) {
      return Result.fail(auditResult.getError());
    }

    const dto = this.buildRangeDetailsDto(range, user);
    return Result.ok(dto);
  }

  public async createRange(command: CreateRangeCommand, user: UserDto): Promise<Result<RangeDetailsDto>> {
    if (!this.isGlobalAdmin(user)) {
      return Result.fail(new ForbiddenError('User is not allowed to create ranges'));
    }

    const existing = await this.rangesRepository.findBySlug(command.slug);
    if (existing) {
      return Result.fail(new RangeAlreadyExistsError(command.slug));
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

    const created = await this.rangesRepository.create({
      slug: command.slug.trim(),
      displayName: (command.displayName ?? command.slug).trim(),
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

    const dto = this.buildRangeDetailsDto(created, user);
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

  private parseExtras(raw: unknown): RangeExtras {
    const extras = this.parseExtrasObject(raw);
    const parkingLocation = this.parseParkingLocation(extras.parkingLocation);
    const allowMemberEvents =
      typeof extras.allowMemberEvents === 'boolean' ? extras.allowMemberEvents : undefined;
    const mapLogoUrl = this.parseOptionalString(extras.mapLogoUrl);
    const hasParkingLocation = Object.prototype.hasOwnProperty.call(extras, 'parkingLocation');
    const hasMapLogo = Object.prototype.hasOwnProperty.call(extras, 'mapLogoUrl');

    return {
      ...(parkingLocation ? { parkingLocation } : hasParkingLocation ? { parkingLocation: null } : {}),
      ...(allowMemberEvents !== undefined ? { allowMemberEvents } : {}),
      ...(mapLogoUrl !== undefined ? { mapLogoUrl } : hasMapLogo ? { mapLogoUrl: null } : {}),
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
