# Range Administration Flow Implementation Plan

## 1. Goal
Replace coordinator-driven proposition acceptance with range-administrator-driven conversion, and add range admin contact/notification capabilities.

## 2. Requested Product Changes (Normalized)
- Terminology: Polish `oś` is translated as `firing line`.
- Remove coordinator-role requirement from proposition-to-reservation conversion.
- Only `Member` can create propositions.
- Proposition form must include required declaration field: whether someone in the group has a valid coordinator license (`true/false`).
- If proposition creator has `Coordinator` role, declaration is auto-set to `true` and disabled.
- Only `Shooting Range Administrator` can convert proposition into reservation.
- Range administrators have profile data (phone, email, optional fields) with:
  - one global default profile,
  - per-range override profile,
  - hide-in-all-ranges and hide-in-specific-range options.
- Range details include a new `administratorContacts` field (visible contacts only, members and higher).
- After proposition creation, member may:
  - notify one specific admin, or
  - create without targeted notification.
- Selected admin receives in-app and email notifications for new propositions.
- After conversion to reservation, member receives notification containing administrator message.
- Admin can manage per-range message templates and edit selected template before conversion.
- Reservation/proposition scope supports:
  - specific tracks in one firing line, or
  - whole firing line reservation when available.
- A single proposition/reservation is limited to exactly one firing line.
- Same user may have overlapping bookings in the same time if they are on different firing lines.
- Events can be assigned to zero, one, or many firing lines.
- Guests can sign up to public events; non-authenticated users can only browse public events.

## 3. Domain Rules
- Authorization:
  - Create proposition: `Member` only.
  - Convert proposition -> reservation: range admin role for the proposition's range.
  - Direct reservation create/cancel: range admin role for the range.
  - Public event signup: authenticated `Guest` (or higher) for events with `Public` audience.
- Proposition declaration:
  - `hasCoordinatorLicenseInGroup` is required boolean (`true` or `false`).
  - If creator has `Coordinator` role, backend enforces `true` regardless of client payload.
- Notification routing:
  - If `targetAdminUserId` is set and valid for range, notify that admin.
  - If not set, do not send admin notification.
  - `targetAdminUserId` is request-time only (not persisted in proposition/reservation read models).
- Conversion message:
  - `adminMessage` is required when converting proposition.
  - Template is optional source for prefill; final sent message is the edited text.
- Admin review support:
  - During proposition review/conversion, admin can view declaration status of overlapping propositions/reservations on the same firing line/tracks.
  - One coordinator declaration is evaluated per firing line involved in the booking.
- Booking scope constraints:
  - A proposition/reservation must include exactly one `firingLineId`.
  - It must include one-or-many track numbers (`trackNos`) within the firing line range `1..tracksCount`.
  - `trackNos` is the source of truth for booking scope; "full line" is inferred when all track numbers of the firing line are selected.

## 4. Data Model Changes (Migration Plan)
## 4.0 Storage Policy
- Prefer JSON text columns (`metadata_json` / `extras_json`) for attributes that are not joinable and not part of search/filter predicates.
- Keep dedicated SQL columns only for:
  - joins/foreign keys,
  - range/date/time filtering,
  - permission-critical flags that must be filtered in SQL.
- Event read models are optimized around `range` + `date` filtering; other event attributes should stay in JSON payload fields.

## 4.1 Range Structure
- New table: `ranges_firing_lines`
  - `id`, `range_id`, `name`, `length_meters`, `tracks_count`, `sort_order`, timestamps.
  - tracks are uniform within a firing line and represented virtually as numbered positions `1..tracks_count` (no `ranges_tracks` table).

## 4.2 Reservations
- `reservations_propositions`
  - add `firing_line_id INTEGER NOT NULL` (FK -> `ranges_firing_lines.id`)
  - add `metadata_json TEXT NOT NULL DEFAULT '{}'`
  - `metadata_json` stores non-search fields (e.g., declaration).
