import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import worker from '../../../src/worker/src';
import { createTestDatabase, type TestDatabase } from '../../utils/database';

describe('Worker scheduled notifications cleanup integration', () => {
  let dbHandle: TestDatabase;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('scheduled handler expires old notifications and keeps future ones', async () => {
    await dbHandle.d1
      .prepare(
        `INSERT INTO notifications_messages
          (recipient_user_id, type, channel, status, payload_json, expires_at)
         VALUES
          (2, 'proposition_created_for_admin', 'email', 'failed', '{}', '2020-01-01T00:00:00.000Z'),
          (2, 'proposition_created_for_admin', 'in_app', 'queued', '{}', '2999-01-01T00:00:00.000Z')`
      )
      .run();

    await worker.scheduled?.({} as any, {
      DB: dbHandle.db as any,
      SESSIONS_KV: {} as any,
    }, {} as any);

    const rows = await dbHandle.d1
      .prepare('SELECT channel, status, expires_at FROM notifications_messages ORDER BY id ASC')
      .all<{ channel: string; status: string; expires_at: string }>();

    expect(rows.results).toEqual([
      {
        channel: 'email',
        status: 'expired',
        expires_at: '2020-01-01T00:00:00.000Z',
      },
      {
        channel: 'in_app',
        status: 'queued',
        expires_at: '2999-01-01T00:00:00.000Z',
      },
    ]);
  });
});
