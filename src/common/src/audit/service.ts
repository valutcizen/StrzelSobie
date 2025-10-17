import { AuditLogEntry } from "./model";

export interface IAuditService {
    logAction(log: AuditLogEntry): Promise<void>;
}