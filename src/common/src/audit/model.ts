export type AuditActionType =
  | 'USER_REGISTRATION'
  | 'RANGE_UPDATE'
  | 'RANGE_CREATE'
  | 'RANGE_DELETE'
  | 'EVENT_CREATE'
  | 'EVENT_UPDATE'
  | 'EVENT_CANCEL'
  | 'EVENT_SIGNUP_CREATE'
  | 'EVENT_SIGNUP_UPDATE'
  | 'EVENT_SIGNUP_CANCEL'
  | 'PROPOSITION_CREATE'
  | 'PROPOSITION_CANCEL'
  | 'RESERVATION_CREATE'
  | 'RESERVATION_CONVERT'
  | 'RESERVATION_CANCEL'
  | 'RECORD_CREATE'
  | 'USER_DELETED';

export type AuditLogEntry = {
  action_type: AuditActionType;
  target_id: number;
  details: object;
};
