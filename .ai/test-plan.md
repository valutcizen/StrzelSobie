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

*   **Selector guidelines:** Prefer accessible queries (`getByRole`, `getByLabel`, `getByText`) to keep tests resilient to layout changes. When interacting with Vuetify menus or dialogs, close the overlay (`await combobox.press('Escape')`) before clicking primary actions to avoid pointer interception timeouts.

*   **Role assignment matrix:** Use the correct actor for each scenario to avoid backend rejections.

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
    *   A user can register for a new account.
    *   A user can log in and log out.
    *   A user cannot access protected routes when unauthenticated.

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
