import { IDatabase } from '@strzel-sobie/common/models';
import {
  EventAudience,
  EventCapacityType,
  EventGuestPolicy,
  EventRegistrationType,
  EventSignupStatus,
  EventStatus,
} from '@strzel-sobie/common/models';
import {
  CreateEventRecord,
  CreateEventSignupRecord,
  EventParticipantRecord,
  EventRecord,
  EventSignupRecord,
  EventSignupSummary,
  IEventsRepository,
  UpdateEventRecord,
} from '../domain/events.repository';

type EventDbRow = {
  id: number;
  range_id: number;
  organizer_id: number;
  slug: string;
  name: string;
  event_date: string;
  start_time: string;
  end_time: string;
  status: string;
  audience: string;
  config: string;
  created_at: string;
  updated_at: string;
};

type EventSignupDbRow = {
  id: number;
  event_id: number;
  user_id: number;
  status: string;
  guests_count: number;
  created_at: string;
  updated_at: string;
};

type EventParticipantDbRow = {
  user_id: number;
  user_email: string | null;
  guests: number;
  signup_time: string;
};

type EventConfig = {
  public_description?: string;
  member_description?: string | null;
  registration_type?: EventRegistrationType;
  capacity_type?: EventCapacityType;
  capacity_limit?: number | null;
  guest_policy?: EventGuestPolicy | null;
  waitlist_limit?: number | null;
  registration_deadline?: string | null;
};

const eventAudienceValues = new Set(Object.values(EventAudience));
const eventCapacityValues = new Set(Object.values(EventCapacityType));
const eventRegistrationValues = new Set(Object.values(EventRegistrationType));
const eventGuestPolicyValues = new Set(Object.values(EventGuestPolicy));
const eventStatusValues = new Set(Object.values(EventStatus));

const isEventRegistrationType = (value: unknown): value is EventRegistrationType =>
  typeof value === 'string' && eventRegistrationValues.has(value as EventRegistrationType);

const isEventCapacityType = (value: unknown): value is EventCapacityType =>
  typeof value === 'string' && eventCapacityValues.has(value as EventCapacityType);

const isEventGuestPolicy = (value: unknown): value is EventGuestPolicy =>
  typeof value === 'string' && eventGuestPolicyValues.has(value as EventGuestPolicy);

const isEventStatus = (value: unknown): value is EventStatus =>
  typeof value === 'string' && eventStatusValues.has(value as EventStatus);

const isEventAudience = (value: unknown): value is EventAudience =>
  typeof value === 'string' && eventAudienceValues.has(value as EventAudience);

const parseConfig = (raw: string | null): EventConfig => {
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
};

