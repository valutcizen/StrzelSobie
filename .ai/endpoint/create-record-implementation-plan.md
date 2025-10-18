# API Endpoint Implementation Plan: POST /api/v1/ranges/{rangeSlug}/records

## 1. Endpoint Overview
- Enable range administrators to manually log off-system shooting sessions (“Records”) so they contribute to reporting metrics without appearing as regular reservations.
- Accessible only to authenticated users with administrator privileges for the target range (or equivalent club admin).
- Persists a row in `reservations_records` and emits an audit trail entry describing the manual record.

## 2. Request Details
- HTTP Method: `POST`
- URL Structure: `/api/v1/ranges/{rangeSlug}/records`
- Parameters:
  - Required path: `rangeSlug` (non-empty, trimmed string).
  - No query parameters.
- Request Body (`application/json`, required):
  ```json
  {
    "eventDate": "YYYY-MM-DD",
    "startTime": "HH:MM",
    "endTime": "HH:MM",
    "numParticipants": <integer>
  }
  ```
- Validation rules:
  - `eventDate` must match ISO date format and be a real calendar date.
  - `startTime`/`endTime` must match 24h `HH:MM`, represent valid clock values, align to 5-minute increments (consistent with reservation flows), and `endTime` must be later than `startTime`.
  - `numParticipants` coerced to integer ≥ 1 (cap at a sensible upper bound, e.g. 500, to prevent bogus data).
  - Reject payloads containing unknown properties (use `.strict()`).
  - Range slug validation happens via `rangesService.getRangeDetails`/`getRangeIdBySlug`.

## 3. Used Types
- `CreateRecordCommand` (existing) from `src/common/src/reservations/dto.ts` – represents camelCase payload forwarded to the service/repository.
- `Record` (existing) from `src/common/src/reservations/model.ts` – describes DB entity columns; use for mapping results.
- **New** `CreatedRecordDto` in `src/common/src/reservations/dto.ts` – response DTO with `id`, `rangeId`, `adminId`, `eventDate`, `startTime`, `endTime`, `numParticipants`, `createdAt`.
- **New** `CreateRecordResult` (or reuse `Result<CreatedRecordDto>`) exported via `src/common/src/index.ts`.
- Extend `IReservationsService` (`src/common/src/reservations/service.ts`) with `createRecord(rangeSlug: string, command: CreateRecordCommand, user: UserDto): Promise<Result<CreatedRecordDto>>`.
- Introduce domain types in `src/reservations/src/domain/reservations.repository.ts`: `CreateRecordData` and `RecordEntity`, plus `createRecord` signature.
- Update infrastructure repository (`src/reservations/src/infrastructure/reservations.db.repository.ts`) to map between DB rows and `Record`.
- **New errors** in `src/common/src/errors.ts`: `InvalidRecordTimeError` (invalid window), `RecordCreationError` (failed insert); reuse `ForbiddenError` for authorization failures.
- Extend `AuditActionType` enum in `src/common/src/audit/model.ts` with `'RECORD_CREATE'`.

## 4. Response Details
- Success (`201 Created`):
  - Body: `CreatedRecordDto`.
  - Headers: `Location: /api/v1/ranges/{rangeSlug}/records/{id}`.
- Error responses (body structure aligned with existing error mapper):
  - `400 Bad Request` for validation errors (payload/time ordering/participant bounds).
  - `401 Unauthorized` handled by auth middleware when session missing/invalid.
  - `403 Forbidden` when user lacks range admin privileges.
  - `404 Not Found` when `rangeSlug` does not correspond to a known range.
  - `500 Internal Server Error` for repository/audit failures or unexpected exceptions.

