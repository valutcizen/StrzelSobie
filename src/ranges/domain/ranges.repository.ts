import { Result } from '@strzel-sobie/common';

export interface IRangesRepository {
  getRangeIdBySlug(slug: string): Promise<Result<string, Error>>;
}