- `reservations_reservations`
  - add `firing_line_id INTEGER NOT NULL` (FK -> `ranges_firing_lines.id`)
  - add `approved_by_admin_id INTEGER NULL` (FK -> `users_users.id`)
  - add `metadata_json TEXT NOT NULL DEFAULT '{}'`
  - `metadata_json` stores non-search fields (e.g., conversion context and selected `trackNos`, excluding full message body).
  - ensure final converted times are stored from admin-edited values
- Migration will drop obsolete columns:
  - `reservations_propositions.tracks_requested`
  - `reservations_reservations.tracks_requested`
  - `reservations_reservations.coordinator_id`

## 4.3 Events to Firing Lines
- New join table: `events_event_firing_lines`
  - `id`, `event_id`, `firing_line_id`.
  - unique (`event_id`, `firing_line_id`).
  - supports events assigned to zero, one, or many firing lines.

## 4.4 Admin Contact Profiles
- New table: `users_admin_contact_profiles`
  - `user_id PRIMARY KEY`, `email`, `phone_number`, `display_name`, `is_hidden_globally`, timestamps.
- New table: `users_admin_contact_profile_overrides`
  - composite primary key: (`user_id`, `range_id`), plus `email`, `phone_number`, `display_name`, `is_hidden_in_range`, timestamps.

## 4.5 Message Templates
- New table: `reservations_admin_message_templates`
  - `id`, `range_id`, `created_by_admin_id`, `name`, `content`, `is_active`, timestamps.

## 4.6 Notifications Module Persistence (Planned)
- Ownership: notifications module is the sole owner of notification persistence schema and lifecycle.
- New table: `notifications_messages`
  - `id`, `recipient_user_id`, `type`, `channel` (`in_app` | `email`), `status`, `payload_json`, `created_at`, `updated_at`, `sent_at`, `expires_at`.
  - `status` examples: `queued`, `sent`, `failed`, `expired`.
- New table: `notifications_delivery_attempts`
  - `id`, `message_id`, `provider`, `status`, `error`, `attempted_at`.
- Message retention policy:
  - configurable retention window managed by notifications module.
  - default retention: 4 weeks from message creation.
  - cleanup job expires/deletes old notification payloads according to configuration.

## 4.7 Read Model Indexes
- Note: track selection is stored in `metadata_json.trackNos`, so no per-track SQL index is planned in MVP.
- `ranges_firing_lines`
  - `idx_ranges_firing_lines_range_sort` on (`range_id`, `sort_order`)
- `reservations_propositions`
  - `idx_props_line_date_time` on (`firing_line_id`, `event_date`, `start_time`, `end_time`)
  - `idx_props_user_date` on (`user_id`, `event_date`)
  - `idx_props_status_line_date` on (`status`, `firing_line_id`, `event_date`)
- `reservations_reservations`
  - `idx_res_line_date_time` on (`firing_line_id`, `event_date`, `start_time`, `end_time`)
  - `idx_res_prop_id` on (`proposition_id`)
  - `idx_res_range_date` on (`range_id`, `event_date`)
- `events_event_firing_lines`
  - `idx_event_lines_line` on (`firing_line_id`)
  - unique index `uidx_event_lines_event_line` on (`event_id`, `firing_line_id`)
- `users_admin_contact_profiles`
  - primary key on (`user_id`) covers lookup/index use.
- `users_admin_contact_profile_overrides`
  - `idx_admin_override_range_visible` on (`range_id`, `is_hidden_in_range`)
  - primary key on (`user_id`, `range_id`) covers uniqueness/index use.
- `notifications_messages`
  - `idx_notif_recipient_status_time` on (`recipient_user_id`, `status`, `created_at`)
  - `idx_notif_channel_status_time` on (`channel`, `status`, `created_at`)
- `notifications_delivery_attempts`
  - `idx_notif_attempt_message_time` on (`message_id`, `attempted_at`)

## 5. Backend Changes by Module
## 5.1 `common`
- Update DTO/contracts:
  - `CreatePropositionCommand` add `hasCoordinatorLicenseInGroup`, `targetAdminUserId?`.
  - `CreateReservationFromPropositionCommand` add `adminMessage`, `templateId?`.
  - Add booking scope fields: `firingLineId`, `trackNos[]`.
  - Add optional `metadata` object for non-searchable extension fields.
  - Reservation/proposition detail DTOs: replace coordinator-centric fields with admin-centric fields for new APIs.
