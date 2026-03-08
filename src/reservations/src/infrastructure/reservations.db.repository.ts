import { IDatabase } from '@strzel-sobie/common/models';
import {
  CreatePropositionRecord,
  CreateRecordData,
  CreateReservationRecord,
  IReservationsRepository,
  Proposition,
  PropositionDetail,
  RecordEntity,
  Reservation,
  ReservationDetail,
} from '../domain/reservations.repository';

type PropositionDb = {
  id: number;
  user_id: number;
  range_id: number;
  status: 'open' | 'converted' | 'cancelled';
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
  is_member: number;
};

type PropositionDetailDb = PropositionDb & {
  created_at: string | null;
  requester_email: string | null;
  requester_phone_number: string | null;
};

type ReservationDb = {
  id: number;
  proposition_id: number | null;
  range_id: number;
  approved_by_admin_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  firing_line_id: number;
  metadata_json: string;
};

type ReservationDetailDb = ReservationDb & {
  created_at: string | null;
  approved_by_admin_email: string | null;
  approved_by_admin_phone_number: string | null;
};

type RecordDb = {
  id: number;
  admin_id: number;
  range_id: number;
  event_date: string;
  start_time: string;
  end_time: string;
  num_participants: number;
  created_at: string;
};

const mapDbProposition = (dbProposition: PropositionDb): Proposition => ({
  id: dbProposition.id,
  user_id: dbProposition.user_id,
  range_id: dbProposition.range_id,
  status: dbProposition.status,
  event_date: dbProposition.event_date,
  start_time: dbProposition.start_time,
  end_time: dbProposition.end_time,
  firing_line_id: dbProposition.firing_line_id,
  metadata_json: dbProposition.metadata_json,
  is_member: Boolean(dbProposition.is_member),
});

const mapDbPropositionDetail = (dbProposition: PropositionDetailDb): PropositionDetail => ({
  ...mapDbProposition(dbProposition),
  created_at: dbProposition.created_at ?? null,
  requester_email: dbProposition.requester_email ?? null,
  requester_phone_number: dbProposition.requester_phone_number ?? null,
});

const mapDbReservation = (dbReservation: ReservationDb): Reservation => ({
  id: dbReservation.id,
  proposition_id: dbReservation.proposition_id,
  range_id: dbReservation.range_id,
  approved_by_admin_id: dbReservation.approved_by_admin_id,
  event_date: dbReservation.event_date,
  start_time: dbReservation.start_time,
  end_time: dbReservation.end_time,
  firing_line_id: dbReservation.firing_line_id,
  metadata_json: dbReservation.metadata_json,
});

const mapDbReservationDetail = (dbReservation: ReservationDetailDb): ReservationDetail => ({
  ...mapDbReservation(dbReservation),
  created_at: dbReservation.created_at ?? null,
  approved_by_admin_email: dbReservation.approved_by_admin_email ?? null,
  approved_by_admin_phone_number: dbReservation.approved_by_admin_phone_number ?? null,
});

const mapDbRecord = (dbRecord: RecordDb): RecordEntity => ({
  id: dbRecord.id,
  admin_id: dbRecord.admin_id,
  range_id: dbRecord.range_id,
  event_date: dbRecord.event_date,
  start_time: dbRecord.start_time,
  end_time: dbRecord.end_time,
  num_participants: dbRecord.num_participants,
  created_at: dbRecord.created_at,
});

export class ReservationsDbRepository implements IReservationsRepository {
  constructor(private readonly db: IDatabase) {}

