import { AdminLog } from '@strzel-sobie/common';

export interface IAdminRepository {
  logAction(log: AdminLog): Promise<void>;
}
