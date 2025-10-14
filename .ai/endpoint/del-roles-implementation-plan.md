# API Endpoint Implementation Plan: DELETE /api/v1/users/{userId}/roles/{roleId}

## 1. Endpoint Overview
This document outlines the implementation plan for a REST API endpoint that removes a role from a user. The endpoint is designed to handle both global and range-specific roles, with access restricted to authorized administrators (Club/Community Admin, Confirmator). The implementation will follow the existing architectural patterns of the Strzel Sobie project, including the use of a service layer for business logic and a worker for handling HTTP requests and responses.

## 2. Request Details
- **HTTP Method**: `DELETE`
- **URL Structure**: `/api/v1/users/{userId}/roles/{roleId}`
- **Parameters**:
  - **Required Path Parameters**:
    - `userId` (string): The unique identifier of the user from whom the role will be removed.
    - `roleId` (string): The unique identifier of the role to be removed.
  - **Optional Query Parameters**:
    - `rangeId` (string): The unique identifier of the shooting range. Required only when removing a role with a 'range' scope.
- **Request Body**: None.

## 3. Used Types
- **Command Model (New)**: A new command model will be created in the `users` module to encapsulate the data required for the operation.
  ```typescript
  // Inferred location: src/users/src/application/user.service.ts
  export type RemoveRoleFromUserCommand = {
    targetUserId: number;
    roleId: number;
    rangeId: number | null;
    requester: UserIdentifierDto; // From session
  };
  ```
- **DTOs (Existing)**:
  - `UserIdentifierDto` (`@strzel-sobie/common`): To identify the user performing the action.
- **Custom Errors (Existing and New)**:
  - `UserNotFoundError` (`@strzel-sobie/common`)
  - `RoleNotFoundError` (`@strzel-sobie/common`)
  - `RangeNotFoundError` (`@strzel-sobie/common`)
  - `ForbiddenError` (`@strzel-sobie/common`)
  - `RoleScopeError` (`@strzel-sobie/common`): For mismatches between role scope and the `rangeId` parameter.

## 4. Response Details
- **Success**:
  - `204 No Content`: Returned when the role has been successfully removed from the user, or if the user never had the role in the first place (idempotency).
- **Error**:
  - `400 Bad Request`: Invalid input, such as providing a `rangeId` for a global role or omitting it for a range-scoped role.
  - `401 Unauthorized`: The user is not authenticated.
  - `403 Forbidden`: The authenticated user does not have the necessary permissions to remove roles.
  - `404 Not Found`: The specified `userId`, `roleId`, or `rangeId` does not exist.
  - `500 Internal Server Error`: An unexpected server-side error occurred.

## 5. Data Flow
1.  The Cloudflare Worker receives a `DELETE` request at `/api/v1/users/{userId}/roles/{roleId}`.
2.  The `auth` middleware verifies the user's session from the KV store and attaches the user's identity (`UserIdentifierDto`) to the context.
3.  The endpoint class (`RemoveUserRoleRoute`) parses and validates the `userId`, `roleId` (from path), and `rangeId` (from query) using a `zod` schema.
4.  The endpoint retrieves the `UserService` and the requester's identity from the context.
5.  It constructs a `RemoveRoleFromUserCommand` object and calls the `userService.removeRoleFromUser(command)` method.
6.  The `UserService` executes the core business logic:
    a. It performs an authorization check to ensure the `requester` has the required administrative privileges.
    b. It validates that the `targetUserId`, `roleId`, and `rangeId` (if provided) exist in the database.
    c. It fetches the role's `scope` from the `users_roles` table.
    d. It validates that `rangeId` is present if and only if the role's scope is 'range'.
    e. Based on the scope, it issues a `DELETE` statement to the appropriate join table (`users_user_global_roles` or `users_user_range_roles`).
    f. It returns a `Result` object indicating success or failure.
7.  The endpoint class inspects the `Result` object and maps it to the corresponding HTTP response (`204`, `400`, `403`, `404`, or `500`).

## 6. Security Considerations
- **Authentication**: Handled by the existing `auth` middleware, which validates the session token against the Cloudflare KV store.
- **Authorization**: The `UserService` must contain logic to verify that the requester has one of the required roles (e.g., 'Club Admin', 'Community Admin', 'Confirmator') before proceeding with the role removal.
- **Input Validation**: All incoming parameters (`userId`, `roleId`, `rangeId`) will be strictly validated as numbers using `zod` in the endpoint definition to prevent injection attacks and malformed requests.
- **IDOR (Insecure Direct Object Reference)**: The authorization logic must be robust. For range-specific roles, it should confirm that the administrator has authority over the specified `rangeId`.

## 7. Performance Considerations
- The operation involves simple, indexed `DELETE` queries on join tables, which should be highly performant.
- The validation steps involve `SELECT` queries on indexed primary keys, which are also efficient.
- No significant performance bottlenecks are anticipated for this endpoint.

## 8. Implementation Steps
1.  **Update `UserService` (`src/users/src/application/user.service.ts`):**
    -   Define the `RemoveRoleFromUserCommand` type.
    -   Create a new public method: `async removeRoleFromUser(command: RemoveRoleFromUserCommand): Promise<Result<void, ...>>`.
    -   Implement the authorization logic to check the `requester`'s permissions.
    -   Implement the validation logic to check for the existence of the user, role, and range.
    -   Implement the scope validation logic (`rangeId` presence vs. role scope).
    -   Implement the database deletion logic, targeting the correct table based on the role's scope.
    -   Return `Result.success()` or `Result.failure(error)`.

2.  **Update `IUserService` (`src/common/src/interfaces/user.service.interface.ts`):**
    -   Add the method signature for `removeRoleFromUser` to the interface to make it accessible to the worker.

3.  **Create Endpoint File (`src/worker/src/endpoints/v1/user/remove-role.ts`):**
    -   Create a new file `remove-role.ts` based on the structure of `set-role.ts`.
    -   Create a new class `RemoveUserRoleRoute` that extends `OpenAPIRoute`.
    -   Define the `OpenAPIRouteSchema` with the correct summary, description, tags, and responses.
    -   Define the `zod` schema for request validation:
        -   `params`: `userId` and `roleId` (as strings).
        -   `query`: `rangeId` (as an optional string).

4.  **Implement `handle` Method in `RemoveUserRoleRoute`:**
    -   Use `this.getValidatedData()` to parse and validate request parameters.
    -   Convert string parameters to numbers.
    -   Get the `userService` and `requester` from the context `c`.
    -   Create and dispatch the `RemoveRoleFromUserCommand` to the service.
    -   Implement the logic to map the returned `Result` object to the appropriate HTTP status codes (`204`, `400`, `403`, `404`).

5.  **Update Worker Router (`src/worker/src/index.ts`):**
    -   Import the new `RemoveUserRoleRoute`.
    -   Register the new route with the Hono router instance for the path `DELETE /api/v1/users/:userId/roles/:roleId`.

6.  **Add Tests (`tests/users/remove-role.e2e.test.ts`):**
    -   Create a new E2E test file.
    -   Write tests for success scenarios (global and range-scoped role removal).
    -   Write tests for failure scenarios:
        -   Unauthorized (no token).
        -   Forbidden (insufficient permissions).
        -   Not Found (invalid user, role, or range ID).
        -   Bad Request (scope mismatch).