## 5. Data Flow
1. Cloudflare Worker route (`create-record` endpoint) validates `rangeSlug` param and JSON body with `zod`.
2. Worker fetches `reservationsService` and authenticated `user` (from session hydrated via KV-backed auth middleware).
3. Call `reservationsService.createRecord(rangeSlug, validatedCommand, user)`.
4. Service responsibilities:
   - Use `rangesService.getRangeDetails(rangeSlug)` (or `getRangeIdBySlug`) to resolve `rangeId`; propagate error via `Result.fail` if not found.
   - Evaluate `getRangeRole(user, rangeId)` to confirm admin (or club admin) access.
   - Perform business validation (time ordering, optionally align to range hours if those constraints exist, guard `numParticipants` range).
   - Construct domain `CreateRecordData` containing `range_id`, `admin_id` (`user.id`), event data, timestamps, participants.
   - Invoke `reservationsRepository.createRecord(data)` to insert into `reservations_records` and obtain persisted record.
   - Emit `auditService.logAction({ action_type: 'RECORD_CREATE', target_id: record.id, details: {...} })`; wrap in error handling so audit failure converts to `Result.fail`.
   - Return `Result.ok(marshaled CreatedRecordDto)` or `Result.fail(new RecordCreationError(...))`.
5. Worker maps `Result` to HTTP: on success set `Location` header and return DTO; on failure use/extend `mapReservationsError` to translate error to status/body; log unexpected errors with context.

## 6. Security Considerations
- Endpoint sits behind `authMiddleware`, guaranteeing a validated session (originates from KV) before execution.
- Service ensures only users with `UserRole.ShootingRangeAdministrator` for the resolved range (or club admin global role) can create records; deny deleted users as well if that pattern is used elsewhere.
- Prevent cross-range tampering by always deriving `rangeId` from slug server-side rather than trusting input.
- Use prepared statements via `IDatabase` to avoid SQL injection; never interpolate strings.
- Do not leak sensitive audit/user details in HTTP responses; return only required record metadata.

## 7. Error Handling
- Zod validation failures -> respond `400` with structured error array (ChanFana handles by throwing `ValidationError`).
- `RangeNotFoundError` from range service -> map to `404`.
- `ForbiddenError`/`Unauthorized` (e.g., not an admin, deleted user) -> map to `403`.
- `InvalidRecordTimeError` (bad start/end) -> map to `400`.
- `RecordCreationError` or audit/logging issues -> map to `500`.
- Unexpected exceptions in worker -> catch, log via `console.error`, return `500` with generic message.
- Extend `mapReservationsError` (or introduce shared mapper) to include new record-related errors so mapping logic stays centralized.

## 8. Performance Considerations
- Operation is a single-row insert plus lightweight range lookup; ensure no unnecessary multi-query cycles (reuse existing `getRangeDetails`/`getRangeIdBySlug` result).
- Wrap repository insert and audit log in minimal sequential flow; audit logging is separate insert—consider running sequentially to maintain deterministic audit entry creation.
- Ensure repository returns only required columns to keep payload small.
- No additional caching needed; manual record volume expected to be low.

## 9. Implementation Steps
1. **Shared contracts**: Add `CreatedRecordDto`, export it and `CreateRecordCommand`/`Record` as needed; extend `AuditActionType` with `'RECORD_CREATE'`; introduce `InvalidRecordTimeError` and `RecordCreationError`; update `src/common/src/index.ts` exports.
2. **Service interface**: Update `IReservationsService` to declare `createRecord` and re-export updated interface; adjust any consuming modules/build artefacts.
3. **Domain layer**: Add record-specific types and repository method signature to `src/reservations/src/domain/reservations.repository.ts`.
4. **Infrastructure layer**: Implement `createRecord` in `ReservationsDbRepository` with proper column mapping to `reservations_records`; include helper mapper for DB row -> domain `Record`.
5. **Application layer**: Implement `ReservationsService.createRecord` with role checks, validation, repository call, audit logging, Result wrapping, and consistent error raising.
6. **Error mapping**: Update `src/worker/src/utils/reservations-error-mapper.ts` to translate new record-related errors to HTTP responses.
7. **Worker endpoint**: Create `src/worker/src/endpoints/v1/ranges/create-record.ts` defining schema (params/body), calling service, handling results, setting `Location` header, and documenting responses.
8. **Routing**: Register the new endpoint in `src/worker/src/index.ts` with `authMiddleware`.
9. **Tests**: 
   - Unit tests for `ReservationsService.createRecord` (success, forbidden, invalid time, audit failure).
   - Repository test (if integration harness exists) validating insert and mapping.
   - Worker endpoint tests (vitest + mock services) covering 201/400/403/404 paths.
10. **Documentation & verification**: Update any README/OpenAPI references if required, run `npm run build:backend` and relevant tests to confirm no regressions.
