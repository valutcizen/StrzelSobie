import { Result } from '../result';
import { UserProfile } from '../users/model';
import { Reservation, Proposition, Record as RangeRecord } from './model';

export type BookingScopeDto = {
  firingLineId: number;
  trackNos: number[];
};

export type BookingMetadataDto = {
  trackNos: number[];
  [key: string]: unknown;
};

export type OverlapDeclarationContextItemDto = {
  type: 'proposition' | 'reservation';
  id: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  firingLineId: number;
  trackNos: number[];
  hasCoordinatorLicenseInGroup: boolean | null;
};

/**
 * Command model for creating a new reservation directly.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreateReservationCommand = BookingScopeDto & {
  eventDate: Reservation['event_date'];
  startTime: Reservation['start_time'];
  endTime: Reservation['end_time'];
  metadata?: Record<string, unknown>;
};

/**
 * Command model for creating a reservation from an existing proposition.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreateReservationFromPropositionCommand = {
  propositionId: Proposition['id'];
  eventDate?: Reservation['event_date'];
  startTime?: Reservation['start_time'];
  endTime?: Reservation['end_time'];
  adminMessage: string;
  templateId?: number;
  metadata?: Record<string, unknown>;
};

/**
 * Union payload accepted by reservation creation workflow.
 * `propositionId` discriminates proposition-based conversions.
 */
export type CreateReservationPayload =
  | CreateReservationCommand
  | CreateReservationFromPropositionCommand;

export type CreateReservationOptions = {
  force: boolean;
};

export type CancelReservationCommand = {
  reservationId: Reservation['id'];
};

/**
 * DTO for a newly created reservation.
 * Corresponds to the response payload for `POST /api/v1/ranges/{rangeSlug}/reservations`.
 */
export type CreatedReservationDto = Pick<Reservation, 'id' | 'range_id' | 'approved_by_admin_id'>;

export type PropositionEventDto = BookingScopeDto & {
  id: number;
  userId: number;
  isMember: boolean; // True if the user is a club member, for UI highlighting
  eventDate: string;
  startTime: string;
  endTime: string;
  hasCoordinatorLicenseInGroup: boolean;
};

export type ReservationEventDto = BookingScopeDto & {
  id: number;
  propositionId: number | null;
  eventDate: string;
  startTime: string;
  endTime: string;
  details: {
    approvedByAdminId: number;
  } | null;
  proposition: PropositionDetailDto | null;
};

export type RecordEventDto = {
  id: RangeRecord['id'];
  adminId: RangeRecord['admin_id'];
  eventDate: RangeRecord['event_date'];
  startTime: RangeRecord['start_time'];
  endTime: RangeRecord['end_time'];
  numParticipants: RangeRecord['num_participants'];
  createdAt: RangeRecord['created_at'];
};

export type RangeEventSummaryDto = {
  id: number;
  slug: string;
  name: string;
  startTime: string;
  endTime: string;
  audience: 'Public' | 'MembersOnly';
};

export type CalendarEventsDto = {
  propositions: PropositionEventDto[];
  reservations: ReservationEventDto[];
  events: RangeEventSummaryDto[];
  records?: RecordEventDto[];
};

export type GetCalendarEventsQuery = {
  rangeSlug: string;
  startDate: string;
  endDate: string;
  user: UserProfile;
};
/**
 * Command model for creating a new proposition.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/propositions`.
 * Maps properties to camelCase.
 */
export type CreatePropositionCommand = {
  eventDate: Proposition['event_date'];
  startTime: Proposition['start_time'];
  endTime: Proposition['end_time'];
  firingLineId: Proposition['firing_line_id'];
  trackNos: number[];
  hasCoordinatorLicenseInGroup: boolean;
  targetAdminUserId?: number;
  metadata?: Record<string, unknown>;
};

export type CancelPropositionCommand = {
  propositionId: Proposition['id'];
};

/**
 * DTO for a newly created proposition.
 * Corresponds to the response payload for `POST /api/v1/ranges/{rangeSlug}/propositions`.
 * This type is a subset of the `Proposition` entity.
 */
export type CreatedPropositionDto = Pick<Proposition, 'id' | 'user_id' | 'range_id' | 'status'>;
/**
 * Command model for creating a manual record.
 * Corresponds to the request payload for `POST /api/v1/ranges/{rangeSlug}/records`.
 * Maps properties from the `Record` entity, expecting camelCase in the API.
 */
export type CreateRecordCommand = {
  eventDate: RangeRecord['event_date'];
  startTime: RangeRecord['start_time'];
  endTime: RangeRecord['end_time'];
  numParticipants: RangeRecord['num_participants'];
};

export type CreatedRecordDto = {
  id: RangeRecord['id'];
  rangeId: RangeRecord['range_id'];
  adminId: RangeRecord['admin_id'];
  eventDate: RangeRecord['event_date'];
  startTime: RangeRecord['start_time'];
  endTime: RangeRecord['end_time'];
  numParticipants: RangeRecord['num_participants'];
  createdAt: RangeRecord['created_at'];
};

export type CreateRecordResult = Result<CreatedRecordDto>;

export type PersonSummaryDto = {
  id: number;
  email: string | null;
  phoneNumber: string | null;
  displayName?: string | null;
};

export type PropositionDetailDto = {
  id: Proposition['id'];
  rangeId: Proposition['range_id'];
  userId: Proposition['user_id'];
  status: Proposition['status'];
  eventDate: Proposition['event_date'];
  startTime: Proposition['start_time'];
  endTime: Proposition['end_time'];
  firingLineId: Proposition['firing_line_id'];
  trackNos: number[];
  hasCoordinatorLicenseInGroup: boolean;
  metadata: BookingMetadataDto;
  overlapDeclarationContext?: OverlapDeclarationContextItemDto[];
  createdAt: string | null;
  requester: PersonSummaryDto | null;
  notes?: string | null;
};

export type ReservationDetailDto = {
  id: Reservation['id'];
  rangeId: Reservation['range_id'];
  approvedByAdminId: Reservation['approved_by_admin_id'];
  propositionId: Reservation['proposition_id'];
  proposition: PropositionDetailDto | null;
  eventDate: Reservation['event_date'];
  startTime: Reservation['start_time'];
  endTime: Reservation['end_time'];
  firingLineId: Reservation['firing_line_id'];
  trackNos: number[];
  metadata: BookingMetadataDto;
  overlapDeclarationContext?: OverlapDeclarationContextItemDto[];
  createdAt: string | null;
  approvedByAdmin: PersonSummaryDto | null;
  notes?: string | null;
};

export type MessageTemplateDto = {
  id: number;
  rangeId: number;
  createdByAdminId: number;
  name: string;
  content: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
};

export type CreateMessageTemplateCommand = {
  name: string;
  content: string;
};

export type UpdateMessageTemplateCommand = {
  name?: string;
  content?: string;
  isActive?: boolean;
};
