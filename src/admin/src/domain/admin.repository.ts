import { AuditLogEntry } from '@strzel-sobie/common';

export interface IAdminRepository {
  logAction(log: AuditLogEntry): Promise<void>;
  getRangeById(rangeId: number): Promise<{ id: number } | null>;
}