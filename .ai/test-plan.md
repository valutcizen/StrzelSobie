# Test Plan

## Testing Strategy

Our testing strategy will follow the testing pyramid model:

1.  **Unit Tests (Base of the pyramid):** These will form the largest part of our testing suite. They'll test individual functions and components in isolation using `vitest`. All external dependencies will be mocked.
2.  **Integration Tests (Middle of the pyramid):** These will verify the interactions between different modules of the application (e.g., service to database, service to service). We'll continue using `vitest` for these, but with real database connections to a test database.
3.  **End-to-End (E2E) Tests (Top of the pyramid):** These will simulate real user workflows from the frontend to the backend. We will use the Playwright framework for these tests.

### E2E Testing Conventions

*   **Seeded accounts:** The E2E database seed ships with deterministic users. Passwords follow the pattern `<local-part>password` (e.g. `adminpassword`). Quick reference:

    | Email                           | Primary roles (global unless noted)                                            | Password              |
    |---------------------------------|--------------------------------------------------------------------------------|-----------------------|
    | `admin@e2e.com`                 | Club/Community Administrator                                                   | `adminpassword`       |
    | `coordinator@e2e.com`           | Coordinator, Member, Guest                                                     | `coordinatorpassword` |
    | `member@e2e.com`                | Member, Guest                                                                  | `memberpassword`      |
    | `guest@e2e.com`                 | Guest                                                                          | `guestpassword`       |
    | `confirmator@e2e.com`           | Confirmator                                                                    | `confirmatorpassword` |
    | `rangeadmin@e2e.com`            | Shooting Range Administrator (range 99)                                        | `rangeadminpassword`  |
    | `user-to-be-promoted@e2e.com`   | Guest (used for confirmator upgrade scenarios)                                 | `user-to-be-promotedpassword` |
    | `standard-user@e2e.com`         | Member, Guest (stable login/logout scenarios)                                  | `standardpassword`    |

*   **Page Object Model (POM):** Structure E2E tests using the Page Object Model pattern. Each page or significant component in the application should have a corresponding class that encapsulates the selectors and methods for interacting with that part of the UI. This improves test maintenance and readability.
*   **Selector guidelines:** Prefer `data-testid` attributes for locating elements to decouple tests from implementation details like CSS classes or DOM structure. When `data-testid` is not available, use accessible queries (`getByRole`, `getByLabel`, `getByText`) to keep tests resilient to layout changes. When interacting with Vuetify menus or dialogs, close the overlay (`await combobox.press('Escape')`) before clicking primary actions to avoid pointer interception timeouts.
*   **Localized strings:** UI copy is sourced at runtime from `src/client/src/locales/pl.json`. Tests must read translations from this file (see `tests-e2e/support/i18n.ts`) instead of hard‑coding literals, so that updates to the UI locale automatically propagate to the Playwright suite.

*   **Role assignment matrix:** Use the correct actor for each scenario to avoid backend rejections.

*   **Role-scoped Playwright projects:** Each seeded user role maps to a dedicated Playwright project configured in `playwright.config.ts`. Tag every E2E test with the role(s) it requires by appending `@<role>`; supported tags are `@admin`, `@coordinator`, `@confirmator`, `@member`, `@guest`, `@range-admin`, `@standard-user`, and `@all` (runs in every authenticated project). Unauthenticated flows belong in specs that match `*.unauthenticated.spec.ts` and are executed by the `chromium-unauthenticated` project. Forgetting a tag means the test will never run for its intended role.

*   **Saved Browser State & pristine calendar:** To speed up E2E tests, we use Playwright's ability to save and reuse browser state. A global setup script (`tests-e2e/globalSetup.ts`) runs once before all tests. This script logs in as each of the predefined test users (admin, coordinator, etc.) and saves the authenticated browser state (cookies, local storage) into a JSON file in the `tests-e2e/.auth/` directory. The script also logs in as the admin and removes every reservation, proposition, and record for the default `dobczyce` range so each run starts with an empty calendar; tests must seed whatever data they rely on within the scenario.

*   **Playwright reporter flag:** Always include `--reporter=line` when invoking Playwright (e.g., `npx playwright test <args> --reporter=line`) so logs remain consistent.

*   **Frontend restarts:** Never restart the frontend dev server yourself. When a change in the client module (`src/client`) would require a restart, pause and ask the user to restart it for you before proceeding.

    Each user role has its own project in the `playwright.config.ts` file. These projects are configured to use the corresponding saved browser state. This means that when a test runs under a specific project, it starts with the user already logged in. This approach has several advantages:
    *   **Faster tests:** It avoids the overhead of logging in before each test.
    *   **More reliable tests:** It separates the authentication logic from the test logic, making tests less brittle.
    *   **Cleaner tests:** Test files are cleaner as they don't need to include login steps.

    There is also an unauthenticated project for tests that need to run as a logged-out user.

    | Acting user                    | Allowed assignments/removals                             | Notes                                                     |
    |--------------------------------|----------------------------------------------------------|-----------------------------------------------------------|
    | Confirmator (`confirmator@…`) | Member, Coordinator (global only)                        | Can toggle these for pending users via verification view. |
    | Club/Community Admin (`admin@…`) | Any global role; range roles when paired with range admin rights | Use user management for global roles, range settings for range roles. |

