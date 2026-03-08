import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { NotificationsDbRepository } from '../../src/notifications/src/infrastructure/notifications.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

describe('NotificationsDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: NotificationsDbRepository;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new NotificationsDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('createMessage inserts notification row', async () => {
    const created = await repository.createMessage({
      recipient_user_id: 2,
      type: 'proposition_created_for_admin',
      channel: 'in_app',
      status: 'queued',
      payload_json: JSON.stringify({ propositionId: 10 }),
      expires_at: '2030-01-01T00:00:00.000Z',
    });

    expect(created).toMatchObject({
      id: expect.any(Number),
      recipient_user_id: 2,
      channel: 'in_app',
      status: 'queued',
    });
  });

  it('updateMessageStatus updates status and sent_at', async () => {
    const message = await repository.createMessage({
      recipient_user_id: 2,
      type: 'proposition_created_for_admin',
      channel: 'email',
      status: 'queued',
      payload_json: JSON.stringify({ propositionId: 11 }),
      expires_at: '2030-01-01T00:00:00.000Z',
    });

    const sentAt = '2026-03-08T00:00:00.000Z';
    await repository.updateMessageStatus(message.id, 'sent', sentAt);

    const stored = await dbHandle.d1
      .prepare('SELECT status, sent_at FROM notifications_messages WHERE id = ?')
      .bind(message.id)
      .first<{ status: string; sent_at: string | null }>();
    expect(stored).toEqual({ status: 'sent', sent_at: sentAt });
  });

  it('createDeliveryAttempt inserts attempt row', async () => {
    const message = await repository.createMessage({
      recipient_user_id: 2,
      type: 'reservation_cancelled',
      channel: 'email',
      status: 'queued',
      payload_json: JSON.stringify({ reservationId: 22 }),
      expires_at: '2030-01-01T00:00:00.000Z',
    });

    await repository.createDeliveryAttempt({
      message_id: message.id,
      provider: 'test-provider',
      status: 'failed',
      error: 'smtp timeout',
    });

    const attempt = await dbHandle.d1
      .prepare('SELECT provider, status, error FROM notifications_delivery_attempts WHERE message_id = ?')
      .bind(message.id)
      .first<{ provider: string | null; status: string; error: string | null }>();
    expect(attempt).toEqual({
      provider: 'test-provider',
      status: 'failed',
      error: 'smtp timeout',
    });
  });

  it('getUserEmail resolves recipient email', async () => {
    const email = await repository.getUserEmail(2);
    expect(email).toBe('coordinator@example.com');
  });

  it('countFailedEmailMessagesToExpire and expireMessagesBefore process expired rows', async () => {
    const cutoff = '2026-03-08T00:00:00.000Z';

    const failedToExpire = await repository.createMessage({
      recipient_user_id: 2,
      type: 'proposition_created_for_admin',
      channel: 'email',
      status: 'failed',
      payload_json: '{}',
      expires_at: '2026-03-01T00:00:00.000Z',
    });
    await repository.createMessage({
      recipient_user_id: 2,
      type: 'proposition_created_for_admin',
      channel: 'email',
      status: 'failed',
      payload_json: '{}',
      expires_at: '2026-04-01T00:00:00.000Z',
    });
    const queuedToExpire = await repository.createMessage({
      recipient_user_id: 2,
      type: 'reservation_cancelled',
      channel: 'in_app',
      status: 'queued',
      payload_json: '{}',
      expires_at: '2026-02-28T00:00:00.000Z',
    });

    const failedCount = await repository.countFailedEmailMessagesToExpire(cutoff);
    expect(failedCount).toBe(1);

    const expiredCount = await repository.expireMessagesBefore(cutoff);
    expect(expiredCount).toBe(2);

    const storedFailed = await dbHandle.d1
      .prepare('SELECT status FROM notifications_messages WHERE id = ?')
      .bind(failedToExpire.id)
      .first<{ status: string }>();
    const storedQueued = await dbHandle.d1
      .prepare('SELECT status FROM notifications_messages WHERE id = ?')
      .bind(queuedToExpire.id)
      .first<{ status: string }>();

    expect(storedFailed?.status).toBe('expired');
    expect(storedQueued?.status).toBe('expired');
  });
});
