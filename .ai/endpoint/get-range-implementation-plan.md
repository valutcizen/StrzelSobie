# API Endpoint Implementation Plan: GET /api/v1/ranges/{rangeSlug}

## 1. Endpoint Overview
This document outlines the implementation plan for the `GET /api/v1/ranges/{rangeSlug}` endpoint. Its purpose is to retrieve detailed public information for a specific shooting range, identified by its unique `slug`. The endpoint will return data such as the range's display name, total number of tracks, and operating hours.

## 2. Request Details
- **HTTP Method:** `GET`
- **URL Structure:** `/api/v1/ranges/{rangeSlug}`
- **Parameters:**
  - **Required:** `rangeSlug` (string, path parameter) - The unique, URL-friendly identifier for the shooting range (e.g., "dobczyce").
- **Request Body:** None.

## 3. Used Types
- **DTO:** `RangeDetailsDto` from `@strzel-sobie/common`. This DTO will be used for the response payload.

## 4. Response Details
- **Success (200 OK):**
  - **Payload:** A JSON object conforming to the `RangeDetailsDto`.
  ```json
  {
    "id": 1,
    "slug": "dobczyce",
    "displayName": "Strzelnica Dobczyce",
    "totalTracks": 10,
    "operatingHours": { "monday": { "open": "10:00", "close": "18:00" } }
  }
  ```
- **Error:**
  - **404 Not Found:** Returned when no shooting range matches the provided `rangeSlug`.
  ```json
  {
    "success": false,
    "error": "Range not found"
  }
  ```

## 5. Data Flow
1.  The Cloudflare Worker receives a `GET` request at `/api/v1/ranges/{rangeSlug}`.
2.  The endpoint handler in `src/worker` validates the `rangeSlug` path parameter using a `zod` schema to ensure it's a valid string.
3.  The handler retrieves the `rangesService` instance from the Hono context.
4.  It calls `rangesService.getRangeDetails(rangeSlug)`.
5.  The `rangesService` calls the `rangesRepository.findBySlug(rangeSlug)` method.
6.  The `rangesRepository` executes a `SELECT` query on the `ranges_shooting_ranges` D1 database table using the provided slug.
7.  **If a record is found:**
    - The repository returns the database model to the service.
    - The service maps the database model to the `RangeDetailsDto`, parsing the `operating_hours` JSON string into an object.
    - The service wraps the DTO in a `Result.success` object and returns it.
8.  **If no record is found:**
    - The repository returns `null`.
    - The service creates a `Result.failure` object with a "not found" error and returns it.
9.  The worker endpoint inspects the `Result` object. On success, it sends a `200 OK` response with the DTO. On failure, it sends a `404 Not Found` response with an error message.

## 6. Security Considerations
- **Authentication/Authorization:** This is a public endpoint and does not require any authentication or authorization.
- **Data Validation:** The `rangeSlug` parameter must be strictly validated in the worker endpoint to prevent any potential injection or path traversal attacks, even though the underlying database driver should prevent SQL injection.
- **Information Exposure:** The endpoint exposes public, non-sensitive information about shooting ranges.

## 7. Performance Considerations
- The `slug` column in the `ranges_shooting_ranges` table is constrained to be `UNIQUE`, and should be indexed to ensure fast lookups.
- The data payload is small, so network latency should not be a significant concern.

## 8. Implementation Steps
1.  **Module: `ranges` (`src/ranges`)**
    1.  **Repository Contract (`domain/ranges.repository.ts`):**
        -   Add the following method to the `RangesRepository` interface:
            ```typescript
            findBySlug(slug: string): Promise<ShootingRange | null>;
            ```
    2.  **Repository Implementation (`infrastructure/ranges.db.repository.ts`):**
        -   Implement the `findBySlug` method. It will use the D1 client to execute a parameterized query:
            ```sql
            SELECT id, slug, display_name, total_tracks, operating_hours FROM ranges_shooting_ranges WHERE slug = ?1;
            ```
    3.  **Application Service (`application/ranges.service.ts`):**
        -   Create a new method: `async getRangeDetails(slug: string): Promise<Result<RangeDetailsDto, Error>>`.
        -   This method will call `this.rangesRepository.findBySlug(slug)`.
        -   If the result is `null`, return `Result.failure(new Error('Range not found'))`.
        -   If a range is found, map the entity to `RangeDetailsDto`, ensuring `operating_hours` is parsed from a JSON string. Return `Result.success(dto)`.

2.  **Module: `worker` (`src/worker`)**
    1.  **Create Endpoint File:**
        -   Create a new file: `src/worker/src/endpoints/v1/ranges/get-range.ts`.
    2.  **Implement Endpoint:**
        -   Create a class `GetRange` that extends `OpenAPIRoute`.
        -   Define the `schema` property with OpenAPI details (summary, description, tags, params, responses for 200 and 404).
        -   Define a `zod` schema for the `rangeSlug` path parameter.
        -   Implement the `async handle(c: Context)` method:
            -   Parse and validate the `rangeSlug` from the request.
            -   Get `rangesService` from the context: `c.get('rangesService')`.
            -   Call `rangesService.getRangeDetails(rangeSlug)`.
            -   Based on the returned `Result`, use `c.json()` to return either a `200 OK` with the payload or a `404 Not Found` with an error object.

3.  **Testing (`/tests`)**
    1.  **Unit Test:**
        -   Add a unit test for the `getRangeDetails` method in `ranges.service.ts` to verify both the success and "not found" cases. Mock the `RangesRepository`.
    2.  **E2E Test:**
        -   Add a new E2E test file in `tests/ranges/` to test the `GET /api/v1/ranges/{rangeSlug}` endpoint.
        -   The test should cover:
            -   Requesting an existing range and asserting a `200 OK` response with the correct data structure.
            -   Requesting a non-existent range and asserting a `404 Not Found` response.
