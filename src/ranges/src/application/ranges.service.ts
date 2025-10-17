import {
  AuditLogEntry,
  IRangesService,
  RangeDetailsDto,
  RangeSummaryDto,
  Result,
  UpdateRangeCommand,
  UserDto,
  ForbiddenError,
  RangeNotFoundError,
} from '@strzel-sobie/common';
import { IRangesRepository } from '../domain/ranges.repository';
import { ShootingRange } from '../domain/shooting-range.model';

export class RangesService implements IRangesService {
  constructor(private readonly rangesRepository: IRangesRepository) {}

  public async getRanges(): Promise<Result<RangeSummaryDto[], Error>> {
    const result = await this.rangesRepository.findAll();

    const ranges = result.map((range: ShootingRange) => ({
      id: range.id,
      slug: range.slug,
      displayName: range.displayName,
    }));

    return Result.ok(ranges);
  }

  public async existsRangeById(rangeId: number): Promise<Result<boolean, Error>> {
    try {
      const range = await this.rangesRepository.existsRangeById(rangeId);
      return Result.ok(range);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getRangeDetails(slug: string): Promise<Result<RangeDetailsDto, Error>> {
    const range = await this.rangesRepository.findBySlug(slug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    const dto: RangeDetailsDto = {
      ...range,
      operatingHours: JSON.parse(range.operatingHours),
    };

    return Result.ok(dto);
  }

  public async updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto
  ): Promise<Result<void, Error>> {
    const range = await this.rangesRepository.findBySlug(rangeSlug);

    if (!range) {
      return Result.fail(new RangeNotFoundError('Range not found'));
    }

    const isGlobalAdmin = user.roles.some((role) => role.name === 'Club/Community Administrator');
    const rangeId = range.id.toString();
    const userRolesForRange = user.range_roles[rangeId] || [];
    const isRangeAdmin = userRolesForRange.some((role) => role.name === 'Range Admin');

    if (!isGlobalAdmin && !isRangeAdmin) {
      return Result.fail(new ForbiddenError('User is not an admin for this range'));
    }

    if (command.totalTracks !== undefined) {
      range.totalTracks = command.totalTracks;
    }

    if (command.operatingHours) {
      range.operatingHours = JSON.stringify(command.operatingHours);
    }

    this.rangesRepository.update(range);
    return Result.ok(undefined);
  }
}
