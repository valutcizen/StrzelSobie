import { describe, it } from 'vitest';
import type { IAuditService } from '@strzel-sobie/common/src/audit/service';

type ContractSubject = IAuditService;

describe('AuditService contract', () => {
  it.todo('validates that the @strzel-sobie/audit implementation satisfies IAuditService');
});
