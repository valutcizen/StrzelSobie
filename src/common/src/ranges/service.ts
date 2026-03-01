import { Result } from '../result';
import {
  CreateRangeCommand,
  RangeDetailsDto,
  RangeListResponseDto,
  UpdateRangeCommand,
} from './dto';
import { RangeType } from './model';
import { UserDto } from '../users/dto';

export type GetRangesOptions = {
  types?: RangeType[];
};

export interface IRangesService {
  existsRangeById(rangeId: number): Promise<Result<boolean>>;
  getRanges(options?: GetRangesOptions): Promise<Result<RangeListResponseDto>>;
  getRangeDetails(rangeSlug: string, user?: UserDto | null): Promise<Result<RangeDetailsDto>>;
  createRange(command: CreateRangeCommand, user: UserDto): Promise<Result<RangeDetailsDto>>;
  updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto
  ): Promise<Result<RangeDetailsDto>>;
  getRangeIdBySlug(rangeSlug: string): Promise<Result<number>>;
  deleteRange(rangeSlug: string, user: UserDto): Promise<Result<void>>;
}
  
