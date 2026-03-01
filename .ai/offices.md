# Offices Range Type - Requirements and Implementation Plan

## 1. Goal

Introduce a new range type: `office` (Biuro Terenowe), and update map/navigation/catalog behavior so offices are handled separately from the main range catalog.

Meeting points (`meetup`) are out of scope for this iteration unless explicitly needed to keep compatibility.

## 2. Current Implementation (as-is)

- Range types are hardcoded in many places as: `club | ally | coming-soon | meetup`.
- Public map (`/map`) and catalog (`/catalog`) both load from `GET /api/v1/ranges`.
- Catalog currently includes all range types.
- Map markers and clusters are colorized by type in:
  - `src/client/src/components/range/RangeMap.vue`
  - `src/embed-map/src/embed-map.ts`
- Navigation has Map/Catalog entries in the drawer (`AppShell.vue`), but no dedicated “Biura Terenowe” entry.
- Embed map (`/embed/map`) always loads all map ranges via `/api/v1/map-ranges`; no type filtering config exists.

## 3. Scope and Requirements

### 3.1 Functional requirements

1. Add new range type `office` across backend, worker contracts, and client.
2. Offices must have a distinct marker/chip color on maps.
3. Map mode selector on `/map`:
   - `open club ranges`
   - `club ranges`
   - `ranges`
   - `all` (default)
   - `meetup` appears only in `all`
4. Add separate top menu item: `Biura Terenowe`.
5. `Biura Terenowe` view lists offices (meeting points postponed).
6. Existing range catalog (`/catalog`) must not show offices and must not show meeting points.
7. Embed map must support configuration for shown types.
8. For now, do not implement meeting-point-specific behavior beyond preserving existing functionality.
9. Update predefined test ranges in `mock-data/8990_add-mock-ranges.sql` to include office fixtures and keep deterministic test data.
10. Office info view must show only:
   - localization
   - details
   - address
   - phone (clickable tel link)
11. For offices, hide unrelated range information (calendar/reservation/track/operating-hours-oriented content), or provide a dedicated office info page.
12. Admin settings for offices must expose only fields that are used by office type.
13. When changing range type, audit log must include dropped/cleared data caused by the type switch.
14. `Biura Terenowe` must be placed at the top of the navigation list, above `Mapa strzelnic`.
15. All office-specific keys must be stored in JSON (`extras`) and not as top-level range columns.
16. On type change, if future reservations/events exist and would become unavailable, admin must receive an explicit warning confirmation step.
17. Embed map visibility must be controlled by backend configuration (no dependency on changing embed page URL/query parameters).
18. Office uses a separate view/page from range landing and must not be persisted as last viewed range.
19. Navigation label for the current entity item must be dynamic:
   - `Strzelnica` for non-office ranges
   - `Biuro terenowe` when current item is office
   - `Miejsce spotkań` when current item is meetup
20. Hardcoded range type unions must be removed from feature modules and centralized in `src/common` as a single source of truth.
21. `Biura Terenowe` page behavior:
   - default view shows only offices
   - user can switch filter to show meetups
   - filtering must use the current ranges endpoint with type filters (no separate hardcoded client-only filtering)

### 3.2 Derived behavior definitions (for implementation)

- `open club ranges`: `type === 'club'`
- `club ranges`: `type in ['club', 'coming-soon']`
- `ranges`: `type in ['club', 'ally', 'coming-soon']` (exclude `office`, `meetup`)
- `all`: all types including `office` and `meetup`

## 4. Implementation Plan

## Phase A - Shared contracts and backend domain

1. Extend type unions to include `office`:
   - `src/common/src/ranges/model.ts`
   - `src/ranges/src/domain/shooting-range.model.ts`
   - `src/ranges/src/infrastructure/ranges.db.repository.ts` (DB row typings)
