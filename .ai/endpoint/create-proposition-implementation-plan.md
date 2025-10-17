# API Endpoint Implementation Plan: POST /api/v1/ranges/{rangeSlug}/propositions

## 1. Endpoint Overview
- Provide authenticated Guests and Members a way to create a shooting-session proposition for a specific range.
- Persist propositions in `reservations_propositions` with status `open`, tied to the requesting user and range.
- Enforce range capacity (tracks) and scheduling constraints before accepting the request.
- Emit audit logs (and prepare for coordinator notifications) whenever a proposition is stored.

## 2. Request Details
- HTTP Method: `POST`
- URL Structure: `/api/v1/ranges/{rangeSlug}/propositions`
- Parameters:
  - Required path: `rangeSlug` (string, slug of the target range).
  - No query parameters.
- Request Body (JSON, required fields):
  - `eventDate` (`YYYY-MM-DD`, must be a valid calendar date).
  - `startTime` (`HH:MM`, 24h, minutes aligned to 5-minute increments).
  - `endTime` (`HH:MM`, strictly later than `startTime`, same-day).
  - `numParticipants` (integer ≥ 1).
  - `tracksRequested` (integer ≥ 1, ≤ total tracks for range).
- Validation rules (Worker-layer via zod):
  - All fields required and trimmed.
  - Coherent time window (`startTime` < `endTime`, same date).
  - `numParticipants` reasonable upper bound (follow business rule or default e.g. ≤ 50 until configurable).
  - `tracksRequested` cannot exceed range capacity and can be zero.

## 3. Used Types
- `CreatePropositionCommand` and `CreatedPropositionDto` from `@strzel-sobie/common/src/reservations/dto`.
- Extend `IReservationsService` to expose `createProposition(rangeSlug: string, command: CreatePropositionCommand, user: UserDto): Promise<Result<CreatedPropositionDto>>`.
- Add domain errors within reservations module (e.g., `PropositionConflictError`, `InvalidPropositionTimeError`, `UnauthorizedPropositionError`) extending `Error`.
- Update `AuditLogEntry['action_type']` union to include `'PROPOSITION_CREATE'`.
- Use `UserDto` (from `@strzel-sobie/common/src/users/dto`) inside the service to access global and range roles.
- Repository-level DTOs for propositions/reservations should keep snake_case mapping consistent with DB schema.

## 4. Response Details
- Success (`201 Created`): body shaped as `CreatedPropositionDto` (id, userId, rangeId, status) with optional `Location` header pointing to `/api/v1/ranges/{rangeSlug}/propositions/{id}` (future-proof).
- Client Error (`400 Bad Request`): validation failures (format, ordering, capacity conflicts) or business-rule violations (outside operating hours once enforced).
- Unauthorized (`401`): session missing/invalid (handled by middleware before handler).
- Forbidden (`403`): authenticated user lacks required role (e.g., banned or missing Guest/Member privilege).
- Not Found (`404`): range slug does not map to an existing range.
- Server Error (`500`): unexpected infrastructure failures (D1 insert fail, audit logging failure, unhandled exceptions).
- Worker maps service `Result` errors to HTTP codes without leaking internal stack traces; include machine-friendly `code` and human-readable `message` in error payloads.

## 5. Data Flow
- Worker `authMiddleware` resolves session from KV, loads user profile via `userService`, and attaches `user` + `session` to context.
- New endpoint `src/worker/src/endpoints/v1/ranges/create-proposition.ts`:
  1. Parse `rangeSlug` and body with zod schema.
  2. Obtain `reservationsService` and `user` from context.
  3. Call `reservationsService.createProposition(rangeSlug, command, user)`.
  4. Inspect `Result`: on success respond `201` with DTO; on failure map known errors to appropriate status and JSON error body.
