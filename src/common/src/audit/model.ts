export type AuditActionType =
  | 'USER_REGISTRATION'
  | 'RANGE_UPDATE'
  | 'RANGE_DELETE'
  | 'PROPOSITION_CREATE'
  | 'PROPOSITION_CANCEL'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CONVERT'
  | 'RESERVATION_CANCEL'
  | 'RECORD_CREATE';

export type AuditLogEntry = {
  action_type: AuditActionType;
  target_id: number;
  details: object;
};
