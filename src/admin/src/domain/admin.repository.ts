import { AuditLogEntry } from '@strzel-sobie/common';
import { Result } from '@strzel-sobie/common';
import { ShootingRange } from './shooting-range.model';

export interface IAdminRepository {
  logAction(log: AuditLogEntry): Promise<void>;
  getRangeById(rangeId: number): Promise<{ id: number } | null>;
  findAll(): Promise<Result<ShootingRange[], Error>>;
}