import { IDatabase } from '@strzel-sobie/common/models';
import {
  INotificationsRepository,
  NotificationDeliveryAttemptRecord,
  NotificationMessageEntity,
  NotificationMessageRecord,
} from '../domain/notifications.repository';

export class NotificationsDbRepository implements INotificationsRepository {
  constructor(private readonly db: IDatabase) {}

  public async createMessage(record: NotificationMessageRecord): Promise<NotificationMessageEntity> {
    const created = await this.db
      .prepare(
        `INSERT INTO notifications_messages
          (recipient_user_id, type, channel, status, payload_json, expires_at)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING
           id,
           recipient_user_id,
           type,
           channel,
           status,
           payload_json,
           created_at,
           updated_at,
           sent_at,
           expires_at`
      )
      .bind(
        record.recipient_user_id,
        record.type,
        record.channel,
        record.status,
        record.payload_json,
        record.expires_at
      )
      .first<NotificationMessageEntity>();

    if (!created) {
      throw new Error('Failed to create notification message');
    }
    return created;
  }

  public async updateMessageStatus(
    messageId: number,
    status: NotificationMessageEntity['status'],
    sentAt?: string | null
  ): Promise<void> {
    await this.db
      .prepare(
        `UPDATE notifications_messages
         SET status = ?, sent_at = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`
      )
      .bind(status, sentAt ?? null, messageId)
      .run();
  }

  public async createDeliveryAttempt(record: NotificationDeliveryAttemptRecord): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO notifications_delivery_attempts
          (message_id, provider, status, error)
         VALUES (?, ?, ?, ?)`
      )
      .bind(record.message_id, record.provider, record.status, record.error)
      .run();
  }

  public async getUserEmail(userId: number): Promise<string | null> {
    const row = await this.db
      .prepare(
        `SELECT email
         FROM users_users
         WHERE id = ?
         LIMIT 1`
      )
      .bind(userId)
      .first<{ email: string | null }>();

    return row?.email ?? null;
  }

  public async countFailedEmailMessagesToExpire(cutoffIso: string): Promise<number> {
    const row = await this.db
      .prepare(
        `SELECT COUNT(*) AS count
         FROM notifications_messages
         WHERE channel = 'email'
           AND status = 'failed'
           AND expires_at IS NOT NULL
           AND expires_at <= ?`
      )
      .bind(cutoffIso)
      .first<{ count: number }>();

    return Number(row?.count ?? 0);
  }

  public async expireMessagesBefore(cutoffIso: string): Promise<number> {
    const result = await this.db
      .prepare(
        `UPDATE notifications_messages
         SET status = 'expired', updated_at = CURRENT_TIMESTAMP
         WHERE status IN ('queued', 'failed', 'sent')
           AND expires_at IS NOT NULL
           AND expires_at <= ?`
      )
      .bind(cutoffIso)
      .run();

    return Number((result as { changes?: number } | undefined)?.changes ?? 0);
  }
}