2. Centralize range types in `src/common`:
   - define canonical shared `RangeType` (and optional helpers/constants) in common module.
   - replace duplicated literal unions (`club | ally | coming-soon | meetup`) across client, worker, embed-map, ranges, tests with shared type import.
   - keep one authoritative whitelist in common.
3. Update worker Zod schemas:
   - `src/worker/src/endpoints/v1/ranges/create-range.ts`
   - `src/worker/src/endpoints/v1/ranges/update-range.ts`
   - `src/worker/src/endpoints/v1/ranges/get-map-ranges.ts`
4. Keep reservation rule aligned with existing logic:
   - only `club` can have `allowsReservations = true`
   - `office` behaves like non-bookable informational type.

## Phase B - API filtering for map and office list

1. Add optional type filtering to `GET /api/v1/ranges`:
   - reuse existing client behavior (`type` query repeated via `URLSearchParams.append`).
   - worker route reads query params and forwards filters.
   - service/repository filter results (prefer repository-level SQL filter).
   - define OpenAPI request query schema explicitly (`type` repeatable).
   - define behavior for unknown type values (validation error vs ignored; recommended: `400`).
   - use this filtering for `Biura Terenowe` page modes (`office` default, `meetup` on switch).
2. Add optional type filtering to `GET /api/v1/map-ranges`:
   - support backend-provided effective type filter for embed scope only.
   - non-embed callers are unaffected by embed-specific filter policy.
   - query validation for unknown values returns `400`.
3. Optional dedicated office endpoint (recommended for clarity):
   - `GET /api/v1/offices` returning `type=office` only.
   - If avoided, `GET /api/v1/ranges?type=office` is enough.
4. Add preflight/admin-confirm support for type transitions:
   - before applying type change, check whether active/future reservations/events exist for the range.
   - return warning metadata requiring admin acknowledgement.
   - two-step flow:
     - step 1 preflight check
     - step 2 apply with confirmation token/flag
   - when no concerns are found, client performs step 2 automatically without extra admin prompt.

## Phase C - Client UI changes

1. Add `office` translation keys:
   - `rangeTypes.office` in `pl.json` and `en.json`
2. Add office visual style:
   - `RangeTypeBadge.vue` color/icon
   - `RangeMap.vue` marker style and z-index
3. Map mode selector on `RangeDirectoryView.vue`:
   - add local mode state and UI control (`v-select` or segmented buttons)
   - apply mode-based filtering before passing to `RangeMap`
4. Exclude `office` and `meetup` from `RangeCatalogView.vue`:
   - fetch with `types: ['club', 'ally', 'coming-soon']`
   - keep existing sort/filter logic on the reduced dataset
5. Add new offices page:
   - `src/client/src/views/OfficesView.vue`
   - uses existing `RangeList` with endpoint-filtered data
   - default filter: `type=office`
   - switch option: `type=meetup`
6. Navigation and routing:
   - add route `'/offices'` in `src/client/src/router/index.ts`
   - add `Biura Terenowe` in the existing navigation list (`v-navigation-drawer`) in `AppShell.vue`
   - no separate app-bar shortcut required
   - keep `Biura Terenowe` first in menu list (above map entry)
   - add i18n key under `navigation.offices`
   - ensure route order prevents `/:rangeSlug` from capturing `/offices` (register `/offices` before `/:rangeSlug`)
   - update dynamic current-entity label:
     - default `navigation.rangeInfo` for non-office
     - `navigation.officeInfo` for office
     - `navigation.meetupInfo` for meetup
7. Office info view:
   - create dedicated `OfficeLandingView.vue` route/view (selected approach).
   - render only localization, details, address, phone.
   - phone must be rendered as `tel:` link.
   - hide calendar CTA and non-office sections.
   - office data fields source:
     - common top-level: `displayName`, `latitude`, `longitude`, `type`
     - office-only data from `extras`: `address`, `phone`, `details`
