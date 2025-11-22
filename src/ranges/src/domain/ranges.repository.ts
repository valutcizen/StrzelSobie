import { ShootingRange, ShootingRangeSummary } from './shooting-range.model';

export interface IRangesRepository {
  findAll(): Promise<ShootingRangeSummary[]>;
  findBySlug(slug: string): Promise<ShootingRange | null>;
  update(range: ShootingRange): Promise<void>;
  getRangeIdBySlug(slug: string): Promise<number | null>;
  existsRangeById(id: number): Promise<boolean>;
  softDeleteById(id: number, deletedSlug: string): Promise<void>;
}
