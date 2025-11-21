import { Result } from '../result';
import { RangeDetailsDto, RangeSummaryDto, UpdateRangeCommand } from './dto';
import { UserDto } from '../users/dto';

export interface IRangesService {
  existsRangeById(rangeId: number): Promise<Result<boolean>>;
  getRanges(): Promise<Result<RangeSummaryDto[]>>;
  getRangeDetails(rangeSlug: string): Promise<Result<RangeDetailsDto>>;
    updateRangeDetails(
      rangeSlug: string,
      command: UpdateRangeCommand,
      user: UserDto
    ): Promise<Result<void>>;
  getRangeIdBySlug(rangeSlug: string): Promise<Result<number>>;
  deleteRange(rangeSlug: string, user: UserDto): Promise<Result<void>>;
}
  