- Reservations application service (`ReservationsService`):
  1. Derive `rangeId` and validate user authorization (Guest/Member/global admin/coordinator acceptance rules via roles).
  2. Validate command semantics (time ordering, track bounds, optional operating-hours window) using pure domain logic.
  3. Persist proposition via repository (insert returning id/status).
  4. Emit audit log via `auditService.logAction({ action_type: 'PROPOSITION_CREATE', target_id: newId, details: { userId, rangeId, command } })`.
  5. Return `Result.ok` with `CreatedPropositionDto`.
- Repository layer (`ReservationsDbRepository`):
  - Provide `createProposition` (INSERT) and `getOverlappingUsage(rangeId, eventDate, startTime, endTime)` that returns aggregated tracks usage from propositions (`status='open'`) and reservations, using prepared statements.
  - Ensure consistent mapping between DB column names and domain model (e.g., `tracks_requested` ↔ `tracksRequested`).
- Worker router `index.ts` registers endpoint and ensures `reservationsService` plus `auditService` are bound in context.

## 6. Security Considerations
- Require `authMiddleware` for the route to ensure authenticated session from KV.
- Authorize only users with global role `Guest`, `Member`, or higher (e.g., `Coordinator`); optionally reject disabled users if `user.isDeleted`.
- Prevent privilege escalation by ignoring `userId` in payload and using session-derived value.
- Validate all inputs server-side to mitigate tampering (e.g., extremely long strings, SQL injection; prepared statements already mitigate injection).
- Consider rate limiting (future) to avoid proposition spam.
- Ensure audit log contains non-sensitive details (no raw session tokens).
- Do not expose internal error messages in responses.

## 7. Error Handling
- Map domain errors to HTTP codes:
  - `RangeNotFoundError` → `404`.
  - `UnauthorizedPropositionError` / `ForbiddenError` → `403`.
  - `PropositionConflictError`, `InvalidPropositionTimeError`, validation issues → `400`.
  - Unexpected errors (repository failures, audit service failure) → `500`.
- Use `Result.fail` consistently; avoid throwing except for truly unexpected cases, which are caught and converted to `Result.fail`.
- Worker should log unexpected errors (e.g., via `console.error`) before returning `500`.
- Audit logging occurs only after successful insert; if audit write fails, decide whether to treat as hard failure (`500`) or log fallback—document strategy (prefer fail to keep audit trail consistent).

## 8. Performance Considerations
- Minimize DB calls by:
  - Fetching range details once.
  - Using a single query to compute overlapping track usage, possibly with UNION or SUM across propositions/reservations.
- Keep worker endpoint lean: instantiate services once per request via middleware (already in place) and avoid unnecessary JSON parsing.
- Consider wrapping insert + audit log in a transaction if D1 supports it; otherwise ensure audit failures are surfaced promptly.

## 9. Implementation Steps
1. Update shared contracts:
   - Extend `AuditLogEntry['action_type']` union with `'PROPOSITION_CREATE'`.
   - Update `IReservationsService` interface and re-export typings.
   - Add domain error classes in common/reservations or reservations module (and export as needed).
2. Expand reservations domain & repository interfaces with `createProposition` and overlap-check methods; document expected return types.
3. Implement repository methods in `ReservationsDbRepository` (conflict query + insert with last inserted id and default status).
4. Refactor `ReservationsService`:
   - Inject `IAuditService` (and `INotificationsService` placeholder if available).
   - Implement `createProposition` method with validation, conflict detection, persistence, audit logging, and error-to-Result mapping.
5. Update worker composition (`src/worker/src/index.ts` & `types.ts`):
   - Instantiate `AuditService`/`AuditDbRepository` and inject into `RangesService` and `ReservationsService`.
   - Add `reservationsService`, `auditService`, and `user` to context typing.
   - Register new POST route with `authMiddleware`.
6. Implement new endpoint handler `create-proposition.ts` with zod schema, dependency resolution, service invocation, and HTTP response mapping.
7. Ensure `Result` error mapping utility (if available) or add helper to translate domain errors to HTTP codes consistently (optionally shared).
8. Update documentation if required (e.g., root `README.md` endpoint listings) after evaluating instructions.
9. Run formatting/build/test commands (`npm run build:backend`) to confirm integrity once implementation is done.
