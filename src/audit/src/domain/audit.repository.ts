import { AuditLogEntry } from '@strzel-sobie/common/models';

export interface AuditRepository {
  logAction(log: AuditLogEntry): Promise<void>;
}
