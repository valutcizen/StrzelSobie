import {
  AuditLogEntry,
  IAdminService,
  RangeDetailsDto,
  RangeSummaryDto,
  Result,
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
      return Result.fail(new Error('Range not found'));
    }

    const dto: RangeDetailsDto = {
      ...range,
      operatingHours: JSON.parse(range.operatingHours),
    };

    return Result.ok(dto);
  }
}
