export type AuditLogEntry = {
    action_type: 'USER_REGISTRATION' | 'RANGE_UPDATE';
    target_id: number;
    details: object;
  };