import { AuditLogEntry, IAuditService, IRangesService } from '@strzel-sobie/common/models';
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

    const isGlobalAdmin = user.roles.some((role) => role.name === 'Club/Community Administrator');
    const rangeId = range.id.toString();
    const userRolesForRange = user.rangeRoles[rangeId] || [];
    const isRangeAdmin = userRolesForRange.some((role) =>
      ['Range Admin', 'Shooting Range Administrator'].includes(role.name)
    );

    if (!isGlobalAdmin && !isRangeAdmin) {
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

    await this.auditService.logAction(log);

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
}
