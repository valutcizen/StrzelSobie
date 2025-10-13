# API Endpoint Implementation Plan: GET /api/v1/users

## 1. Endpoint Overview
This endpoint retrieves a paginated, sortable, and filterable list of all users in the system. Access is strictly limited to authenticated users with the "Admin" or "Confirmator" role. The endpoint supports flexible querying through optional parameters for pagination, sorting, and filtering.

## 2. Request Details
-   **HTTP Method**: `GET`
-   **URL Structure**: `/api/v1/users`
-   **Parameters**:
    -   **Optional**:
        -   `page` (number): The page number for pagination. Defaults to `1`.
        -   `limit` (number): The number of users per page. Defaults to `10`, max `100`.
        -   `sortBy` (string): The field to sort by. Allowed values: `id`, `email`, `createdAt`. Defaults to `id`.
        -   `sortOrder` (string): The sorting order. Allowed values: `asc`, `desc`. Defaults to `desc`.
        -   `filter` (string): A search term to filter users by email.
-   **Request Body**: None.

## 3. Used Types
-   **`PaginatedUsersDto`**: The main response payload, containing the list of users and pagination metadata.
    -   `data: UserDto[]`
    -   `pagination: { total: number, page: number, limit: number }`
-   **`UserDto`**: The data transfer object for a single user.
    -   `id: number`
    -   `email: string`
    -   `isDeleted: number`
    -   `createdAt: string`

*All types are sourced from `@strzel-sobie/common` (`src/common/src/dto/users.dto.ts`).*

## 4. Data Flow
1.  A `GET` request is sent to the `/api/v1/users` endpoint on the Cloudflare Worker.
2.  The authentication middleware intercepts the request. It retrieves the user's session from the Cloudflare KV store and verifies that the user has the "Admin" or "Confirmator" global role. If not, the flow stops and returns a `401` or `403` error.
3.  The endpoint handler in the worker validates the query parameters (`page`, `limit`, etc.) using a predefined `zod` schema. If validation fails, it returns a `400 Bad Request` error.
4.  The worker invokes the `getUsers` method on the `UserService` (from the `users` module), passing the validated and parsed query options.
5.  The `UserService` calls the `findAndCount` method on the `UserRepository`.
6.  The `UserRepository` implementation constructs a parameterized SQL query for the D1 database to fetch the total count and the requested slice of users from the `users_users` table, applying the specified filtering and sorting.
7.  The repository maps the raw database results to `User` domain entities and returns them to the `UserService`.
8.  The `UserService` maps the `User` entities to `UserDto` objects, assembles the final `PaginatedUsersDto` object, and wraps it in a `Result.ok()`.
9.  The worker receives the `PaginatedUsersDto`, serializes it to JSON, and sends it back to the client with a `200 OK` status code.

## 5. Security Considerations
-   **Authentication/Authorization**: A robust middleware must be implemented in the worker. It will be responsible for session validation and ensuring the requesting user has "Admin" privileges by checking session data stored in the KV cache.
-   **Input Validation**: All query parameters will be strictly validated using `zod` to prevent invalid data from reaching the service layer. The `limit` parameter will be capped at `100` to prevent DoS attacks.
-   **SQL Injection**: The `UserRepository` must use a query builder (e.g., Drizzle) to create parameterized queries. User-provided inputs (`filter`, `sortBy`) must never be directly concatenated into SQL strings.
-   **Data Exposure**: The endpoint will only expose the fields defined in `UserDto`, preventing sensitive information from being leaked.

## 6. Error Handling
-   **`200 OK`**: The request was successful.
-   **`400 Bad Request`**: Returned if any query parameters fail validation (e.g., `page` is not a positive integer, `sortOrder` is an invalid value).
-   **`401 Unauthorized`**: Returned if the request does not include a valid session token.
-   **`403 Forbidden`**: Returned if the user is authenticated but does not have the required "Admin" role.
-   **`500 Internal Server Error`**: Returned for any unexpected server-side issues, such as a database connection error. A global error handler in the worker will catch these exceptions.

## 7. Performance Considerations
-   **Pagination**: The API enforces pagination to ensure that response payloads are small and requests are processed quickly.
-   **Database Indexing**: To optimize query performance, an index should be created on the `email` and `created_at` columns of the `users_users` table.
-   **Query Optimization**: The database query will fetch the total count and the paginated data in an efficient manner to minimize database load.

## 8. Implementation Steps
1.  **Worker (`src/worker`)**:
    -   Create a new file: `src/worker/src/endpoints/v1/user/get-users.ts`.
    -   Define the route using `hono/zod-openapi`.
    -   Create a `zod` schema to validate the optional query parameters: `page`, `limit`, `sortBy`, `sortOrder`, and `filter`.
    -   Apply the authentication and authorization middleware to the route, checking for the "Admin" role.
2.  **Users Module - Application (`src/users/application`)**:
    -   In `user.service.ts`, define an interface for the query options (`GetUsersOptions`).
    -   Create the public method `async getUsers(options: GetUsersOptions): Promise<Result<PaginatedUsersDto, Error>>`.
3.  **Users Module - Domain (`src/users/domain`)**:
    -   In `user.repository.ts`, add the method signature: `findAndCount(options: GetUsersOptions): Promise<{ users: User[]; total: number; }>`.
4.  **Users Module - Infrastructure (`src/users/infrastructure`)**:
    -   In `user.db.repository.ts`, implement the `findAndCount` method.
    -   Use a query builder to dynamically construct the `SELECT` query based on the filter, sort, and pagination options.
    -   Ensure all user-provided values are passed as parameters to the query to prevent SQL injection.
5.  **Connect Layers**:
    -   In `UserService`, call the repository's `findAndCount` method.
    -   Perform the mapping from `User` domain models to `UserDto`s.
    -   Construct and return the `PaginatedUsersDto`.
    -   In the worker's route handler, call `UserService.getUsers`, handle the `Result` object, and return the appropriate HTTP response (`200` or `500`).
6.  **Testing (`tests/`)**:
    -   Add an end-to-end test for the `GET /api/v1/users` endpoint.
    -   Create test cases for:
        -   A successful request with default parameters.
        -   A request with all query parameters specified.
        -   A request from an unauthorized user (expect `401`).
        -   A request from a non-admin user (expect `403`).
        -   A request with invalid query parameters (expect `400`).
