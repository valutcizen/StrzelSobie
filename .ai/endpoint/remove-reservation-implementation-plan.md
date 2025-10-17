# API Endpoint Implementation Plan: Delete Reservation

## 1. Endpoint Overview
- Provide coordinators and range administrators with the ability to cancel a confirmed reservation through `DELETE /api/v1/reservations/{reservationId}`.
- Removing a reservation frees the reserved time slots and records the action in the audit log for traceability.

## 2. Request Details
- HTTP Method: `DELETE`
- URL Structure: `/api/v1/reservations/{reservationId}`
- Parameters:
  - Required path parameter `reservationId` – must be a positive integer encoded as a numeric string.
- Authentication: Requires an authenticated session resolved from KV-stored session data; worker middleware must inject `user` into the context.
- Authorization expectation: Caller must hold a coordinator-level privilege (global `Coordinator`/`ClubCommunityAdministrator` or range-specific `Coordinator`/`Shooting Range Administrator`).
- Request Body: None.

## 3. Response Details
- `204 No Content` on successful cancellation.
- Error responses (JSON with `{ code, message }`):
  - `400 Bad Request` for invalid `reservationId` path value or business-rule validation failures surfaced from the service.
  - `401 Unauthorized` when no valid session is present (handled by existing middleware).
  - `403 Forbidden` when the user lacks coordinator privileges for the reservation’s range or the user account is flagged as deleted.
  - `404 Not Found` when the targeted reservation does not exist (or is hidden to avoid leaking availability).
  - `500 Internal Server Error` when repository or audit logging fails unexpectedly.

## 4. Data Flow
- Worker endpoint validates the route parameter with Zod, retrieves the authenticated `user` from the context, and builds a `CancelReservationCommand`.
- Worker invokes `reservationsService.cancelReservation(command, user)` from the application layer.
- Service loads the reservation via `IReservationsRepository.getReservationById`, returning a typed domain model.
- Service checks authorization against the caller’s global and range-scoped roles and optionally compares `coordinator_id` for additional assurance.
- On success, service asks the repository to remove the reservation (using a transactional `deleteReservation` that returns the deleted row), then emits an audit entry (`RESERVATION_CANCEL`) via `IAuditService.logAction`.
- The service returns a `Result<void>` to the worker; the worker maps success to `204` or forwards structured errors through the existing reservations error mapper.

## 5. Security Considerations
- Strict Zod validation prevents non-numeric or negative IDs from reaching the service.
- Authorization logic must ensure only coordinators/administrators for the reservation’s range (or global coordinators) can cancel; treat non-authorized access as `ForbiddenError`.
- Avoid leaking reservation existence to unauthorized callers by returning 404 for missing reservations and 403 only when a reservation is visible but access is denied.
- Continue to rely on KV-backed session data injected by middleware; no direct D1 lookup of user identity.
- Log unexpected failures (`console.error`) before returning 500 to aid incident investigations.

## 6. Error Handling
- Introduce `ReservationNotFoundError` and `ReservationCancellationError` in `@strzel-sobie/common` to distinguish lookup failures and delete/audit issues.
- Extend `mapReservationsError` to translate new reservation errors to the correct HTTP status codes and payloads.
- Propagate audit logging failures as `ReservationCancellationError` to ensure the operation is atomic—no silent cancellations without audit entries.
- Ensure repository methods throw typed errors (or return `null`) so the service can map to `Result.fail` consistently.

## 7. Performance
- Operation affects a single reservation row; use indexed lookups by primary key for `getReservationById` and `deleteReservation` to keep latency minimal.
- Wrap delete + audit preparation in a transaction if multiple statements are required to avoid inconsistent state under concurrent cancellation attempts.
- No additional caching is required; cancellation is expected to be low-volume compared with reads.

## 8. Implementation Steps
1. Update shared contracts in `src/common/src/reservations/dto.ts` with `CancelReservationCommand` and extend `IReservationsService` to include `cancelReservation`.
2. Introduce reservation-specific error classes (`ReservationNotFoundError`, `ReservationCancellationError`) and, if needed, helper typings; update exports and consumers.
3. Expand `AuditActionType` in `src/common/src/audit/model.ts` to include `RESERVATION_CANCEL`.
4. Extend `IReservationsRepository` with `getReservationById` and `deleteReservation`; implement them in `ReservationsDbRepository` using prepared statements (and transactions if required), returning the deleted reservation data for auditing.
5. Implement `cancelReservation` in `ReservationsService`, covering: deleted-user guard, reservation lookup, coordinator privilege checks (reusing or extracting helper logic), repository deletion, audit logging, and `Result` mapping; ensure unauthorized cases return `ForbiddenError`.
6. Update `mapReservationsError` to convert the new reservation errors into consistent HTTP responses.
7. Add the worker endpoint at `src/worker/src/endpoints/v1/reservations/delete-reservation.ts` with an OpenAPI schema, Zod validation, command assembly, service invocation, and error mapping; log unexpected failures and return `204` on success.
8. Register the new route in `src/worker/src/index.ts` with `authMiddleware`.
9. Create unit tests for `ReservationsService.cancelReservation` covering success, unauthorized, missing reservation, deleted user, repository/audit failures; mirror existing test patterns in `tests/reservations`.
10. Add integration/endpoint tests (or contract tests) validating worker behavior, ensuring response codes align with mocked service results and parameter validation rejects bad inputs.
11. Verify whether documentation (project README or backend module docs) needs updates; amend if the exposed API surface changes warrant it.
12. Run `npm run test` (or targeted test suites) and `npm run build:backend` to ensure new logic compiles and passes lint/test pipelines.
