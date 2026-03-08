import { Result } from '../result';
import { NotificationType } from './model';

export type NotifyNewPropositionCommand = {
  recipientUserId: number;
  propositionId: number;
  rangeId: number;
  rangeSlug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  firingLineId: number;
  trackNos: number[];
  requesterUserId: number;
};

export type NotifyPropositionConvertedCommand = {
  recipientUserId: number;
  propositionId: number;
  reservationId: number;
  rangeId: number;
  rangeSlug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  firingLineId: number;
  trackNos: number[];
  approvedByAdminId: number;
  adminMessage: string;
};

export type NotifyReservationCancelledCommand = {
  recipientUserId: number;
  reservationId: number;
  rangeId: number;
  rangeSlug: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  firingLineId: number;
  trackNos: number[];
  cancelledByUserId: number;
};

export type NotificationEnvelope = {
  type: NotificationType;
  payload: Record<string, unknown>;
};

export type NotificationsResult = Promise<Result<void>>;
