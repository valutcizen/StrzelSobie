export type Proposition = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
  is_member: boolean;
};

export type Reservation = {
  id: number;
  range_id: number;
  approved_by_admin_id: number;
  proposition_id: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

export type PropositionDetail = Proposition & {
  created_at: string | null;
  requester_email: string | null;
  requester_phone_number: string | null;
};

export type ReservationDetail = Reservation & {
  created_at: string | null;
  approved_by_admin_email: string | null;
  approved_by_admin_phone_number: string | null;
};

export type RecordEntity = {
  id: number;
  admin_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  created_at: string;
};

export type CreateRecordData = {
  range_id: number;
  admin_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
};

export type CreatePropositionRecord = {
  user_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

export type ReservationConflict = {
  id: number;
  type: 'reservation' | 'proposition';
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

export type CreateReservationRecord = {
  range_id: number;
  approved_by_admin_id: number;
  proposition_id: number | null;
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

export type AdminMessageTemplate = {
  id: number;
  range_id: number;
  created_by_admin_id: number;
  name: string;
  content: string;
  is_active: number;
  created_at: string | null;
  updated_at: string | null;
};

export interface IReservationsRepository {
  getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]>;
  getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]>;
  getRecords(rangeId: number, startDate: string, endDate: string): Promise<RecordEntity[]>;
  createProposition(record: CreatePropositionRecord): Promise<Proposition>;
  createReservation(record: CreateReservationRecord): Promise<Reservation>;
  createReservationFromProposition(record: CreateReservationRecord, propositionId: number): Promise<Reservation>;
  createRecord(data: CreateRecordData): Promise<RecordEntity>;
  markPropositionConverted(propositionId: number): Promise<void>;
  getPropositionById(id: number): Promise<Proposition | null>;
  getPropositionDetailById(id: number): Promise<PropositionDetail | null>;
  cancelProposition(id: number): Promise<Proposition | null>;
  getReservationById(id: number): Promise<Reservation | null>;
  getReservationDetailById(id: number): Promise<ReservationDetail | null>;
  deleteReservation(id: number): Promise<Reservation | null>;
  reopenProposition(id: number): Promise<Proposition | null>;
  listAdminMessageTemplates?(rangeId: number, includeInactive?: boolean): Promise<AdminMessageTemplate[]>;
  createAdminMessageTemplate?(record: {
    range_id: number;
    created_by_admin_id: number;
    name: string;
    content: string;
  }): Promise<AdminMessageTemplate>;
  updateAdminMessageTemplate?(
    id: number,
    changes: { name?: string; content?: string; is_active?: number }
  ): Promise<AdminMessageTemplate | null>;
  getAdminMessageTemplateById?(id: number): Promise<AdminMessageTemplate | null>;
}
