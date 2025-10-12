import { AuditLog } from '@strzel-sobie/common';

export interface IAdminRepository {
  logAction(log: AuditLog): Promise<void>;
}