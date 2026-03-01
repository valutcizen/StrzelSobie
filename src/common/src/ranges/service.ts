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

export type RangeTypeChangeImpact = {
  nextType: RangeType;
  futureReservations: number;
  futureEvents: number;
  requiresConfirmation: boolean;
};

export interface IRangesService {
  existsRangeById(rangeId: number): Promise<Result<boolean>>;
  getRanges(options?: GetRangesOptions): Promise<Result<RangeListResponseDto>>;
  previewRangeTypeChange(
    rangeSlug: string,
    nextType: RangeType,
    user: UserDto
  ): Promise<Result<RangeTypeChangeImpact>>;
  getRangeDetails(rangeSlug: string, user?: UserDto | null): Promise<Result<RangeDetailsDto>>;
  createRange(command: CreateRangeCommand, user: UserDto): Promise<Result<RangeDetailsDto>>;
  updateRangeDetails(
    rangeSlug: string,
    command: UpdateRangeCommand,
    user: UserDto,
    options?: { confirmTypeChange?: boolean }
  ): Promise<Result<RangeDetailsDto>>;
  getRangeIdBySlug(rangeSlug: string): Promise<Result<number>>;
  deleteRange(rangeSlug: string, user: UserDto): Promise<Result<void>>;
}
  
