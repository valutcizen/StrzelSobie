import { AuditDbRepository } from './infrastructure/audit.db.repository';
import { AuditService } from './application/audit.service';
import { IDatabase } from '@strzel-sobie/common';

export { AuditService } from './application/audit.service';
export { AuditRepository } from './domain/audit.repository';

export const createAuditService = (db : IDatabase) => {
  const auditRepository = new AuditDbRepository(db);
  return new AuditService(auditRepository);
};