  public async getPropositions(rangeId: number, startDate: string, endDate: string): Promise<Proposition[]> {
    const stmt = this.db.prepare(
      `SELECT
          rp.id,
          rp.user_id,
          rp.range_id,
          rp.status,
          rp.event_date,
          rp.start_time,
          rp.end_time,
          rp.firing_line_id,
          rp.metadata_json,
          EXISTS (
            SELECT 1
            FROM users_user_global_roles ugr
            JOIN users_roles ur ON ur.id = ugr.role_id
            WHERE ugr.user_id = rp.user_id
              AND ur.name = 'Member'
          ) AS is_member
       FROM reservations_propositions rp
       WHERE range_id = ?
         AND event_date BETWEEN ? AND ?
         AND status = 'open'`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<PropositionDb>();

    return (results ?? []).map(mapDbProposition);
  }

  public async getReservations(rangeId: number, startDate: string, endDate: string): Promise<Reservation[]> {
    const stmt = this.db.prepare(
      `SELECT id, proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json
       FROM reservations_reservations
       WHERE range_id = ? AND event_date BETWEEN ? AND ?`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<ReservationDb>();

    return (results ?? []).map(mapDbReservation);
  }

  public async getRecords(rangeId: number, startDate: string, endDate: string): Promise<RecordEntity[]> {
    const stmt = this.db.prepare(
      `SELECT id, admin_id, range_id, event_date, start_time, end_time, num_participants, created_at
       FROM reservations_records
       WHERE range_id = ? AND event_date BETWEEN ? AND ?`
    );
    const { results } = await stmt.bind(rangeId, startDate, endDate).all<RecordDb>();

    return (results ?? []).map(mapDbRecord);
  }

  public async createProposition(record: CreatePropositionRecord): Promise<Proposition> {
    const stmt = this.db.prepare(
      `INSERT INTO reservations_propositions
        (user_id, range_id, status, event_date, start_time, end_time, firing_line_id, metadata_json)
       VALUES (?, ?, 'open', ?, ?, ?, ?, ?)
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         firing_line_id,
         metadata_json,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );

    const result = await stmt
      .bind(
        record.user_id,
        record.range_id,
        record.event_date,
        record.start_time,
        record.end_time,
        record.firing_line_id,
        record.metadata_json
      )
      .first<PropositionDb>();

    if (!result) {
      throw new Error('Failed to create proposition');
    }

    return mapDbProposition(result);
  }

  public async createReservation(record: CreateReservationRecord): Promise<Reservation> {
    return this.insertReservation(record);
  }

  public async createReservationFromProposition(
    record: CreateReservationRecord,
    propositionId: number
  ): Promise<Reservation> {
    const reservation = await this.insertReservation({
      ...record,
      proposition_id: propositionId,
    });

    let updateResult: { id: number } | null;
    try {
      updateResult = await this.db
        .prepare(
          `UPDATE reservations_propositions
           SET status = 'converted'
           WHERE id = ?
             AND status = 'open'
           RETURNING id`
        )
        .bind(propositionId)
        .first<{ id: number }>();
    } catch (error) {
      try {
        await this.deleteReservation(reservation.id);
      } catch (cleanupError) {
        console.error('Failed to rollback reservation creation after update error', cleanupError);
      }
      throw error;
    }

    if (!updateResult) {
      try {
        await this.deleteReservation(reservation.id);
      } catch (cleanupError) {
        console.error(
          'Failed to rollback reservation creation after proposition conversion failure',
          cleanupError
        );
      }
      throw new Error('Failed to mark proposition as converted');
    }

    return reservation;
  }

  public async markPropositionConverted(propositionId: number): Promise<void> {
    const updateResult = await this.db
      .prepare(
        `UPDATE reservations_propositions
         SET status = 'converted'
         WHERE id = ?
         RETURNING id`
      )
      .bind(propositionId)
      .first<{ id: number }>();

    if (!updateResult) {
      throw new Error('Failed to mark proposition as converted');
    }
  }

  public async getPropositionById(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `SELECT
          rp.id,
          rp.user_id,
          rp.range_id,
          rp.status,
          rp.event_date,
          rp.start_time,
          rp.end_time,
          rp.firing_line_id,
          rp.metadata_json,
          EXISTS (
            SELECT 1
            FROM users_user_global_roles ugr
            JOIN users_roles ur ON ur.id = ugr.role_id
            WHERE ugr.user_id = rp.user_id
              AND ur.name = 'Member'
          ) AS is_member
       FROM reservations_propositions rp
       WHERE id = ?`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }

  public async getPropositionDetailById(id: number): Promise<PropositionDetail | null> {
    const stmt = this.db.prepare(
      `SELECT
          rp.id,
          rp.user_id,
          rp.range_id,
          rp.status,
          rp.event_date,
          rp.start_time,
          rp.end_time,
          rp.firing_line_id,
          rp.metadata_json,
          rp.created_at,
          EXISTS (
            SELECT 1
            FROM users_user_global_roles ugr
            JOIN users_roles ur ON ur.id = ugr.role_id
            WHERE ugr.user_id = rp.user_id
              AND ur.name = 'Member'
          ) AS is_member,
          uu.email AS requester_email,
          uu.phone_number AS requester_phone_number
       FROM reservations_propositions rp
       LEFT JOIN users_users uu ON uu.id = rp.user_id
       WHERE rp.id = ?`
    );

    const record = await stmt.bind(id).first<PropositionDetailDb>();

    if (!record) {
      return null;
    }

    return mapDbPropositionDetail(record);
  }

  public async cancelProposition(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `UPDATE reservations_propositions
       SET status = 'cancelled'
       WHERE id = ? AND status = 'open'
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         firing_line_id,
         metadata_json,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }

  public async getReservationById(id: number): Promise<Reservation | null> {
    const stmt = this.db.prepare(
      `SELECT id, proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json
       FROM reservations_reservations
       WHERE id = ?`
    );

    const record = await stmt.bind(id).first<ReservationDb>();

    if (!record) {
      return null;
    }

    return mapDbReservation(record);
  }

  public async getReservationDetailById(id: number): Promise<ReservationDetail | null> {
    const stmt = this.db.prepare(
      `SELECT
         rr.id,
         rr.proposition_id,
         rr.range_id,
         rr.approved_by_admin_id,
         rr.event_date,
         rr.start_time,
         rr.end_time,
         rr.firing_line_id,
         rr.metadata_json,
         rr.created_at,
         uu.email AS approved_by_admin_email,
         uu.phone_number AS approved_by_admin_phone_number
       FROM reservations_reservations rr
       LEFT JOIN users_users uu ON uu.id = rr.approved_by_admin_id
       WHERE rr.id = ?`
    );

    const record = await stmt.bind(id).first<ReservationDetailDb>();

    if (!record) {
      return null;
    }

    return mapDbReservationDetail(record);
  }

  public async deleteReservation(id: number): Promise<Reservation | null> {
    const stmt = this.db.prepare(
      `DELETE FROM reservations_reservations
       WHERE id = ?
       RETURNING id, proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json`
    );

    const record = await stmt.bind(id).first<ReservationDb>();

    if (!record) {
      return null;
    }

    return mapDbReservation(record);
  }

  public async reopenProposition(id: number): Promise<Proposition | null> {
    const stmt = this.db.prepare(
      `UPDATE reservations_propositions
       SET status = 'open'
       WHERE id = ? AND status = 'converted'
       RETURNING
         id,
         user_id,
         range_id,
         status,
         event_date,
         start_time,
         end_time,
         firing_line_id,
         metadata_json,
         EXISTS (
           SELECT 1
           FROM users_user_global_roles ugr
           JOIN users_roles ur ON ur.id = ugr.role_id
           WHERE ugr.user_id = reservations_propositions.user_id
             AND ur.name = 'Member'
         ) AS is_member`
    );

    const record = await stmt.bind(id).first<PropositionDb>();

    if (!record) {
      return null;
    }

    return mapDbProposition(record);
  }

  public async createRecord(data: CreateRecordData): Promise<RecordEntity> {
    const stmt = this.db.prepare(
      `INSERT INTO reservations_records
        (range_id, admin_id, event_date, start_time, end_time, num_participants)
       VALUES (?, ?, ?, ?, ?, ?)
       RETURNING id, admin_id, range_id, event_date, start_time, end_time, num_participants, created_at`
    );

    const record = await stmt
      .bind(
        data.range_id,
        data.admin_id,
        data.event_date,
        data.start_time,
        data.end_time,
        data.num_participants
      )
      .first<RecordDb>();

    if (!record) {
      throw new Error('Failed to create record');
    }

    return mapDbRecord(record);
  }

  private async insertReservation(record: CreateReservationRecord): Promise<Reservation> {
    const propositionId = record.proposition_id ?? null;
    const stmt = this.db.prepare(
      `INSERT INTO reservations_reservations
        (proposition_id, approved_by_admin_id, range_id, event_date, start_time, end_time, firing_line_id, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, proposition_id, range_id, approved_by_admin_id, event_date, start_time, end_time, firing_line_id, metadata_json`
    );

    const created = await stmt
      .bind(
        propositionId,
        record.approved_by_admin_id,
        record.range_id,
        record.event_date,
        record.start_time,
        record.end_time,
        record.firing_line_id,
        record.metadata_json
      )
      .first<ReservationDb>();

    if (!created) {
      throw new Error('Failed to create reservation');
    }

    return mapDbReservation(created);
  }
}
