import { AuditLogEntry, Result } from '@strzel-sobie/common';
import { ShootingRange } from './shooting-range.model';

export interface IRangesRepository {
  logAction(log: AuditLogEntry): Promise<void>;
  getRangeById(rangeId: number): Promise<{ id: number } | null>;
  findAll(): Promise<Result<ShootingRange[], Error>>;
  findBySlug(slug: string): Promise<ShootingRange | null>;
  update(range: ShootingRange): Promise<Result<void, Error>>;
}