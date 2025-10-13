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
}