## Test Plan by Feature

Here is a breakdown of the tests for each feature defined in your `api-plan.md`:

### 1. Authentication

*   **Unit Tests:**
    *   Test the `AuthService` for user registration, login, logout, and session management.
    *   Test the `authMiddleware` to ensure it correctly authenticates users and handles invalid sessions.
*   **Integration Tests:**
    *   Verify that the `/api/v1/auth/register`, `/api/v1/auth/login`, `/api/v1/auth/logout`, and `/api/v1/auth/me` endpoints work correctly with the `AuthService` and the database.
*   **E2E Tests (Playwright):**
    *   A user can register for a new account. *(tests live in `tests-e2e/authentication.unauthenticated.spec.ts`, executed by the `chromium-unauthenticated` project).*
    *   A user can log in and log out. *(tests live in `tests-e2e/authentication.authenticated.spec.ts`, tagged `@standard-user`).*
    *   A user cannot access protected routes when unauthenticated. *(part of `authentication.unauthenticated.spec.ts`).*

### 2. Users & Roles

*   **Unit Tests:**
    *   Test the `UserService` for getting users and assigning/removing roles.
*   **Integration Tests:**
    *   Verify the `/api/v1/users`, `/api/v1/roles`, `/api/v1/users/{userId}/roles`, and `/api/v1/users/{userId}/roles/{roleId}` endpoints.
*   **E2E Tests (Playwright):**
    *   An admin can view a list of users.
    *   An admin can assign and remove roles from a user.
    *   A "Confirmator" can upgrade a "Guest" to a "Member".
    *   A "Confirmator" can upgrade a "Guest" to a "Coordinator".
    *   A "Guest" only sees propositions they created and sees other users' reservations without personal details.
    *   A "Coordinator" can see the contact information of a user for a reservation they manage.

### 3. Ranges

*   **Unit Tests:**
    *   Test the `RangesService` for getting and updating shooting ranges.
*   **Integration Tests:**
    *   Verify the `/api/v1/ranges` and `/api/v1/ranges/{rangeSlug}` endpoints.
*   **E2E Tests (Playwright):**
    *   A user can view the details of a specific range.
    *   A "Range Administrator" can update the settings for a range.
    *   *(Out of MVP scope: displaying the list of ranges.)*

### 4. Calendar Events

*   **Unit Tests:**
    *   Test the logic for fetching and filtering calendar events based on user roles.
*   **Integration Tests:**
    *   Verify the `/api/v1/ranges/{rangeSlug}/events` endpoint returns the correct data for different user roles.
*   **E2E Tests (Playwright):**
    *   The calendar correctly displays propositions and reservations.
    *   A user can click on an event to see more details.
    *   "Joinable" reservations have a visual indicator for "Members".
    *   **Test data coordination:** Every calendar E2E spec must reserve its own 30-minute slot via the `claimSlot` helper (`tests-e2e/support/calendar-slots.ts`). Call `claimSlot(seed)` with a unique seed per test (e.g., project + test title), use the returned slot for creating propositions/reservations, and invoke the provided `release()` during cleanup. This prevents parallel runs from creating overlapping events and keeps the deterministic “current-week Monday” schedule described in the requirements.

### 5. Propositions

*   **Unit Tests:**
    *   Test the `ReservationsService` for creating and deleting propositions.
*   **Integration Tests:**
    *   Verify the `/api/v1/ranges/{rangeSlug}/propositions` and `/api/v1/propositions/{propositionId}` endpoints.
*   **E2E Tests (Playwright):**
    *   A user can create a new proposition for a shooting session.
    *   A user can cancel their own proposition.
    *   Propositions from "Members" are visually highlighted on the calendar.

### 6. Reservations

*   **Unit Tests:**
    *   Test the `ReservationsService` for creating and deleting reservations.
*   **Integration Tests:**
    *   Verify the `/api/v1/ranges/{rangeSlug}/reservations` and `/api/v1/reservations/{reservationId}` endpoints.
*   **E2E Tests (Playwright):**
    *   A coordinator can create a reservation from a proposition.
    *   A coordinator can modify a proposition before accepting it.
    *   A coordinator can create a reservation directly.
    *   A coordinator can cancel a reservation.
    *   A coordinator is shown a warning when creating an overlapping reservation.
    *   A coordinator can revert a reservation back to a proposition ("Cancel and Re-propose").

### 7. Records

*   **Unit Tests:**
    *   Test the `ReservationsService` for creating records.
*   **Integration Tests:**
    *   Verify the `/api/v1/ranges/{rangeSlug}/records` endpoint.
*   **E2E Tests (Playwright):**
    *   A range admin can create a record for an off-system booking.

### 8. Notifications

*   **Integration Tests:**
    *   Verify that creating a proposition triggers a notification to coordinators.
    *   Verify that accepting a proposition triggers a notification to the user.
    *   Verify that canceling a reservation triggers a notification to the user.

    *(Note: These tests will require a mock email service to be integrated into the test environment to capture and assert that emails are being sent without sending actual emails.)*
