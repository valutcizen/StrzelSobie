import { IAdminService, AdminLog } from '@strzel-sobie/common';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminService implements IAdminService {
  constructor(private readonly adminRepository: IAdminRepository) {}

  async logAction(log: AdminLog): Promise<void> {
    await this.adminRepository.logAction(log);
  }
}
