# Integration Tests Plan

This document outlines the integration tests to be created for the "Strzel Sobie" project.

## 1. Module-to-Database Interaction Tests

These tests will verify that repositories correctly interact with the database.

-   **Auth Module**:
    -   `auth.db.repository.integration.tests.ts`: Test `AuthDbRepository` methods (`findCredentialsByUserId`, `saveCredentials`).
    -   `session.kv.repository.integration.tests.ts`: Test `SessionKvRepository` methods (`createSession`, `getSession`, `deleteSession`) against a mock KV store.
-   **Users Module**:
    -   `user.db.repository.integration.tests.ts`: Test `UserDbRepository` methods (`findByEmail`, `create`, `getFullUserProfile`, `getById`, `findAndCount`, `getRoles`, `assignGlobalRole`, `assignRangeRole`, `removeGlobalRole`, `removeRangeRole`).
-   **Ranges Module**:
    -   `ranges.db.repository.integration.tests.ts`: Test `RangesDbRepository` methods (`findAll`, `existsRangeById`, `findBySlug`, `update`, `getRangeIdBySlug`).
-   **Reservations Module**:
    -   `reservations.db.repository.integration.tests.ts`: Test `ReservationsDbRepository` methods (`getPropositions`, `getReservations`, `getOverlappingUsage`, `createProposition`, `cancelProposition`, `getPropositionById`, `getOverlappingReservationsDetails`, `createReservation`, `createReservationFromProposition`, `deleteReservation`, `getReservationById`, `createRecord`).
-   **Audit Module**:
    -   `audit.db.repository.integration.tests.ts`: Test `AuditDbRepository` method (`logAction`).

## 2. Module-to-Module Interaction Tests

These tests will verify the interactions between different application services.

-   **Auth -> Users & Audit**:
    -   `auth.users.audit.integration.tests.ts`: Test `AuthService` methods (`login`, `register`) mocking `IUserService` and `IAuditService` to verify they are called correctly.
-   **Reservations -> Ranges & Audit**:
    -   `reservations.ranges.audit.integration.tests.ts`: Test `ReservationsService` methods (`getCalendarEvents`, `createReservation`, etc.) mocking `IRangesService` and `IAuditService` to verify they are called correctly.
-   **Users -> Ranges**:
    -   `users.ranges.integration.tests.ts`: Test `UserService` methods (`assignRoleToUser`, `removeRoleFromUser`) mocking `IRangesService` to verify it's called correctly.
-   **Ranges -> Audit**:
    -   `ranges.audit.integration.tests.ts`: Test `RangesService` method (`updateRangeDetails`) mocking `IAuditService` to verify it's called correctly.

## 3. Worker-to-Module Interaction Tests

These tests will verify the endpoints in the worker. Each test will simulate an HTTP request and mock the underlying service to verify the endpoint logic.

-   **Auth Endpoints**:
    -   `v1.auth.login.integration.tests.ts`
    -   `v1.auth.logout.integration.tests.ts`
    -   `v1.auth.me.integration.tests.ts`
    -   `v1.auth.register.integration.tests.ts`
-   **Users Endpoints**:
    -   `v1.users.get-users.integration.tests.ts`
    -   `v1.users.roles.integration.tests.ts`
    -   `v1.users.set-role.integration.tests.ts`
    -   `v1.users.remove-role.integration.tests.ts`
-   **Ranges Endpoints**:
    -   `v1.ranges.get-ranges.integration.tests.ts`
    -   `v1.ranges.get-range.integration.tests.ts`
    -   `v1.ranges.update-range.integration.tests.ts`
    -   `v1.ranges.get-events.integration.tests.ts`
    -   `v1.ranges.create-proposition.integration.tests.ts`
    -   `v1.ranges.create-record.integration.tests.ts`
    -   `v1.ranges.create-reservation.integration.tests.ts`
-   **Propositions Endpoint**:
    -   `v1.propositions.delete.integration.tests.ts`
-   **Reservations Endpoint**:
    -   `v1.reservations.delete.integration.tests.ts`
