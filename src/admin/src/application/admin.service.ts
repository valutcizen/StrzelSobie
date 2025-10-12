import { AuditLog, IAdminService } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminService implements IAdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  public async logAction(log: AuditLog): Promise<void> {
    return this.adminRepository.logAction(log);
  }
}