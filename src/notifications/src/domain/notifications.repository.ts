import { NotificationChannel, NotificationStatus, NotificationType } from '@strzel-sobie/common/models';

export type NotificationMessageRecord = {
  recipient_user_id: number;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload_json: string;
  expires_at: string;
};

export type NotificationMessageEntity = {
  id: number;
  recipient_user_id: number;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  payload_json: string;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  expires_at: string | null;
};

export type NotificationDeliveryAttemptRecord = {
  message_id: number;
  provider: string | null;
  status: NotificationStatus;
  error: string | null;
};

export interface INotificationsRepository {
  createMessage(record: NotificationMessageRecord): Promise<NotificationMessageEntity>;
  updateMessageStatus(
    messageId: number,
    status: NotificationStatus,
    sentAt?: string | null
  ): Promise<void>;
  createDeliveryAttempt(record: NotificationDeliveryAttemptRecord): Promise<void>;
  getUserEmail(userId: number): Promise<string | null>;
  countFailedEmailMessagesToExpire(cutoffIso: string): Promise<number>;
  expireMessagesBefore(cutoffIso: string): Promise<number>;
}
