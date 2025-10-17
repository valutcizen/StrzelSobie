import { AuditLogEntry } from "./model";
import { Result } from "../result";

export interface IAuditService {
    logAction(log: AuditLogEntry): Promise<Result<void, Error>>;
}