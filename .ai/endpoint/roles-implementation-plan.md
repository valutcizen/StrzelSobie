# API Endpoint Implementation Plan: GET /api/v1/roles

## 1. Endpoint Overview
This document outlines the implementation plan for the `GET /api/v1/roles` endpoint. The purpose of this endpoint is to retrieve a comprehensive list of all user roles available within the system, such as "Member" or "Admin". Access to this endpoint will be restricted to authenticated users only.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/v1/roles`
- **Parameters**:
  - **Required**: None
  - **Optional**: None
- **Request Body**: None

## 3. Used Types
- **DTO**: `RoleDto`
  - **Location**: `src/common/dto/roles.dto.ts`
  - **Shape**:
    ```typescript
    export interface RoleDto {
      id: number;
      name: string;
      scope: 'global' | 'range';
    }
    ```

## 4. Response Details
- **Success**:
  - **Status Code**: `200 OK`
  - **Payload**: An array of `RoleDto` objects.
    ```json
    [
      {
        "id": 1,
        "name": "Member",
        "scope": "global"
      },
      {
        "id": 2,
        "name": "Coordinator",
        "scope": "range"
      }
    ]
    ```
- **Error**:
  - **Status Code**: `401 Unauthorized` - If the user is not authenticated.
  - **Status Code**: `500 Internal Server Error` - If there is a server-side problem, such as a database failure.

## 5. Data Flow
1.  The Cloudflare Worker receives an incoming `GET` request to `/api/v1/roles`.
2.  An authentication middleware intercepts the request to validate the user's session token against the Cloudflare KV store. If the session is invalid or missing, the flow stops and a `401 Unauthorized` response is returned.
3.  The endpoint handler invokes the `getRoles()` method from the `UserService`, which is bound to the worker.
4.  The `UserService` calls the `findAllRoles()` method on the `UserRepository`.
5.  The `UserDbRepository` (the concrete implementation) executes a `SELECT` query on the `users_roles` table in the Cloudflare D1 database.
6.  The repository maps the raw database results into an array of `Role` domain entities and wraps it in a `Success` result object. If the query fails, it returns a `Failure` result object containing the error.
7.  The `UserService` receives the `Result` object. It maps the `Role` domain entities to `RoleDto` objects before returning them to the worker.
8.  The worker inspects the `Result` object. On success, it sends a `200 OK` response with the `RoleDto[]` payload. On failure, it logs the internal error and sends a `500 Internal Server Error` response.

## 6. Security Considerations
- **Authentication**: This endpoint MUST be protected and require a valid user session. The worker will be responsible for checking the session token from the request and validating it against the session data stored in the Cloudflare KV store.
- **Authorization**: No specific roles are required to access this endpoint beyond being an authenticated user.
- **Data Validation**: No input data is processed, so no input validation is necessary.

## 7. Performance Considerations
- The `users_roles` table is expected to be small and grow infrequently. A direct database query is efficient and acceptable.
- No caching is necessary for the initial implementation. If performance becomes a concern, the response from this endpoint is a good candidate for caching at the Cloudflare CDN level.

## 8. Implementation Steps
1.  **Create DTO**: Create a new file `src/common/dto/roles.dto.ts` and define the `RoleDto` interface.
2.  **Update Service Interface**: Add the `getRoles(): Promise<Result<RoleDto[], Error>>` method to the `IUserService` interface in `src/common/interfaces/user.service.interface.ts`.
3.  **Update Repository Interface**: Add the `findAllRoles(): Promise<Result<Role[], Error>>` method to the `UserRepository` interface in `src/users/domain/user.repository.ts`.
4.  **Implement Repository Method**: Implement the `findAllRoles` method in `src/users/infrastructure/user.db.repository.ts`. This method will execute a `SELECT id, name, scope FROM users_roles` query against the D1 database and map the results.
5.  **Implement Service Method**: Implement the `getRoles` method in `src/users/application/user.service.ts`. This method will call `userRepository.findAllRoles()` and, on success, map the resulting `Role` entities to `RoleDto` objects.
6.  **Create Endpoint File**: Create a new endpoint file at `src/worker/src/endpoints/v1/user/roles.ts`.
7.  **Define OpenAPI Route**: In `roles.ts`, use `hono/zod-openapi` to define the route, specifying the path, method, request/response schemas, and security requirements.
8.  **Implement Endpoint Handler**: In the same file, implement the handler function that:
    a.  Calls the authentication middleware/logic.
    b.  Calls `userService.getRoles()`.
    c.  Handles the `Success` or `Failure` result to return the correct HTTP response (`c.json(...)`).
9.  **Register Route**: Import and register the new roles route in the main worker file (`src/worker/src/index.ts`).
10. **Write Tests**:
    a.  Add unit tests for the `getRoles` method in `UserService` to verify the mapping logic, mocking the repository layer.
    b.  Add an integration test for the `GET /api/v1/roles` endpoint to verify the full flow, including authentication and correct data retrieval.
