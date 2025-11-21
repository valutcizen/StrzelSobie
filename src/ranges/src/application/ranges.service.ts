import { AuditLogEntry, IAuditService, IRangesService, UserRole } from '@strzel-sobie/common/models';
import {
  ForbiddenError,
  RangeDetailsDto,
  RangeNotFoundError,
  RangeSummaryDto,
  Result,
  UpdateRangeCommand,
  UserDto,
} from '@strzel-sobie/common';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange } from '../domain/shooting-range.model';

export class RangesService implements IRangesService {
  constructor(private readonly rangesRepository: IRangesRepository, private readonly auditService: IAuditService) {}

  public async getRanges(): Promise<Result<RangeSummaryDto[]>> {
    const result = await this.rangesRepository.findAll();

    const ranges = result.map((range: ShootingRange) => ({
      id: range.id,
      slug: range.slug,
      displayName: range.displayName,
      type: range.type,
    }));

    return Result.ok(ranges);
  }

  public async existsRangeById(rangeId: number): Promise<Result<boolean>> {
    try {
      const range = await this.rangesRepository.existsRangeById(rangeId);
      return Result.ok(range);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getRangeDetails(slug: string): Promise<Result<RangeDetailsDto>> {
    const range = await this.rangesRepository.findBySlug(slug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    try {
      const dto: RangeDetailsDto = {
        ...range,
        operatingHours: JSON.parse(range.operatingHours),
        allowsReservations: range.allowsReservations,
        publicDescription: range.publicDescription,
        memberDescription: range.memberDescription,
        latitude: range.latitude,
        longitude: range.longitude,
        type: range.type,
      };
      return Result.ok(dto);
    } catch (error) {
        return Result.fail(new Error("Failed to parse operating hours", { cause: error }));
    }
  }

  public async updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto
  ): Promise<Result<void>> {
    const range = await this.rangesRepository.findBySlug(rangeSlug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    if (!this.canManageRange(range.id, user)) {
      return Result.fail(new ForbiddenError('User is not an admin for this range'));
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

    return Result.ok(undefined);
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
}
