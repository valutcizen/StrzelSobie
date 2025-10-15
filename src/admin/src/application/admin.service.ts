import {
  AuditLogEntry,
  IAdminService,
  RangeDetailsDto,
  RangeSummaryDto,
  Result,
  UpdateRangeCommand,
  UserDto,
  ForbiddenError,
  RangeNotFoundError,
} from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';
import { ShootingRange } from '../domain/shooting-range.model';

export class AdminService implements IAdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  public async getRanges(): Promise<Result<RangeSummaryDto[], Error>> {
    const result = await this.adminRepository.findAll();

    if (!result.isSuccess) {
      return Result.fail(result.getError());
    }

    const ranges = result.getValue().map((range: ShootingRange) => ({
      id: range.id,
      slug: range.slug,
      displayName: range.displayName,
    }));

    return Result.ok(ranges);
  }

  public async logAction(log: AuditLogEntry): Promise<void> {
    return this.adminRepository.logAction(log);
  }

  public async getRangeById(rangeId: number): Promise<Result<{ id: number } | null, Error>> {
    try {
      const range = await this.adminRepository.getRangeById(rangeId);
      return Result.ok(range);
    } catch (error) {
      return Result.fail(error as Error);
    }
  }

  public async getRangeDetails(slug: string): Promise<Result<RangeDetailsDto, Error>> {
    const range = await this.adminRepository.findBySlug(slug);

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
    const range = await this.adminRepository.findBySlug(rangeSlug);

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

    return this.adminRepository.update(range);
  }
}
