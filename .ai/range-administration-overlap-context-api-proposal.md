# Overlap Declaration Context API Proposal

## 1. Goal
Enable frontend to show coordinator-license declaration context for overlapping bookings on the same firing line/tracks during proposition review and reservation detail.

## 2. Scope
Applies to details endpoints:
- `GET /api/v1/propositions/:propositionId`
- `GET /api/v1/reservations/:reservationId`

No change to calendar list endpoint is required in MVP.

## 3. Proposed DTO Extension

## 3.1 New shared DTO
```ts
export type OverlapDeclarationContextItemDto = {
  type: 'proposition' | 'reservation';
  id: number;
  eventDate: string;
  startTime: string;
  endTime: string;
  firingLineId: number;
  trackNos: number[];
  hasCoordinatorLicenseInGroup: boolean | null;
};
```

## 3.2 Proposition detail extension
```ts
export type PropositionDetailDto = {
  // existing fields...
  overlapDeclarationContext?: OverlapDeclarationContextItemDto[];
};
```

## 3.3 Reservation detail extension
```ts
export type ReservationDetailDto = {
  // existing fields...
  overlapDeclarationContext?: OverlapDeclarationContextItemDto[];
};
```

Notes:
- Keep this field optional for compatibility during rollout.
- `hasCoordinatorLicenseInGroup` for reservations should be derived from reservation metadata if present.
- Exclude the current item itself from the overlap list.

## 4. Computation Rules
Backend should compute overlap context using existing conflict logic primitives:
1. Same `eventDate`.
2. Same `firingLineId`.
3. Time overlap (`start < other.end && end > other.start`).
4. Track overlap based on `trackNos` intersection.

Returned list should include both:
- overlapping open/converted/cancelled propositions (decision: include only open+converted recommended),
- overlapping reservations.

Recommended MVP filter:
- propositions: `status IN ('open', 'converted')`
- reservations: all active reservations.

## 5. Ordering
Return `overlapDeclarationContext` sorted by:
1. `startTime` ASC
2. `type` (`reservation` before `proposition`)
3. `id` ASC

## 6. Authorization
Reuse existing detail endpoint authorization. No additional permission surface.
If user can view proposition/reservation detail, they can view overlap declaration context for that item.

## 7. Error Handling
No new error codes needed.
On computation failure, endpoint should still return detail and set:
- `overlapDeclarationContext: []`

## 8. Frontend Rendering Contract
Frontend can render section:
- Title: "Nakładające się zgłoszenia/rezerwacje (deklaracja prowadzącego)"
- Per item:
  - booking type + id,
  - time range,
  - track list,
  - declaration state (`tak` / `nie` / `brak danych`).

## 9. Tests Required

## 9.1 Unit tests (reservations service)
- returns overlap items for proposition detail (same line/tracks/time).
- returns overlap items for reservation detail.
- excludes non-overlapping tracks and other firing lines.
- excludes current entity from the list.

## 9.2 Integration tests (worker endpoints)
- `GET /propositions/:id` includes `overlapDeclarationContext`.
- `GET /reservations/:id` includes `overlapDeclarationContext`.

## 10. Rollout Plan
1. Extend common DTOs.
2. Implement service aggregation in reservations module.
3. Return new field in worker endpoints.
4. Add frontend section in `EventDetailDialog`.
5. Remove optional handling once all environments are migrated.
