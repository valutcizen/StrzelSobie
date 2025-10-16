import { AuditLogEntry } from '@strzel-sobie/common';

export interface AuditRepository {
  logAction(log: AuditLogEntry): Promise<void>;
}
