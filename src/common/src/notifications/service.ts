import { Result } from '../result';
import {
  NotifyNewPropositionCommand,
  NotifyPropositionConvertedCommand,
  NotifyReservationCancelledCommand,
} from './dto';

export interface INotificationsService {
  notifyNewProposition(command: NotifyNewPropositionCommand): Promise<Result<void>>;
  notifyPropositionConverted(command: NotifyPropositionConvertedCommand): Promise<Result<void>>;
  notifyReservationCancelled(command: NotifyReservationCancelledCommand): Promise<Result<void>>;
  cleanupExpiredNotifications(nowIso?: string): Promise<Result<number>>;
}
