import { afterEach, beforeEach, describe, expect, it, vi, type Mocked } from 'vitest';
import { type AuditLogEntry } from '@strzel-sobie/common';
import { AuditService } from '../../src/audit/src/application/audit.service';
import type { AuditRepository } from '../../src/audit/src/domain/audit.repository';

describe('AuditService contract', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('logs an audit entry through the repository when logging succeeds', async () => {
    const auditRepository: Mocked<AuditRepository> = {
      logAction: vi.fn<[AuditLogEntry], Promise<void>>(),
    };
    const service = new AuditService(auditRepository);
    const entry: AuditLogEntry = {
      action_type: 'USER_REGISTRATION',
      target_id: 42,
      details: { email: 'new@example.com' },
    };

    auditRepository.logAction.mockResolvedValue();

    const result = await service.logAction(entry);

    expect(result.isSuccess).toBe(true);
    expect(auditRepository.logAction).toHaveBeenCalledTimes(1);
    expect(auditRepository.logAction).toHaveBeenCalledWith(entry);
  });

  it('returns a failure result when the repository throws', async () => {
    const auditRepository: Mocked<AuditRepository> = {
      logAction: vi.fn<[AuditLogEntry], Promise<void>>(),
    };
    const service = new AuditService(auditRepository);
    const entry: AuditLogEntry = {
      action_type: 'RESERVATION_CANCEL',
      target_id: 7,
      details: { reason: 'user_request' },
    };
    const expectedError = new Error('write failed');

    auditRepository.logAction.mockRejectedValue(expectedError);

    const result = await service.logAction(entry);

    expect(result.isSuccess).toBe(false);
    expect(result.getError()).toBe(expectedError);
  });
});
