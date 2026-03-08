import type { RangeType } from '@strzel-sobie/common';
import { FiringLine, ShootingRange, ShootingRangeSummary } from './shooting-range.model';

export interface IRangesRepository {
  findAll(options?: { types?: RangeType[] }): Promise<ShootingRangeSummary[]>;
  countFutureAvailabilityImpact(rangeId: number, fromDate: string): Promise<{ futureReservations: number; futureEvents: number }>;
  findBySlug(slug: string): Promise<ShootingRange | null>;
  findFiringLinesByRangeId(rangeId: number): Promise<FiringLine[]>;
  create(range: Omit<ShootingRange, 'id'>): Promise<ShootingRange>;
  update(range: ShootingRange): Promise<void>;
  getRangeIdBySlug(slug: string): Promise<number | null>;
  existsRangeById(id: number): Promise<boolean>;
  softDeleteById(id: number, deletedSlug: string): Promise<void>;
}
