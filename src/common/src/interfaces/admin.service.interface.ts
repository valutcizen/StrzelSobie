import { Result } from '../utils/result';
import { RangeDetailsDto, RangeSummaryDto, UpdateRangeCommand } from '../dto/ranges.dto';
import { UserDto } from '../dto/users.dto';

export type AuditLogEntry = {
  action_type: 'USER_REGISTRATION';
  target_id: number;
  details: {
    email: string;
    sourceIp: string;
    proxiedIp: string;
  };
};

export interface IAdminService {
  logAction(log: AuditLogEntry): Promise<void>;
  getRangeById(rangeId: number): Promise<Result<{ id: number } | null, Error>>;
  getRanges(): Promise<Result<RangeSummaryDto[], Error>>;
  getRangeDetails(rangeSlug: string): Promise<Result<RangeDetailsDto | null, Error>>;
    updateRangeDetails(
      rangeSlug: string,
      command: UpdateRangeCommand,
      user: UserDto
    ): Promise<Result<void, Error>>;
  }
  