- Add error types:
  - `MemberRoleRequiredError`
  - `PropositionDeclarationRequiredError`
  - `RangeAdminRoleRequiredError`
  - `InvalidTargetAdminError`

## 5.2 `reservations`
- Service authorization rewrite:
  - remove coordinator gating for conversion; enforce range-admin gating.
  - enforce member-only proposition creation.
  - enforce declaration present (`true` or `false`), with coordinator-role override to `true`.
- Repository updates for added columns.
- Conversion workflow:
  - resolve template (optional), apply admin edits, pass final message to notifications module.
  - create reservation with `approved_by_admin_id`.
  - create notifications command/events for member confirmation.
  - do not persist targeted-admin selection to reservation/proposition; emit it only in audit logs.
  - do not persist full admin message in reservation read model.
- Add scope validation:
  - exactly one firing line per booking.
  - each `trackNo` must satisfy `1 <= trackNo <= tracksCount` for selected firing line.
  - selected `trackNos` define the booking scope.
  - selecting all track numbers in the firing line is treated as full-line booking.
- Conflict detection rewrite:
  - conflict unit is (`firing_line_id`, `track_no`) overlap in time, resolved from `metadata_json.trackNos` within the fetched range+date dataset.
  - full firing line booking conflicts with any overlapping booking on any track in that firing line.
  - per-track booking conflicts with full-line bookings and same-track bookings.
  - overlapping booking for same user on different firing line is allowed.

## 5.3 `users`
- Add repositories/services for admin contact profile default + per-range override.
- Add query to resolve visible admin contacts for a given range.
- Restrict admin contacts query for viewer role `Member` or higher.

## 5.4 `ranges`
- Extend range detail DTO with `administratorContacts`.
- Populate contacts via users module integration at composition layer.
- Extend range detail DTO with `firingLines[]` including `tracksCount`.

## 5.5 `events`
- Extend event DTO/contracts with `firingLineIds[]`.
- On event creation/update, persist `events_event_firing_lines`.
- Conflict behavior:
  - events assigned to firing lines trigger conflict warning on overlapping times and assigned firing lines.
  - range admin can confirm and proceed despite event conflict.
  - events with zero firing lines do not block line calendars.

## 5.6 `notifications` (currently minimal)
- Add application service interface:
  - `notifyNewProposition(payload)`
  - `notifyPropositionConverted(payload)`
  - `notifyReservationCancelled(payload)`
- Implement in-app persistence first.
- Add email provider abstraction with noop/dev adapter initially, real provider later.
- Implement status transitions for each channel (`queued` -> `sent`/`failed` -> `expired`).
- Implement retention configuration with default value `4 weeks`.
- Expose maintenance method/job to purge expired notification payloads.

## 5.7 `worker`
- Update endpoints validation and response mappings:
  - `POST /api/v1/ranges/:rangeSlug/propositions`
  - `POST /api/v1/ranges/:rangeSlug/reservations`
  - `GET /api/v1/ranges/:rangeSlug` (include admin contacts)
  - public event signup endpoint authorization (Guest+ for Public events)
- Add endpoints for admin profile + templates:
  - `GET/PUT /api/v1/admin/profile`
  - `GET/PUT /api/v1/ranges/:rangeSlug/admin-profile`
  - `GET/POST/PUT/DELETE /api/v1/ranges/:rangeSlug/message-templates`
- Compose notifications service in `src/worker/src/index.ts`.

## 6. Frontend Changes (`src/client`)
- Calendar UI:
  - provide separate weekly calendar view per firing line in a range.
  - support quick switching between firing lines.
- Proposition form:
  - hide/disable for guests.
  - required coordinator-license declaration field.
  - if logged user has coordinator role: auto-checked true and disabled.
  - firing line selector.
  - booking scope toggle: `specific tracks` or `whole firing line` (UI convenience; submission always uses `trackNos` as source of truth).
  - track-number multi-select when `specific tracks` is selected.
  - optional specific-admin selector + "no notification" option.
