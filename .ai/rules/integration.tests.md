# Integration Testing Guidelines

This document outlines the rules for writing integration tests in this project. Integration tests are crucial for verifying the interactions between different parts of the system.

## Core Principles

-   **Isolate Interactions**: Each integration test should focus on a single type of interaction. All other dependencies and interactions should be mocked to ensure the test is focused and reliable.
-   **Use a Real Database**: When testing module-to-database interactions, tests should connect to a real test database instance to verify data integrity and queries. Use the `npm run db:reset` command to ensure a clean state before running tests.
-   **Follow Existing Conventions**: Adhere to the testing practices established in the unit tests, such as using Vitest and the `Result` object for assertions.

## Types of Integration Tests

We distinguish between three main types of integration tests:

### 1. Module-to-Database Interaction

-   **Goal**: Verify that a module correctly interacts with the database. This includes testing repositories and their queries.
-   **Setup**:
    -   Use a real database connection.
    -   Ensure the database is in a known state, for example by running `npm run db:reset` before the test suite.
    -   Do not mock the database client (e.g., `drizzle-orm`).
-   **File Naming**: `[module-name].[repository-name].integration.tests.ts` (e.g., `users.db.repository.integration.tests.ts`)

### 2. Module-to-Module Interaction

-   **Goal**: Verify the communication and data flow between two different modules (e.g., `reservations` module calling `users` module).
-   **Setup**:
    -   Mock the database layer of both modules.
    -   Mock any other external services.
    -   Focus on the contract and data exchange between the modules.
-   **File Naming**: `[module1-name].[module2-name].integration.tests.ts` (e.g., `reservations.users.integration.tests.ts`)

### 3. Worker-to-Module Interaction

-   **Goal**: Test the integration of a Cloudflare Worker endpoint with its corresponding application service module. This ensures that HTTP requests are correctly handled and passed to the business logic.
-   **Setup**:
    -   Use a tool like `hono/testing` to simulate HTTP requests to the worker.
    -   Mock the module's dependencies (like repositories or other services) to isolate the endpoint logic.
    -   Assert that the endpoint returns the correct HTTP status codes and payloads.
-   **File Naming**: `[endpoint-path].integration.tests.ts` (e.g., `v1.reservations.create.integration.tests.ts`)

## General Rules

-   **Location**: All integration tests should be located in the `tests` workspace, under a directory corresponding to the module being tested.
-   **Test Runner**: Use Vitest for running integration tests.
-   **Mocking**: Use Vitest's mocking capabilities (`vi.mock`, `vi.spyOn`) to isolate the components under test.
