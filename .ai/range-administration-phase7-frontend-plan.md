# Phase 7 Frontend Plan - Range Administration

## 1. Purpose
This document plans frontend implementation for Phase 7 based on:
- `.ai/prd.md`
- `.ai/range-administration-implementation-plan.md`
- currently implemented backend endpoints/contracts.

Goal: implement UI/UX for range administration flow without omitting backend-delivered behavior from phases 1-6.

## 2. Backend Delta Checklist (What Frontend Must Reflect)
1. Booking scope changed from `tracksRequested` to:
- `firingLineId`
- `trackNos[]` (single firing line only)

2. Proposition creation authorization and required fields:
- only `Member` can create proposition
- `hasCoordinatorLicenseInGroup` required boolean
- optional `targetAdminUserId`

3. Conversion of proposition to reservation:
- only `Shooting Range Administrator` (or global admin)
- requires `adminMessage`
- supports optional final time changes + force conflict confirmation

4. Range details payload now includes:
- `firingLines[]`
- `administratorContacts[]` (visible only for authorized viewers)

5. Admin profile and overrides exist:
- global profile endpoint
- per-range override endpoint

6. Message templates exist per range:
- list/create/update endpoints
- template selection + editable final message expected in conversion UI

7. Notifications backend exists (in-app persistence + optional email), but no public API for listing notifications yet.

## 3. Endpoint Matrix for Frontend
## 3.1 Reservations/Calendar
- `GET /api/v1/ranges/:rangeSlug/events?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
  - source for calendar items (propositions/reservations/events/records)
  - key fields now: `firingLineId`, `trackNos`, proposition declaration flag

- `POST /api/v1/ranges/:rangeSlug/propositions`
  - body:
    - `eventDate`, `startTime`, `endTime`
    - `firingLineId`, `trackNos[]`
    - `hasCoordinatorLicenseInGroup`
    - optional `targetAdminUserId`, optional `metadata`

- `POST /api/v1/ranges/:rangeSlug/reservations?force=true|false`
  - direct reservation body:
    - `eventDate`, `startTime`, `endTime`, `firingLineId`, `trackNos[]`, optional `metadata`
  - conversion body:
    - `propositionId`, optional `eventDate/startTime/endTime`
    - required `adminMessage`
    - optional `templateId`, optional `metadata`

## 3.2 Range Details / Contacts
- `GET /api/v1/ranges/:rangeSlug`
  - required UI usage:
    - `firingLines[]` for booking and per-line calendar switch
    - `administratorContacts[]` for members+

## 3.3 Admin Contact Profiles
- `PATCH /api/v1/users/:userId/admin-contact-profile`
- `PATCH /api/v1/users/:userId/admin-contact-profile-overrides/:rangeId`

## 3.4 Message Templates
- `GET /api/v1/ranges/:rangeSlug/message-templates?includeInactive=true|false`
- `POST /api/v1/ranges/:rangeSlug/message-templates`
- `PATCH /api/v1/message-templates/:templateId`

## 3.5 Events Signup (Guest capability)
- Keep frontend aligned with guest/public-event signup flow already implemented in backend:
  - authenticated guest can sign up
  - anonymous user must be redirected to auth.

## 4. Frontend Workstreams
## 4.1 Calendar Refactor (Per Firing Line)
1. Add firing line selector/tabs on range calendar screen.
2. Maintain date navigation per current UX.
3. Filter/render events per selected `firingLineId`.
4. Keep records/events visualization in selected line context.

## 4.2 Proposition Form (Member)
1. Show form only for `Member`+.
2. Replace old capacity field with:
- `firingLineId` selector
- track picker (`trackNos[]`) with "whole line" quick action (select all track numbers)
3. Add required declaration checkbox/boolean:
- if user has `Coordinator` role -> checked + disabled.
4. Add optional targeted admin selector:
- source: `range.administratorContacts`
- option: "without notification" (no `targetAdminUserId`).
5. Update payload + error handling for new backend codes.

## 4.3 Proposition Detail + Admin Conversion
1. In proposition detail modal/page:
- show declaration status
- show line + tracks clearly
2. Conversion form:
- optional final date/time edits
- template picker (fetch templates)
- required editable `adminMessage`
3. Conflict flow:
- handle `reservation_force_required`
- show returned `conflicts[]`
- re-submit with `?force=true` after confirmation.

## 4.4 Direct Reservation (Admin)
1. Use same booking scope controls (`firingLineId`, `trackNos[]`).
2. Support whole-line shortcut.
3. Reuse conflict confirmation modal with `force=true` retry.

## 4.5 Range Admin Settings UI
1. Global admin contact profile editor.
2. Per-range override editor.
3. Visibility toggles:
- global hidden
- hidden in range
4. Message template management:
- list active/inactive
- create
- edit name/content
- activate/deactivate.

## 4.6 Range Detail UI
1. Add `Administrator Contacts` section for member+ views.
2. Render only API-provided contacts (already filtered by backend visibility).
3. Preserve guest/public range detail behavior.

## 5. Error Handling Contract (Frontend Mapping)
Handle at least:
- `member_role_required` -> proposition CTA hidden/disabled + explanatory message
- `coordinator_declaration_required` -> inline field validation
- `invalid_target_admin` -> admin selector validation message
- `invalid_reservation_time` / `invalid_time_window` / `range_closed`
- `reservations_not_available_for_ally_range` -> redirect/info state on non-bookable ranges
- `reservation_force_required` with `conflicts[]` -> confirmation modal
- `range_admin_role_required` -> block admin actions
- `message_template_not_found` -> refresh templates and prompt user to reselect

## 6. Known Backend Gap (Important for Phase 7 Scope)
Notifications UI requested in PRD cannot be fully implemented now because there is no frontend-facing API for:
- list notifications
- mark as read
- dismiss/delete user notifications

Additional API gap for proposition review UX:
- detail endpoints do not expose overlap declaration context (`same firing line/tracks/time`) required by PRD for admin review.
- proposal prepared in `.ai/range-administration-overlap-context-api-proposal.md`.

Decision for Phase 7:
- implement all reservation/admin/contact/template UI flows
- defer notifications inbox UI to follow-up backend API phase.

## 7. Delivery Sequence (Frontend)
1. Update API client types + mappers for new payloads/fields.
2. Implement per-line calendar switching.
3. Implement new proposition form with declaration + target admin.
4. Implement admin conversion flow (templates + editable message + force conflict modal).
5. Implement direct reservation updated form.
6. Implement admin profile/override/template settings screens.
7. Implement range detail contacts rendering.
8. Run/extend unit tests and e2e coverage.

## 8. Testing Plan for Phase 7
## 8.1 Unit/Component
- payload builders for proposition/reservation forms
- track selection logic (single/multi/all tracks)
- role-based field state (coordinator declaration forced true)
- error-code-to-UI mapping

## 8.2 Integration (frontend API)
- proposition create with/without `targetAdminUserId`
- conversion with template prefill + edited message
- force flow retry for reservation conflicts
- admin profile + override save
- template CRUD actions

## 8.3 E2E
- Member: create proposition with declaration false and no target admin
- Member+Coordinator: declaration auto-checked/disabled
- Admin: convert proposition with edited message and conflict confirmation
- Admin: direct reservation for selected tracks and whole line
- Member: sees administrator contacts on range page
- Guest: cannot create proposition, can sign up to public event

## 9. Definition of Done for Phase 7
1. All flows above implemented against current backend contracts.
2. No legacy `tracksRequested/coordinatorId` usage in frontend booking code.
3. Full frontend test suite green + selected e2e scenarios green.
4. No open blockers except explicit notifications inbox API gap.