- Admin proposition detail:
  - show declaration and overlap declaration context (same firing line/tracks).
  - template picker.
  - editable final message textarea.
  - convert action with conflict warning flow unchanged, including final time adjustments.
- Range detail page:
  - `Administrator Contacts` section from API.
- Admin settings:
  - global profile editor.
  - per-range override editor.
  - visibility toggles.
  - per-range template management.
- Notifications UI:
  - in-app notifications list for admins and members.

## 7. API-Level Acceptance Criteria
- Guest proposition create returns `403 member_role_required`.
- Member proposition without declaration returns `400 proposition_declaration_required`.
- Member proposition with declaration `false` is valid.
- Non-admin proposition conversion returns `403 range_admin_role_required`.
- Conversion success returns reservation and triggers member notification with `adminMessage`.
- Range detail includes only visible admin contacts and only for members/higher viewers.
- Targeted notification to specific admin works; when none selected no admin notification is sent.
- Targeted admin selection is not returned as persistent reservation/proposition field.
- Proposition/reservation request with track numbers outside selected firing line range returns `400 invalid_track_scope`.
- Whole firing line booking is inferred when `trackNos` contains all track numbers from selected firing line.
- Booking payload spanning multiple firing lines returns `400 multiple_firing_lines_not_allowed`.
- Same-user overlapping bookings on different firing lines are accepted.
- Booking requests overlapping with events assigned to the same firing line return conflict warning requiring explicit admin confirmation.
- Guest can sign up only to `Public` events; anonymous user cannot sign up.
- Reservation/proposition APIs do not expose/store full admin message body as persistent booking field.
- Notification records include channel status (e.g., email sent/failed) owned by notifications module.

## 8. Compatibility and Migration Contract
- No application-level backward compatibility is required.
- Legacy reservation columns are removed by migration (hard drop), since production has no legacy reservations to preserve.
- New non-searchable fields should be added to `metadata_json` first; add dedicated columns only when query needs prove it necessary.
- Migration strategy:
  - write/read only new line+track scope model.
  - no legacy mapping layer in services/repositories.
  - when lowering `tracks_count` for a firing line, reject changes that would invalidate future bookings whose `metadata_json.trackNos` contains values above `new_tracks_count`.
- All conversion/cancellation/time-change operations must emit audit log records including:
  - final `firingLineId`,
  - selected `trackNos`,
  - `adminMessageHash` (and optional short preview).
- Proposition creation audit must include:
  - submitted `targetAdminUserId` (or null),
  - whether targeted notification was requested and sent.

## 9. Delivery Plan (Phased)
1. Phase 1: Data foundations and documentation
   - Update `.ai/db-plan.md` with final schema decisions (firing lines with `tracks_count`, metadata-driven `trackNos`, notifications ownership).
   - Create DB migration(s) for new/changed tables and hard-drop obsolete reservation columns (`tracks_requested`, `coordinator_id`).
   - Update seed/mock data scripts in `mock-data/` to match new schema and required roles.
   - Update `tests-e2e/e2e-mock-data.sql` to match new schema and new happy paths (guest public-event signup, member/admin reservation flow).
   - Gate: migration applies cleanly on empty DB and reset flow works with updated mock data.
2. Phase 2: Shared contracts and domain types
   - Update `src/common` DTOs/commands/errors for firing-line + `trackNos` model and new authorization outcomes.
   - Remove legacy contract fields and align API payload/response types with metadata policy.
   - Gate: all workspace packages compile against updated common contracts.
3. Phase 3: Reservations and ranges core backend
   - Implement reservations service/repository changes for single firing-line bookings, `trackNos` validation, and conflict detection from range+date dataset.
   - Implement event-conflict warning flow with explicit admin confirmation capability.
   - Implement range read model extensions (`firingLines[]`, `tracksCount`, admin contacts projection).
   - Gate: unit/integration tests pass for create/convert/cancel, conflict confirmation, and track range validation.
4. Phase 4: Users/admin profiles and templates backend
   - Implement `users_admin_contact_profiles` (PK=`user_id`) and `users_admin_contact_profile_overrides` (PK=`user_id`,`range_id`).
   - Implement message templates CRUD and admin visibility rules for range detail.
   - Gate: role/visibility checks pass; API returns members-only contacts correctly.
