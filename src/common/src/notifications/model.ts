export type NotificationChannel = 'in_app' | 'email';

export type NotificationStatus = 'queued' | 'sent' | 'failed' | 'expired';

export type NotificationType =
  | 'proposition_created_for_admin'
  | 'proposition_converted_for_member'
  | 'reservation_cancelled';
