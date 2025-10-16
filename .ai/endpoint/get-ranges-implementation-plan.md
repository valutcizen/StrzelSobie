# API Endpoint Implementation Plan: GET /api/v1/ranges

## 1. Endpoint Overview
This document outlines the implementation plan for the `GET /api/v1/ranges` endpoint. The purpose of this endpoint is to retrieve a summarized list of all available shooting ranges. The data is considered public, so no authentication is required.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/v1/ranges`
- **Parameters**:
  - **Required**: None
  - **Optional**: None
- **Request Body**: None

## 3. Used Types
- **DTO**: `RangeSummaryDto` from `@strzel-sobie/common` will be used for the response payload.
  ```typescript
  export type RangeSummaryDto = {
    id: number;
    slug: string;
    displayName: string;
  };
  ```

## 4. Response Details
- **Success (200 OK)**: Returns a JSON array of `RangeSummaryDto` objects.
  ```json
  [
    {
      "id": 1,
      "slug": "dobczyce",
      "displayName": "Strzelnica Dobczyce"
    },
    {
      "id": 2,
      "slug": "krakow-pasternik",
      "displayName": "Strzelnica Pasternik"
    }
  ]
  ```
- **Error (500 Internal Server Error)**: Returned if there is a problem accessing the database or a general server-side issue.
  ```json
  {
    "error": "Internal Server Error"
  }
  ```

## 5. Data Flow
1.  The Cloudflare Worker receives a `GET` request at `/api/v1/ranges`.
2.  The worker routes the request to the `GetRangesRoute` handler.
3.  The handler retrieves the `rangesService` instance from the application context.
4.  It calls the `rangesService.getRanges()` method.
5.  The `RangesService` calls the `rangesRepository.findAll()` method to fetch the range data.
6.  The `RangesDbRepository` executes a `SELECT id, slug, display_name FROM ranges_shooting_ranges` query against the D1 database.
7.  The repository maps the raw database rows into `ShootingRange` domain models.
8.  The service receives the domain models and maps them to `RangeSummaryDto` objects.
9.  The service wraps the DTO array in a `Success` result object and returns it to the worker.
10. The worker handler inspects the result. On success, it formats a `200 OK` JSON response with the DTO array. On failure, it formats a `500 Internal Server Error` response.

## 6. Security Considerations
- **Authentication/Authorization**: This is a public endpoint and does not require any authentication or authorization.
- **Data Validation**: No user input is processed, so input validation is not applicable.
- **SQL Injection**: The database query is static and does not include any user-provided data, eliminating the risk of SQL injection.

## 7. Error Handling
- The primary error scenario is a database failure (e.g., connectivity issue, query error).
- The `RangesDbRepository` or `RangesService` will catch any database-related exceptions and return a `Failure` result object containing an `Error`.
- The worker's endpoint handler will check if the result is a `Failure` and, if so, return a generic `500 Internal Server Error` response to avoid leaking internal implementation details.

## 8. Performance Considerations
- The `ranges_shooting_ranges` table is expected to be small, so a full table scan is acceptable.
- The query only selects the necessary columns (`id`, `slug`, `display_name`), which is efficient.
- No significant performance bottlenecks are anticipated for this endpoint.

## 9. Implementation Steps

1.  **Update Common Interface (`IRangesService`)**:
    - In `src/common/src/interfaces/ranges.service.interface.ts`, add a new method to the `IRangesService` interface:
      ```typescript
      getRanges(): Promise<Result<RangeSummaryDto[], Error>>;
      ```

2.  **Update Domain (`ranges.repository.ts`)**:
    - In `src/ranges/src/domain/ranges.repository.ts`, add a new method to the `IRangesRepository` interface:
      ```typescript
      findAll(): Promise<Result<ShootingRange[], Error>>;
      ```

3.  **Implement Repository (`ranges.db.repository.ts`)**:
    - In `src/ranges/src/infrastructure/ranges.db.repository.ts`, implement the `findAll` method.
    - It will use the Drizzle client to execute a `select` query on the `ranges_shooting_ranges` table.
    - The method will be wrapped in a `try/catch` block to handle potential database errors and return a `Result` object.

4.  **Implement Service (`ranges.service.ts`)**:
    - In `src/ranges/src/application/ranges.service.ts`, implement the `getRanges` method.
    - This method will call `this.rangesRepository.findAll()`.
    - If the result is a success, it will map the `ShootingRange[]` array to a `RangeSummaryDto[]` array (mapping `display_name` to `displayName`).
    - It will return the `Result` object (either the successful DTO array or the failure from the repository).

5.  **Create Worker Endpoint (`get-ranges.ts`)**:
    - Create a new file: `src/worker/src/endpoints/v1/ranges/get-ranges.ts`.
    - Implement a class `GetRangesRoute` that extends `OpenAPIRoute`.
    - Define the `schema` property with OpenAPI details, including summary, tags, and response schemas for `200 OK` and `500 Internal Server Error`. The `200` response should reference the `RangeSummaryDto`.
    - Implement the `async handle(c: Context)` method:
        - Get `rangesService` from the context: `const rangesService = c.get('rangesService');`
        - Call `const result = await rangesService.getRanges();`
        - If `result.isSuccess`, return `c.json(result.value, 200);`.
        - If `result.isFailure`, log the error and return `c.json({ error: 'Internal Server Error' }, 500);`.

6.  **Register Route (`src/worker/src/index.ts`)**:
    - Import the new `GetRangesRoute`.
    - Add a new route to the Hono app instance: `app.openapi(new GetRangesRoute());`
