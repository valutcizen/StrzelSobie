import { AuditLogEntry, IAdminService } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminService implements IAdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  public async logAction(log: AuditLogEntry): Promise<void> {
    return this.adminRepository.logAction(log);
  }
}
