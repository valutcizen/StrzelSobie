export type AuditLogEntry = {
    action_type: 'USER_REGISTRATION' | 'RANGE_UPDATE' | 'PROPOSITION_CREATE' | 'PROPOSITION_CANCEL';
    target_id: number;
    details: object;
  };