8. Office-specific settings UI:
   - in `RangeSettingsView.vue`, switch form sections based on selected/current type.
   - for `office`, keep only used fields.
   - hide non-applicable fields (reservation/track/operating-hours/event toggles, etc.).
9. Type-change warning UX in settings:
   - when admin switches type, run preflight.
   - show warning dialog only if upcoming reservations/events exist.
   - confirmation text must clearly state data/availability impact.
   - require explicit confirm action before apply step when warnings exist.
   - auto-apply second step when preflight returns no concerns.

## Phase D - Embed map configuration

1. Add backend code configuration for embed map types:
   - keep config in Worker code (single source of truth), not in external env variable.
   - worker applies configured filter only for embed scope.
2. Update `src/embed-map/src/embed-map.ts`:
   - include `office` in type union + style map
   - no required query/config contract change on embed page side
3. Keep default behavior backward compatible:
   - if config is absent/empty => `all` types
4. Cache-awareness for Cloudflare:
   - keep explicit cache versioning in code and include version in cache key for `/embed/map` and `/embed/map.js`.
   - changing embed filter config requires bumping cache version in code.

## Phase E - Seed and mock data

1. Update predefined local mock data in `mock-data/8990_add-mock-ranges.sql`:
   - add at least one office row with realistic extras (`address`, `phone`, office details payload).
   - keep stable IDs/slugs to avoid flaky tests.
2. Add office fixture to e2e SQL:
   - `tests-e2e/e2e-mock-data.sql`
3. Ensure existing tests expecting exact list counts/order are updated.
4. Ensure office fixture supports new office info fields in `extras` (`address`, `phone`, `details`, optional `localizationLabel`).
4. Ensure office fixture supports new office info fields in `extras` (`address`, `phone`, `details`).

## Phase F - Type-transition and audit rules

1. Define canonical extras shape per type:
   - `office`: keep only office-relevant extras.
   - non-office types: keep existing range extras.
2. In `RangesService.updateRangeDetails` when `type` changes:
   - compute fields/extras that become invalid for target type.
   - policy decision: keep localization only (`displayName`, `latitude`, `longitude`, `slug`, `type`), drop all other type-specific data when switching to office and when switching back from office.
   - office-specific keys remain in `extras`; dropped during switch away from office.
   - clear dropped fields deterministically.
   - include a `droppedData` snapshot in audit details.
3. Audit payload for type changes should include:
   - previous type
   - next type
   - dropped fields list
   - dropped values snapshot (bounded to relevant fields only)
4. Type-change availability safety:
   - detect future reservations/events becoming unavailable due to new type.
   - enforce explicit admin acknowledgement before applying change.
   - include acknowledgement flag and affected counts in audit details.
5. Last viewed entity behavior:
   - do not store office slug in `lastRangeId`.
   - opening office should not affect range fallback redirect logic.

## 5. Test Plan

## 5.1 Unit tests

### Backend/service unit

- `tests/ranges/ranges.service.unit.tests.ts`
  - maps `office` in summaries/details.
  - `createRange` with `type: 'office'` forces `allowsReservations: false`.
  - `updateRangeDetails` switching to `office` forces `allowsReservations: false`.
  - type switch stores `droppedData` in audit payload.
  - type switch actually clears invalid fields/extras.

### Worker endpoint unit

- `tests/worker/endpoints/v1.ranges.get-ranges.unit.tests.ts`
  - supports type filtering query.
- new: `tests/worker/endpoints/v1.ranges.get-map-ranges.unit.tests.ts`
  - filters by type.
  - keeps coordinate validation.

### Client unit (targeted)

- Add focused unit tests for filter logic extracted to helper/composable:
  - map mode -> visible slugs
  - catalog exclusion of `office` and `meetup`
  - avoids fragile full-component tests as first step.
- Add focused tests for office presentation logic:
  - office info view renders localization/details/address/phone only.
  - phone is rendered as `tel:` link.
  - office settings mode hides non-applicable fields.

