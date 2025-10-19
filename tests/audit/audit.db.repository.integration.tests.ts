import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { AuditDbRepository } from '../../src/audit/src/infrastructure/audit.db.repository';
import { createTestDatabase, type TestDatabase } from '../utils/database';

describe('AuditDbRepository integration', () => {
  let dbHandle: TestDatabase;
  let repository: AuditDbRepository;

  beforeEach(async () => {
    dbHandle = await createTestDatabase();
    repository = new AuditDbRepository(dbHandle.db);
  });

  afterEach(() => {
    dbHandle.cleanup();
  });

  it('logAction inserts audit entry', async () => {
    await repository.logAction({
      action_type: 'RESERVATION_CREATE',
      target_id: 42,
      details: { reservationId: 99, message: 'created' },
    });

    const record = await dbHandle.d1
      .prepare('SELECT action_type, target_id, details FROM audit_logs ORDER BY id DESC LIMIT 1')
      .first<{ action_type: string; target_id: number; details: string }>();

    expect(record).toBeTruthy();
    expect(record?.action_type).toBe('RESERVATION_CREATE');
    expect(record?.target_id).toBe(42);
    expect(record?.details).toBe(JSON.stringify({ reservationId: 99, message: 'created' }));
  });
});
