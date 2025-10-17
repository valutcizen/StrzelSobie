# API Endpoint Implementation Plan: POST /api/v1/ranges/{rangeSlug}/reservations

## 1. Endpoint Overview
- Enables coordinators (or higher authorities) to create confirmed reservations for a shooting range either directly or by converting an existing proposition.
- Centralizes validation, authorization, conflict detection, and auditing in the reservations application service while the worker translates service results to HTTP responses.
- Supports a two-phase workflow for overlapping time slots by returning a conflict warning unless the caller explicitly forces the creation.

## 2. Request Details
- HTTP Method: `POST`
- URL Structure: `/api/v1/ranges/{rangeSlug}/reservations`
- Parameters:
  - Required Path: `rangeSlug` (string, validated for non-empty, trimmed)
  - Optional Query: `force` (boolean-like flag; default `false`, parsed from `force=true`)
- Request Body:
  - Variant A – Direct Creation (`CreateReservationCommand`):
    ```json
    {
      "eventDate": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "numParticipants": number,
      "tracksRequested": number,
      "isPublic": boolean,
      "isJoinable": boolean
    }
    ```
  - Variant B – From Proposition (`CreateReservationFromPropositionCommand`):
    ```json
    {
      "propositionId": number,
      "startTime": "HH:MM?",  // optional adjustment
      "endTime": "HH:MM?",
      "tracksRequested": number?
    }
    ```
- Validation rules in worker (zod):
  - Dates in `YYYY-MM-DD`, real calendar date.
  - Times in `HH:MM`, 5-minute increments, `startTime` strictly before `endTime`.
  - `numParticipants` integer 1–50 (configurable via range total tracks if needed).
  - `tracksRequested` positive integer, later bounded by range capacity.
  - Booleans for `isPublic`/`isJoinable`.
  - Mutually exclusive body variants enforced by discriminated union (presence of `propositionId` determines variant).

## 3. Response Details
- Success (`201 Created`):
  - Body matches `CreatedReservationDto` (`id`, `rangeId`, `coordinatorId`, extendable for future fields).
  - `Location` header: `/api/v1/ranges/{rangeSlug}/reservations/{id}`.
- Errors:
  - `400 Bad Request`: validation failures, time window invalid, exceeds range tracks, conflict without `force` (include conflict metadata such as overlapping reservation ids/times).
  - `401 Unauthorized`: missing/invalid session (handled by middleware).
  - `403 Forbidden`: user not coordinator/admin for range, user marked deleted, proposition owned by someone else.
  - `404 Not Found`: range slug unknown, proposition missing or not linked to range.
  - `500 Internal Server Error`: repository/audit failures.
- Error bodies use existing error-mapper pattern (`mapReservationsError`) with new codes like `reservation_conflict`, `reservation_force_required`, `reservation_creation_failed`.

## 4. Data Flow
- Worker endpoint `src/worker/src/endpoints/v1/ranges/create-reservation.ts` (new):
  1. Authenticate via existing middleware, retrieving `session` and `user` (from KV-backed session).
  2. Validate params/query/body with zod; discriminate between direct vs proposition payload.
  3. Resolve services from context (`reservationsService`).
  4. Call new `reservationsService.createReservation(rangeSlug, payload, { force }, user)` returning `Result`.
  5. Map success to 201 + payload; map domain errors through updated `mapReservationsError`; log unexpected failures.
- Reservations application service:
  - Fetch range details through `IRangesService.getRangeDetails` to obtain `id`, `totalTracks`.
  - Authorize user (must hold global `Coordinator` or `Club/Community Administrator`, or range-specific `Coordinator`/`Shooting Range Administrator`; consider explicit helper).
  - Branch:
    - Direct create: validate command (reuse/refactor shared validator used by propositions; ensure tracks ≤ `totalTracks`).
    - Convert proposition: load proposition, ensure status `open`, ensure same range, lock it (mark converted) inside transaction, allow optional adjustments.
  - Calculate overlap via repository (`getOverlappingUsage`) including current proposition adjustments; if conflict and `force` false, return `ReservationConflictError` with colliding details.
  - On proceed:
    - Call repository to insert into `reservations_reservations` (storing `proposition_id` when applicable, booleans as integers).
    - Update proposition status to `converted` when applicable.
    - Record audit log via `IAuditService` with new action_type(s) (e.g., `RESERVATION_CREATE`, `RESERVATION_CONVERT`) and structured details.
    - Return `CreatedReservationDto`.
- Repository layer (`IReservationsRepository` + D1 implementation):
  - Provide methods for conflict lookup, proposition retrieval, transactional reservation insertion + status update; use prepared statements and explicit `BEGIN/COMMIT` to guarantee atomicity.
  - Convert between DB columns (`tracks_requested`, numeric booleans) and domain model.

## 5. Security Considerations
- Authentication relies on existing session token stored in KV; endpoint expects middleware to populate `user`.
- Authorization checks:
  - Allow only coordinators or admins (global or range-specific) to create reservations; use `UserRole` enums, verify range-specific roles from `user.rangeRoles`.
  - When converting proposition, ensure proposition belongs to same range and is still open; reject cross-range tampering.
