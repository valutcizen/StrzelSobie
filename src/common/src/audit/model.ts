export type AuditLogEntry = {
    action_type: 'USER_REGISTRATION' | 'RANGE_UPDATE' | 'PROPOSITION_CREATE';
    target_id: number;
    details: object;
  };
