import { Result } from '@strzel-sobie/common/utils/result';
import { IAdminRepository } from '../domain/admin.repository';

export class AdminDbRepository implements IAdminRepository {
  public async getRangeIdBySlug(slug: string): Promise<Result<string, Error>> {
    // This is a placeholder implementation.
    // In a real scenario, this would query the database.
    if (slug === 'example-range') {
      return Result.ok('1');
    }
    return Result.err(new Error('Range not found'));
  }
}
