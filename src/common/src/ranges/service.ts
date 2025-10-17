import { Result } from '../result';
import { RangeDetailsDto, RangeSummaryDto, UpdateRangeCommand } from './dto';
import { UserDto } from '../users/dto';

export interface IRangesService {
  existsRangeById(rangeId: number): Promise<Result<boolean, Error>>;
  getRanges(): Promise<Result<RangeSummaryDto[], Error>>;
  getRangeDetails(rangeSlug: string): Promise<Result<RangeDetailsDto, Error>>;
    updateRangeDetails(
      rangeSlug: string,
      command: UpdateRangeCommand,
      user: UserDto
    ): Promise<Result<void, Error>>;
  }
  