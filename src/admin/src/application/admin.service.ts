import { AuditLogEntry, IAdminService, Result } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminService implements IAdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

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
}