5. Phase 5: Worker endpoints and composition
   - Update worker routes/validation/error-mapping for new commands and warning-confirmation semantics.
   - Add/adjust endpoints for admin profile, per-range overrides, message templates, and guest public-event signup authorization.
   - Wire notifications module services as table owner in composition root.
   - Gate: endpoint integration tests pass with expected HTTP codes and machine error codes.
6. Phase 6: Notifications module implementation
   - Implement notifications tables, state transitions (`queued/sent/failed/expired`), and delivery attempts.
   - Implement retention config with default 4 weeks and cleanup job path.
   - Ensure targeted admin selection is audit-only (request-time routing, not reservation persistence).
   - Gate: notification status flow and retention cleanup tests pass.
7. Phase 7: Frontend implementation
   - Implement per-firing-line calendar views and switching.
   - Implement member proposition form with `trackNos` selection, coordinator declaration behavior, and optional targeted admin notification.
   - Implement admin proposition conversion screen with template selection, editable message, and conflict confirmation.
   - Implement admin profile/override/template management UIs and members-only admin contacts rendering.
   - Gate: e2e UI flows pass for member, guest, and admin scenarios.
8. Phase 8: End-to-end stabilization and rollout readiness
   - Run full test suite (unit, integration, e2e) and fix regressions.
   - Verify audit log payload completeness (`firingLineId`, `trackNos`, message hash, targeted notification decision).
   - Update module READMEs/root README only where behavior/API/setup changed.
   - Gate: green CI-equivalent local run, migration + reset + e2e smoke all pass.

## 10. Testing Plan
- Unit:
  - role checks (member-only create, admin-only convert), declaration validation (including coordinator-role override), targeted notification selection.
  - firing-line scope validation (`firingLineId`, `trackNos` combinations).
- Integration:
  - reservations+users: admin role resolution and visible contacts.
  - reservations+notifications: proposition create/convert triggers.
  - worker endpoints: status/error code mapping.
  - reservations+ranges: one-firing-line constraint and track number range checks.
  - notifications retention cleanup and status transitions (`queued/sent/failed/expired`).
- E2E:
  - member creates proposition with declaration `false` and `true`.
  - coordinator-role user creates proposition and gets forced `true` declaration.
  - member creates proposition for whole firing line.
  - member creates proposition for selected tracks in same firing line.
  - member cannot submit tracks from different firing lines.
  - user can have parallel reservations at same time on different firing lines.
  - calendar switching between firing-line views works.
  - guest can sign up for public event.
  - anonymous user cannot sign up for public event.
  - optional specific admin notification path.
  - no-target path with no admin notification.
  - admin converts with template+edited message.
  - admin can adjust final reservation times before conversion.
  - admin sees overlapping declaration status on same firing line/tracks.
  - member receives in-app notification record.

## 11. Risks
- Existing code still contains legacy track/coordinator assumptions.
  - Mitigation: hard cutover to new contracts + focused migration scripts + regression tests.
- Notifications module is currently minimal.
  - Mitigation: implement queue/persistence contracts first, email provider second.
- Contact visibility edge-cases (global hide + per-range override).
  - Mitigation: deterministic precedence rules and dedicated tests.

## 12. Confirmed Decisions
1. `hasCoordinatorLicenseInGroup` can be `true` or `false`.
2. If no specific admin is selected, no admin notification is sent.
3. Admin contact section is visible to members (or higher) only.
4. Direct reservations are allowed for range admins only.
5. Coordinator-role users have declaration pre-set to `true` and locked in UI.
6. One proposition/reservation can include tracks from exactly one firing line.
7. Same user can have overlapping bookings at same time on different firing lines.
8. Events can be assigned to zero, one, or many firing lines.
9. Legacy columns may remain in DB but are removed from active models/contracts.
10. "Open for Joining" is removed from this iteration.
11. Event conflicts require admin confirmation (not hard block).
12. `trackNos` is the source of truth for booking scope.
13. Notifications module owns notification tables and status lifecycle.
14. Notification retention is configurable; default is 4 weeks.