## 5.2 Integration tests

### Repository/service integration

- `tests/ranges/ranges.db.repository.integration.tests.ts`
  - `findAll` includes office rows correctly.
  - filter behavior (if repository handles filters).
- `tests/ranges/ranges.service.integration.tests.ts`
  - create/update/read office behavior with real DB.
  - type change persists cleared fields as expected and logs dropped data.

### Worker integration

- `tests/worker/integration/v1.ranges.get-ranges.integration.tests.ts`
  - verifies `type` query filtering.
  - verifies unknown `type` query handling as documented (`400` recommended).
- new: `tests/worker/integration/v1.ranges.get-map-ranges.integration.tests.ts`
  - verifies filtered payload + coordinates + office type schema.
- update `v1.ranges.update-range` integration:
  - verifies office field constraints and successful type transitions.
- add worker integration for type-change preflight/apply flow:
  - no concerns => automatic apply path valid.
  - concerns => acknowledgement required.

## 5.3 E2E tests (Playwright)

- Update `tests-e2e/range-directory.unauthenticated.spec.ts`:
  - verify map mode defaults to `all`.
  - verify switching modes changes marker/list dataset.
  - verify office marker appears with distinct type badge/color behavior.
- Add new spec: `tests-e2e/offices.unauthenticated.spec.ts`
  - `/offices` route visible from nav item `Biura Terenowe`.
  - office list visible.
  - office info page shows only localization/details/address/phone.
  - phone click target is a `tel:` link.
  - meeting points not required in this phase.
- Update catalog assertions:
  - `/catalog` must exclude office and meetup.
- Update admin settings e2e:
  - office type shows reduced settings fields only.
  - switching type triggers expected form changes.
  - switching type with upcoming reservations/events shows warning confirmation flow.
- Update nav label assertions:
  - current-item nav entry shows `Biuro terenowe` on office page and `Strzelnica` on range pages.
- Update last-viewed behavior e2e:
  - visiting office does not overwrite stored `lastRangeId`.

## 6. Acceptance Criteria

1. `office` can be created/updated via API and returned in range details.
2. `/map` supports 4 modes and defaults to `all`.
3. Offices render with a distinct map color/style.
4. Nav contains `Biura Terenowe` and route shows office list.
5. `Biura Terenowe` appears first in navigation menu and `/offices` route is not shadowed by `/:rangeSlug`.
6. `/catalog` excludes `office` and `meetup`.
7. Embed map supports range-type config and defaults to all.
8. Office info page contains only localization/details/address/phone (phone as `tel:` link).
9. Office-only keys are persisted in `extras` JSON.
10. Office settings show only applicable fields.
11. Type change with future reservations/events requires admin acknowledgement.
12. Type change audit entries include dropped data details and acknowledgement metadata.
13. Query schemas for range/map filters are documented in OpenAPI and tested (including invalid values).
14. Office page does not persist as last viewed range.
15. Current-entity nav label changes to `Biuro terenowe` when office is shown.
16. Current-entity nav label changes to `Miejsce spotkań` when meetup is shown.
17. Hardcoded per-module range type unions are replaced by shared type(s) from `src/common`.
18. `Biura Terenowe` page defaults to offices and supports meetup switch via endpoint filtering.
19. Unit/integration/e2e tests cover new behavior and pass.
## 7. Final Decisions

1. `Biura Terenowe` is added to the existing navigation list (`v-navigation-drawer`) only; no app-bar shortcut.
2. Office `extras` v1 schema is minimal:
   - `address` (string | null)
   - `phone` (string | null)
   - `details` (string | null)
3. No migration will be added for `office` type support (reuse existing TEXT `type` column).
4. Map mode semantics:
   - `open club ranges` => `type=club`
   - `club ranges` => `type in [club, coming-soon]`
   - `ranges` => `type in [club, ally, coming-soon]`
   - `all` => all range types