const slugify = (name: string, suffix: string): string => {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'event'}-${suffix}`;
};

export class EventsDbRepository implements IEventsRepository {
  constructor(private readonly db: IDatabase) {}

  private mapEventRow(row: EventDbRow): EventRecord {
    const config = parseConfig(row.config);
    const registrationType = isEventRegistrationType(config.registration_type)
      ? config.registration_type
      : EventRegistrationType.Notice;
    const capacityType = isEventCapacityType(config.capacity_type)
      ? config.capacity_type
      : EventCapacityType.Unlimited;
    const guestPolicy = isEventGuestPolicy(config.guest_policy)
      ? config.guest_policy
      : null;
    const status = isEventStatus(row.status) ? row.status : EventStatus.Active;
    const audience = isEventAudience(row.audience) ? row.audience : EventAudience.Public;

    return {
      id: row.id,
      slug: row.slug,
      range_id: row.range_id,
      created_by: row.organizer_id,
      name: row.name,
      public_description: config.public_description ?? '',
      member_description: config.member_description ?? null,
      event_date: row.event_date,
      start_time: row.start_time,
      end_time: row.end_time,
      registration_type: registrationType,
      audience,
      capacity_type: capacityType,
      capacity_limit: config.capacity_limit ?? null,
      guest_policy: guestPolicy,
      waitlist_limit: config.waitlist_limit ?? null,
      registration_deadline: config.registration_deadline ?? null,
      status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private mapSignupRow(row: EventSignupDbRow): EventSignupRecord {
    return {
      id: row.id,
      event_id: row.event_id,
      user_id: row.user_id,
      guests: row.guests_count,
      status: row.status as EventSignupStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private buildConfig(record: CreateEventRecord): EventConfig {
    return {
      public_description: record.public_description,
      member_description: record.member_description ?? null,
      registration_type: record.registration_type,
      capacity_type: record.capacity_type,
      capacity_limit: record.capacity_limit ?? null,
      guest_policy: record.guest_policy ?? null,
      waitlist_limit: record.waitlist_limit ?? null,
      registration_deadline: record.registration_deadline ?? null,
    };
  }

  public async getRangeEvents(rangeId: number): Promise<EventRecord[]> {
    const stmt = this.db.prepare(
      `SELECT id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at
       FROM events_events
       WHERE range_id = ?`
    );
    const { results } = await stmt.bind(rangeId).all<EventDbRow>();
    return results.map((row) => this.mapEventRow(row));
  }

  public async getEventById(eventId: number): Promise<EventRecord | null> {
    const stmt = this.db.prepare(
      `SELECT id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at
       FROM events_events
       WHERE id = ?`
    );
    const row = await stmt.bind(eventId).first<EventDbRow>();
    if (!row) {
      return null;
    }
    return this.mapEventRow(row);
  }

  public async getEventBySlug(rangeId: number, slug: string): Promise<EventRecord | null> {
    const stmt = this.db.prepare(
      `SELECT id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at
       FROM events_events
       WHERE range_id = ? AND slug = ?`
    );
    const row = await stmt.bind(rangeId, slug).first<EventDbRow>();
    if (!row) {
      return null;
    }
    return this.mapEventRow(row);
  }

  public async getEventParticipants(eventId: number): Promise<EventParticipantRecord[]> {
    const stmt = this.db.prepare(
      `SELECT es.user_id, uu.email AS user_email, es.guests_count AS guests, es.created_at AS signup_time
       FROM events_signups es
       LEFT JOIN users_users uu ON uu.id = es.user_id
       WHERE es.event_id = ? AND es.status = ?
       ORDER BY es.created_at ASC`
    );
    const { results } = await stmt
      .bind(eventId, EventSignupStatus.Confirmed)
      .all<EventParticipantDbRow>();

    return results.map((row) => ({
      user_id: row.user_id,
      user_email: row.user_email,
      user_display_name: null,
      guests: row.guests,
      signup_time: row.signup_time,
    }));
  }

  public async getEventWaitlist(eventId: number): Promise<EventParticipantRecord[]> {
    const stmt = this.db.prepare(
      `SELECT es.user_id, uu.email AS user_email, es.guests_count AS guests, es.created_at AS signup_time
       FROM events_signups es
       LEFT JOIN users_users uu ON uu.id = es.user_id
       WHERE es.event_id = ? AND es.status = ?
       ORDER BY es.created_at ASC`
    );
    const { results } = await stmt
      .bind(eventId, EventSignupStatus.Waitlisted)
      .all<EventParticipantDbRow>();

    return results.map((row) => ({
      user_id: row.user_id,
      user_email: row.user_email,
      user_display_name: null,
      guests: row.guests,
      signup_time: row.signup_time,
    }));
  }

  public async createEvent(record: CreateEventRecord): Promise<EventRecord> {
    const slug = slugify(record.name, String(Date.now()));
    const config = this.buildConfig(record);
    const stmt = this.db.prepare(
      `INSERT INTO events_events
        (range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
       RETURNING id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at`
    );

    const row = await stmt
      .bind(
        record.range_id,
        record.created_by,
        slug,
        record.name,
        record.event_date,
        record.start_time,
        record.end_time,
        record.status,
        record.audience,
        JSON.stringify(config)
      )
      .first<EventDbRow>();

    if (!row) {
      throw new Error('Failed to create event');
    }

    return this.mapEventRow(row);
  }

  public async updateEvent(eventId: number, record: UpdateEventRecord): Promise<EventRecord | null> {
    const existing = await this.getEventById(eventId);
    if (!existing) {
      return null;
    }

    const nextConfig: EventConfig = {
      public_description: record.public_description ?? existing.public_description,
      member_description: record.member_description ?? existing.member_description,
      registration_type: record.registration_type ?? existing.registration_type,
      capacity_type: record.capacity_type ?? existing.capacity_type,
      capacity_limit: record.capacity_limit ?? existing.capacity_limit,
      guest_policy: record.guest_policy ?? existing.guest_policy,
      waitlist_limit: record.waitlist_limit ?? existing.waitlist_limit,
      registration_deadline: record.registration_deadline ?? existing.registration_deadline,
    };

    const stmt = this.db.prepare(
      `UPDATE events_events
       SET name = ?, event_date = ?, start_time = ?, end_time = ?, status = ?, audience = ?, config = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at`
    );

    const row = await stmt
      .bind(
        record.name ?? existing.name,
        record.event_date ?? existing.event_date,
        record.start_time ?? existing.start_time,
        record.end_time ?? existing.end_time,
        record.status ?? existing.status,
        record.audience ?? existing.audience,
        JSON.stringify(nextConfig),
        eventId
      )
      .first<EventDbRow>();

    if (!row) {
      return null;
    }

    return this.mapEventRow(row);
  }

  public async cancelEvent(eventId: number): Promise<EventRecord | null> {
    const stmt = this.db.prepare(
      `UPDATE events_events
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING id, range_id, organizer_id, slug, name, event_date, start_time, end_time, status, audience, config, created_at, updated_at`
    );

    const row = await stmt.bind(EventStatus.Cancelled, eventId).first<EventDbRow>();
    if (!row) {
      return null;
    }

    return this.mapEventRow(row);
  }

  public async getSignupByUser(eventId: number, userId: number): Promise<EventSignupRecord | null> {
    const stmt = this.db.prepare(
      `SELECT id, event_id, user_id, status, guests_count, created_at, updated_at
       FROM events_signups
       WHERE event_id = ? AND user_id = ?`
    );
    const row = await stmt.bind(eventId, userId).first<EventSignupDbRow>();
    if (!row) {
      return null;
    }
    return this.mapSignupRow(row);
  }

  public async getSignupSummary(eventId: number): Promise<EventSignupSummary> {
    const stmt = this.db.prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN status = ? THEN 1 + guests_count ELSE 0 END), 0) AS confirmedSlots,
         COALESCE(SUM(CASE WHEN status = ? THEN 1 + guests_count ELSE 0 END), 0) AS waitlistedSlots
       FROM events_signups
       WHERE event_id = ?`
    );
    const row = await stmt
      .bind(EventSignupStatus.Confirmed, EventSignupStatus.Waitlisted, eventId)
      .first<{ confirmedSlots: number; waitlistedSlots: number }>();

    return {
      confirmedSlots: row?.confirmedSlots ?? 0,
      waitlistedSlots: row?.waitlistedSlots ?? 0,
    };
  }

  public async createSignup(record: CreateEventSignupRecord): Promise<EventSignupRecord> {
    const stmt = this.db.prepare(
      `INSERT INTO events_signups (event_id, user_id, status, guests_count)
       VALUES (?, ?, ?, ?)
       RETURNING id, event_id, user_id, status, guests_count, created_at, updated_at`
    );
    const row = await stmt
      .bind(record.event_id, record.user_id, record.status, record.guests)
      .first<EventSignupDbRow>();

    if (!row) {
      throw new Error('Failed to create event signup');
    }

    return this.mapSignupRow(row);
  }

  public async updateSignup(
    eventId: number,
    userId: number,
    guests: number
  ): Promise<EventSignupRecord | null> {
    const stmt = this.db.prepare(
      `UPDATE events_signups
       SET guests_count = ?, updated_at = CURRENT_TIMESTAMP
       WHERE event_id = ? AND user_id = ?
       RETURNING id, event_id, user_id, status, guests_count, created_at, updated_at`
    );
    const row = await stmt.bind(guests, eventId, userId).first<EventSignupDbRow>();
    if (!row) {
      return null;
    }
    return this.mapSignupRow(row);
  }

  public async deleteSignup(eventId: number, userId: number): Promise<EventSignupRecord | null> {
    const existing = await this.getSignupByUser(eventId, userId);
    if (!existing) {
      return null;
    }
    const stmt = this.db.prepare(
      `DELETE FROM events_signups
       WHERE event_id = ? AND user_id = ?`
    );
    await stmt.bind(eventId, userId).run();
    return existing;
  }

  public async promoteWaitlistedSignup(
    eventId: number,
    slotsAvailable: number
  ): Promise<EventSignupRecord | null> {
    const stmt = this.db.prepare(
      `SELECT id, event_id, user_id, status, guests_count, created_at, updated_at
       FROM events_signups
       WHERE event_id = ? AND status = ? AND (guests_count + 1) <= ?
       ORDER BY created_at ASC
       LIMIT 1`
    );
    const row = await stmt
      .bind(eventId, EventSignupStatus.Waitlisted, slotsAvailable)
      .first<EventSignupDbRow>();

    if (!row) {
      return null;
    }

    const updateStmt = this.db.prepare(
      `UPDATE events_signups
       SET status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?
       RETURNING id, event_id, user_id, status, guests_count, created_at, updated_at`
    );
    const updated = await updateStmt
      .bind(EventSignupStatus.Confirmed, row.id)
      .first<EventSignupDbRow>();
    if (!updated) {
      return null;
    }
    return this.mapSignupRow(updated);
  }
}
