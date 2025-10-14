# API Endpoint Implementation Plan: POST /api/v1/users/{userId}/roles

## 1. Endpoint Overview
This document outlines the implementation plan for an API endpoint that assigns a role to a user. The endpoint is restricted to authorized administrators. It handles both global and range-specific roles by inserting records into the appropriate database tables.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/users/{userId}/roles`
- **Parameters**:
  - **Path (Required)**:
    - `userId` (number): The unique identifier of the user to whom the role will be assigned.
  - **Body (Required)**:
    - `AssignRoleCommand`: A JSON object with the following structure:
      ```json
      {
        "roleId": 2,
        "rangeId": null
      }
      ```
      - `roleId` (number): The ID of the role to assign.
      - `rangeId` (number | null): The ID of the shooting range for range-specific roles; `null` for global roles.

## 3. Used Types
- **`AssignRoleCommand`** (`@strzel-sobie/common/dto`): Defines the structure of the request body.
- **`User`** (`@strzel-sobie/common/models`): Represents the requesting user's data retrieved from the session for authorization.
- **`Result<T, E>`** (`@strzel-sobie/common/utils`): Used for returning success or error states from the service layer.

## 4. Response Details
- **Success**:
  - `204 No Content`: Returned upon successful assignment of the role.
- **Errors**:
  - `400 Bad Request`: For invalid input, such as a malformed `userId` or a mismatch between the role's scope and the provided `rangeId`.
  - `401 Unauthorized`: If the request is made without a valid session.
  - `403 Forbidden`: If the requesting user does not have the necessary permissions to assign roles.
  - `404 Not Found`: If the specified `userId`, `roleId`, or `rangeId` does not exist in the database.

## 5. Data Flow
1.  The **Cloudflare Worker** receives a `POST` request to `/api/v1/users/{userId}/roles`.
2.  An **authentication middleware** intercepts the request, validates the session token, and retrieves the requesting user's data from the **Cloudflare KV** session store.
3.  The **endpoint handler** (`set-role.ts`) validates the `userId` path parameter and the request body against a `zod` schema corresponding to `AssignRoleCommand`.
4.  The handler retrieves the `IUserService` instance from the context and calls `userService.assignRoleToUser()`, passing the target `userId`, the `AssignRoleCommand` payload, and the requesting user's data.
5.  The **`UserService`** executes the core business logic:
    a. **Authorization**: It checks if the requesting user has an administrative role (e.g., 'Club/Community Administrator', 'Confirmator'). If not, it returns a `ForbiddenError`.
    b. **Validation**: It queries the database to verify the existence of the target user, the role, and the range (if `rangeId` is provided). It also checks that the role's scope aligns with the presence of `rangeId`. If any check fails, it returns an appropriate error (`UserNotFoundError`, `RoleScopeError`, etc.).
    c. **Persistence**: It calls the corresponding method in the `UserRepository` to insert a new record into either the `users_user_global_roles` or `users_user_range_roles` table in the **D1 Database**.
6.  The `UserService` returns a `Result` object to the endpoint handler.
7.  The **endpoint handler** maps the `Result` to the final HTTP response, returning `204 No Content` on success or the relevant 4xx status code on failure.

## 6. Security Considerations
- **Authentication**: All requests must pass through the session validation middleware. Unauthenticated requests will be rejected with a `401 Unauthorized`.
- **Authorization**: The `UserService` is responsible for enforcing role-based access control. It must verify that the user making the request has the authority to assign roles before proceeding.
- **Input Validation**: All incoming data (`userId`, `roleId`, `rangeId`) will be strictly validated at both the worker layer (for type and format) and the service layer (for business rules and existence) to prevent invalid data processing.

## 7. Error Handling
The service will return specific, typed errors wrapped in a `Result` object, which the worker will map to HTTP status codes:
- `InvalidInputError` -> `400 Bad Request`
- `UserNotFoundError` -> `404 Not Found`
- `RoleNotFoundError` -> `404 Not Found`
- `RangeNotFoundError` -> `404 Not Found`
- `RoleScopeError` -> `400 Bad Request` (e.g., `rangeId` supplied for a global role)
- `ForbiddenError` -> `403 Forbidden`

## 8. Performance Considerations
- Database queries for validation (user, role, range existence) should be indexed and efficient.
- The operation is a simple `INSERT`, which is generally fast. No significant performance bottlenecks are anticipated.

## 9. Implementation Steps

### Step 1: Update `users` Module
1.  **Repository (`domain/user.repository.ts` & `infrastructure/user.db.repository.ts`)**:
    - In `IUserRepository`, define methods for assigning roles:
      ```typescript
      assignGlobalRole(userId: number, roleId: number): Promise<Result<void, Error>>;
      assignRangeRole(userId: number, roleId: number, rangeId: number): Promise<Result<void, Error>>;
      ```
    - Implement these methods in `UserDbRepository` to perform the `INSERT` operations into `users_user_global_roles` and `users_user_range_roles`.
2.  **Service (`common/interfaces/user.service.interface.ts` & `application/user.service.ts`)**:
    - Add a new method to the `IUserService` interface:
      ```typescript
      assignRoleToUser(command: {
        targetUserId: number;
        roleId: number;
        rangeId: number | null;
        requester: User; // User from session
      }): Promise<Result<void, UserNotFoundError | RoleNotFoundError | ...>>;
      ```
    - Implement this method in `UserService`. It will contain the authorization, validation, and persistence logic by calling the repository.

### Step 2: Update `admin` Module (if needed)
1.  **Repository/Service**: If not already present, create methods to fetch shooting range details to validate `rangeId`. This might involve creating a minimal `IRangeRepository` and `RangeService` if they don't exist.

### Step 3: Implement Worker Endpoint
1.  **Create Endpoint File**: Create `src/worker/src/endpoints/v1/user/set-role.ts`.
2.  **Define Schema and Handler**:
    - Implement a new class `SetUserRoleRoute` extending `OpenAPIRoute`.
    - Define the `zod` schemas for `params` (`userId`) and `body` (`AssignRoleCommand`).
    - In the `schema` property, document the endpoint, request, and all possible responses (`204`, `400`, `401`, `403`, `404`).
    - Implement the `handle()` method to parse input, call `userService.assignRoleToUser`, and map the result to an HTTP response.
3.  **Register Route**: Add the new route to the Hono router in `src/worker/src/index.ts`.

### Step 4: Testing
1.  **Unit Tests**: Add `vitest` unit tests for the new logic in `UserService`, mocking repository dependencies to test authorization and validation rules in isolation.
2.  **E2E Tests**: Create a new test file in `tests/users/` to write end-to-end tests. These tests will use `miniflare` to make actual HTTP requests to the endpoint and verify:
    - A successful role assignment returns `204`.
    - Requests from unauthorized users are rejected with `403`.
    - Requests with invalid data are rejected with `400` or `404`.
    - The database is correctly updated after a successful request.
