import { Result } from '../utils/result';
import { RangeSummaryDto } from '../dto/ranges.dto';

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
    getRangeById(rangeId: number): Promise<Result<{
        id: number;
    } | null, Error>>;
    getRanges(): Promise<Result<RangeSummaryDto[], Error>>;
}
//# sourceMappingURL=admin.service.interface.d.ts.map