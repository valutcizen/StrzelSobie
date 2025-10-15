import { Result } from '@strzel-sobie/common/utils/result';

export interface IAdminRepository {
  getRangeIdBySlug(slug: string): Promise<Result<string, Error>>;
}
