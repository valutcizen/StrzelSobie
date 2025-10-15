# API Endpoint Implementation Plan: `PATCH /api/v1/ranges/{rangeSlug}`

## 1. Endpoint Overview
This document outlines the implementation plan for the `PATCH /api/v1/ranges/{rangeSlug}` endpoint. This endpoint is responsible for partially updating the configuration of a specific shooting range, such as its total number of tracks and operating hours. Access to this endpoint is restricted to users with "Range Admin" privileges for the specified range.

## 2. Request Details
- **HTTP Method**: `PATCH`
- **URL Structure**: `/api/v1/ranges/{rangeSlug}`
- **Parameters**:
  - **Path**:
    - `rangeSlug` (string, required): The unique, URL-friendly identifier for the shooting range.
- **Request Body**:
  - **Content-Type**: `application/json`
  - **Structure**: A JSON object that can contain one or both of the optional fields to be updated.

## 3. Used Types
- **DTO / Command Model**: `UpdateRangeCommand` from `@strzel-sobie/common/dto/ranges.dto.ts` will be used for the request body.
  ```typescript
  export type UpdateRangeCommand = Partial<Pick<RangeDetailsDto, 'totalTracks' | 'operatingHours'>>;
  ```
- **Zod Validation Schemas**: Local `zod` schemas will be defined within the endpoint file to validate the path parameter and the request body, ensuring they conform to the `UpdateRangeCommand` type.

## 4. Response Details
- **Success**:
  - `200 OK`: Returned upon a successful update. The response body will be a simple success message.
    ```json
    {
      "success": true
    }
    ```
- **Errors**:
  - `400 Bad Request`: Invalid format for `rangeSlug` or the request body.
  - `401 Unauthorized`: The user is not authenticated (session is invalid or missing).
  - `403 Forbidden`: The authenticated user does not have "Range Admin" privileges for the specified range.
  - `404 Not Found`: No shooting range exists with the provided `rangeSlug`.
  - `500 Internal Server Error`: An unexpected server-side error occurred.

## 5. Data Flow
1. A `PATCH` request is sent to `/api/v1/ranges/{rangeSlug}`.
2. The `AuthMiddleware` in the worker intercepts the request, validates the user's session from the KV store, and attaches the authenticated user's data (including roles) to the Hono context.
3. The `UpdateRange` endpoint class in the worker receives the request.
4. It uses a local `zod` schema to parse and validate the `rangeSlug` from the path and the `UpdateRangeCommand` payload from the request body.
5. The endpoint handler retrieves the `adminService` and the user data from the context.
6. It calls `adminService.updateRangeDetails(rangeSlug, updateCommand, user)`.
7. The `AdminService` fetches the `ShootingRange` domain entity using the `rangeSlug`. If not found, it returns a `NotFoundError`.
8. The service performs an authorization check to ensure the user has the required "Range Admin" role for this specific range. If not, it returns a `ForbiddenError`.
9. The service updates the properties of the `ShootingRange` entity with the data from the `updateCommand`.
10. The service calls `adminRepository.update(rangeEntity)` to persist the changes.
11. The `AdminDbRepository` maps the domain entity to a database model and executes a parameterized `UPDATE` SQL query on the `admin_shooting_ranges` table. It serializes the `operatingHours` object into a JSON string before saving.
12. A `Result.success()` is returned up the call stack to the worker.
13. The worker's endpoint handler inspects the `Result` object and returns the appropriate HTTP response (`200 OK` on success, or an error status code).

## 6. Security Considerations
- **Authentication**: Handled by a dedicated middleware that verifies the user's session token and retrieves session data from the Cloudflare KV store.
- **Authorization**: This is a critical step. The `AdminService` must contain logic to verify that the authenticated user's roles grant them administrative permission for the *specific range* being modified. A failure in this check must result in a `403 Forbidden` error.
- **Input Validation**: The `zod` schema in the worker endpoint provides the first line of defense against malformed data.
- **SQL Injection**: All database queries in the repository layer must be parameterized to prevent SQL injection attacks.

## 7. Performance Considerations
- The `slug` column in the `admin_shooting_ranges` table is constrained to be `UNIQUE`, which implies it has an index. This ensures that fetching the range by its slug is a performant operation.
- The update operation is a simple `UPDATE` query on a single row, which should be very fast. No significant performance bottlenecks are anticipated.

## 8. Implementation Steps
1.  **Create Endpoint File**: Create a new file `src/worker/src/endpoints/v1/ranges/update-range.ts`, using `get-range.ts` as a template.
2.  **Define `UpdateRange` Class**: In the new file, define a class `UpdateRange` that extends `OpenAPIRoute`.
3.  **Define Schema**: Implement the `schema` property within the `UpdateRange` class, defining the summary, description, tags, request (params and body with `zod` schemas), and all possible responses (`200`, `400`, `401`, `403`, `404`).
4.  **Implement `handle` Method**: Implement the `async handle(c: Context)` method to orchestrate the data validation and service call as described in the "Data Flow" section.
5.  **Update Service Interface**: Add a new method `updateRangeDetails(rangeSlug: string, command: UpdateRangeCommand, user: AuthenticatedUser): Promise<Result<void, Error>>` to the `IAdminService` interface in `src/common/src/interfaces/admin.service.interface.ts`.
6.  **Implement Service Logic**: Implement the `updateRangeDetails` method in `src/admin/src/application/admin.service.ts`. This method will contain the core business logic for fetching, authorizing, and updating the range.
7.  **Update Repository Interface**: Add an `update(range: ShootingRange): Promise<Result<void, Error>>` method to the `IAdminRepository` interface in `src/admin/src/domain/admin.repository.ts`.
8.  **Implement Repository Logic**: Implement the `update` method in `src/admin/src/infrastructure/admin.db.repository.ts`. This method will execute the `UPDATE` SQL statement against the D1 database.
9.  **Register Route**: Import and register the new `UpdateRange` endpoint in the worker's main router file.
10. **Write E2E Tests**: Create a new test file in the `tests/admin/` directory to add end-to-end tests for this endpoint. Tests should cover:
    - A successful update by an authorized admin.
    - A `403 Forbidden` error when a non-admin user attempts to update.
    - A `401 Unauthorized` error when no user is logged in.
    - A `404 Not Found` error for a non-existent `rangeSlug`.
    - A `400 Bad Request` error for an invalid request body.
11. **Verification**: Run `npm run build:backend` and `npm run test` to ensure all code compiles and all tests pass.