- Prevent mass assignment by strictly mapping validated fields to command models.
- Sanitize/validate `force` flag to avoid bypass by non-privileged users.
- Limit information leakage in error payloads (do not expose internal IDs beyond what UI needs).
- Ensure audit trail captures user id, action, and payload for future security reviews.

## 6. Error Handling
- Domain errors:
  - `RangeNotFoundError`, `ForbiddenError`, `UnauthorizedPropositionError`, `InvalidReservationTimeError` (new), `ReservationConflictError`, `PropositionNotFoundError`, `PropositionAlreadyClosedError`.
  - Extend error mapper with new reservation-specific codes.
- Unexpected exceptions bubble through `Result.fail`, logged by `Result` helper (and optionally via `console.error` in worker).
- Conflict flow: repository provides overlapping reservation details; service returns `ReservationConflictError` with metadata (`conflicts`, `requiresForce`); worker serializes into 400 response explaining need for `force=true`.
- Ensure audit logging failure also returns `Result.fail` leading to 500 (cannot silently swallow to keep audit guarantees).

## 7. Performance
- Minimize queries: reuse existing `getOverlappingUsage` aggregate instead of multiple scans; consider extending to reuse results when converting proposition (deduct own proposition tracks).
- Use transactions sparingly to avoid long-lived locks; wrap create + proposition update in single transaction to prevent inconsistent state.
- Avoid loading full calendar data; repository queries filter by range/date.
- Ensure indexes exist on `reservations_reservations(range_id, event_date)` and `reservations_propositions(range_id, event_date)` (verify migrations; if missing, schedule follow-up).
- Validate inputs before DB access to short-circuit invalid requests.

## 8. Implementation Steps
1. Update shared contracts:
   - Add `createReservation` signature (with direct/proposition union and `force` boolean) to `IReservationsService` and export necessary command types from `@strzel-sobie/common`.
   - Introduce new domain errors (`InvalidReservationTimeError`, `ReservationConflictError`, `ReservationCreationError`) in `src/common/src/errors.ts` with descriptive messages and metadata shape.
   - Extend `CreatedReservationDto` if additional response fields needed (e.g., `propositionId`, `isPublic`, `isJoinable`) and ensure type remains backward-compatible.
   - Add required audit action types (`RESERVATION_CREATE`, `RESERVATION_CONVERT`) to `AuditLogEntry.action_type` union.
2. Extend reservations domain layer:
   - Update `IReservationsRepository` interface to include methods: `createReservation`, `createReservationFromProposition`, `markPropositionConverted`, `getOverlappingReservationsDetails`.
   - Define supporting domain models (e.g., `CreateReservationRecord`, `ReservationConflict`) for clarity.
3. Implement repository logic in `reservations.db.repository.ts`:
   - Map new DB columns accurately (`is_public`/`is_joinable` to booleans, `proposition_id`, etc.).
   - Add conflict-detail query returning overlapping reservation/proposition records (id, times, tracks) for error messaging.
   - Use explicit transaction statements (`BEGIN`, `COMMIT`, `ROLLBACK`) to guarantee atomic creation + proposition update.
4. Enhance `ReservationsService` (application layer):
   - Introduce shared validator for reservation time-window/tracks, reusing proposition logic where possible.
   - Implement direct creation path with authorization, capacity check, conflict detection (honoring `force` flag), repository call, and audit logging.
   - Implement proposition conversion path: fetch proposition, merge overrides, revalidate against range capacity, ensure ownership/range constraints, perform atomic conversion + reservation creation, audit with both proposition and reservation context.
   - Include detailed conflict metadata in `ReservationConflictError`.
5. Update worker utilities:
   - Expand `mapReservationsError` to translate new reservation errors to proper HTTP status codes and response bodies (including `forceRequired: true` flag).
6. Add new endpoint file `src/worker/src/endpoints/v1/ranges/create-reservation.ts`:
   - Define OpenAPI schema with discriminated union body and optional `force` query param.
   - Use context `user` from session, call service, and map responses to HTTP codes.
   - Set `Location` header on success.
7. Wire routing:
   - Register endpoint in worker router (likely in `src/worker/src/index.ts` or route aggregator) alongside existing range endpoints.
8. Testing:
   - Unit tests for `ReservationsService.createReservation` covering: unauthorized user, invalid time, exceeding tracks, conflict without force, force override success, proposition conversion (with and without overrides), audit failure handling.
   - Integration tests for repository (if feasible with in-memory D1) ensuring transaction integrity and conversion updates; otherwise, mock `IDatabase` statements.
   - Worker-level tests (using hono testing utilities) for validation and error mapping.
9. Documentation:
   - Update README(s) or API docs if needed to describe new endpoint usage and `force` behavior.
   - Ensure PRD alignment noted (coordinator workflow, conflict warning).
10. Post-change verification:
    - Run `npm run build:backend` and relevant tests.
    - Confirm audit log table schema supports new action types; add migration if action type enumeration enforced.
