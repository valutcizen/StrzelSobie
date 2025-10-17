# API Endpoint Implementation Plan: DELETE /api/v1/propositions/{propositionId}

## 1. Endpoint Overview
- Allow an authenticated user to cancel their own open proposition by marking its status as `cancelled`.
- Persist an audit log entry describing the cancellation.
- Ensure only the proposition owner (or future privileged roles) can perform the action.

## 2. Request Details
- **HTTP Method:** `DELETE`
- **URL Structure:** `/api/v1/propositions/{propositionId}`
- **Parameters:**
  - Required path `propositionId`: non-empty string convertible to a positive integer.
- **Authentication:** relies on `authMiddleware`; no anonymous access. User identity comes from session KV (do not query D1 directly).
- **Validation:** Worker endpoint (`zod`) enforces numeric format (`/^\d+$/`), trims whitespace, coerces to integer, rejects zero/negative values, and surfaces `400` on failure.
- **Request Body:** none.

## 3. Response Details
- **204 No Content:** proposition cancelled successfully.
- **400 Bad Request:** invalid identifier format, proposition already `cancelled`/`converted`, or other business-rule violations.
- **401 Unauthorized:** missing/invalid session token (handled by middleware).
- **403 Forbidden:** authenticated user is deleted or is not the proposition owner.
- **404 Not Found:** proposition does not exist.
- **500 Internal Server Error:** unexpected database or audit failure.
- Error payloads follow `{ code: string; message: string }`, mapped via `mapReservationsError`.

## 4. Data Flow
- Worker endpoint validates `propositionId`, obtains `user` from context, and builds `CancelPropositionCommand`.
- Calls `reservationsService.cancelProposition(command, user)` where:
  1. Service fetches proposition via repository (`getPropositionById`).
  2. Validates existence, ownership, `status === 'open'`, and `!user.isDeleted`.
  3. Invokes repository `cancelProposition` to update status.
  4. Emits audit entry (`PROPOSITION_CANCEL`) with actor and proposition metadata.
- Service returns `Result<void>`; worker maps to HTTP response using `mapReservationsError`.

## 5. Security Considerations
- Enforce ownership: compare `proposition.user_id` with `user.id`.
- Respect soft-deleted users: reject when `user.isDeleted` is truthy.
- Depend on session-derived identity; never trust client-supplied IDs.
- Avoid ID enumeration by returning `404` for missing propositions and `403` for unauthorized users without revealing additional information.
- Maintain audit trail for traceability.

## 6. Error Handling
- Introduce domain errors in `@strzel-sobie/common`:
  - `PropositionNotFoundError` → `404`.
  - `PropositionAlreadyClosedError` (covers status `cancelled` or `converted`) → `400`.
  - Reuse `UnauthorizedPropositionError` for ownership violations → `403`.
- Update `mapReservationsError` to translate these errors.
- Service wraps repository/audit exceptions with `Result.fail`; worker logs unexpected failures when status `500` is returned.

## 7. Performance Considerations
- Repository should use targeted queries (`SELECT` / `UPDATE ... WHERE id = ? AND status = 'open'`) to limit round trips.
- Ensure an index on `reservations_propositions.id` (primary key already exists) so lookups remain O(1).
- Keep handler pure/async; avoid extra calls (e.g., redundant range lookups).
- No heavy payloads; response is empty body, minimizing transfer overhead.

## 8. Implementation Steps
1. Extend `@strzel-sobie/common`:
   - Add `CancelPropositionCommand` to reservations DTOs.
   - Add error classes (`PropositionNotFoundError`, `PropositionAlreadyClosedError`) and export them.
   - Append `'PROPOSITION_CANCEL'` to `AuditLogEntry['action_type']`.
   - Update `IReservationsService` interface with `cancelProposition`.
2. Update reservations application layer:
   - Implement `cancelProposition` in `ReservationsService`, applying ownership/status/user checks and logging via `IAuditService`.
3. Update reservations domain/infrastructure:
   - Expand `IReservationsRepository` with `getPropositionById` and `cancelProposition`.
   - Implement SQL in `ReservationsDbRepository` (`SELECT` + conditional `UPDATE ... RETURNING`).
4. Adjust worker utility:
   - Enhance `mapReservationsError` to cover new error classes.
5. Add worker endpoint:
   - Create `src/worker/src/endpoints/v1/propositions/delete-proposition.ts` with `zod` validation and service call.
   - Register route in `src/worker/src/index.ts` and protect with `authMiddleware`.
6. Testing:
   - Unit tests for `ReservationsService.cancelProposition` (success, not owner, already closed, not found, deleted user).
   - Unit/integration tests for new repository methods (mock DB or use in-memory approach).
   - Worker endpoint tests validating status codes and error mapping.
7. Documentation & verification:
   - Ensure `.ai/api-plan.md` reflects new endpoint if required.
   - Run `npm run build:backend` (and targeted tests if available) to confirm compilation passes.
