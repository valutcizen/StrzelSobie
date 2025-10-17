export type AuditActionType =
  | 'USER_REGISTRATION'
  | 'RANGE_UPDATE'
  | 'PROPOSITION_CREATE'
  | 'PROPOSITION_CANCEL'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CONVERT'
  | 'RESERVATION_CANCEL';

export type AuditLogEntry = {
  action_type: AuditActionType;
  target_id: number;
  details: object;
};
