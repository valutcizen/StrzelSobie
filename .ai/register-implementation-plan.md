# API Endpoint Implementation Plan: `POST /api/v1/auth/register`

## 1. Endpoint Overview
This endpoint handles new user registration. It accepts an email and password, creates a new user record, assigns them a default "Guest" role, and stores their credentials securely.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword123"
  }
  ```
- **Parameters**:
  - **Required**:
    - `email` (string): A unique email address for the new user.
    - `password` (string): The user's desired password. Must be at least 8 characters long, containing at least one uppercase letter, one lowercase letter, and one number.

## 3. Used Types
- **DTOs**:
  - `RegisterUserRequestDto`: Validates the incoming request body.
    ```typescript
    // src/common/src/dto/auth.dto.ts
    export class RegisterUserRequestDto {
      email: string;
      password: string;
    }
    ```
  - `RegisteredUserDto`: Defines the structure of the successful response body.
    ```typescript
    // src/common/src/dto/auth.dto.ts
    export class RegisteredUserDto {
      id: number;
      email: string;
      roles: string[];
    }
    ```

## 4. Response Details
- **Success (201 Created)**:
  ```json
  {
    "id": 1,
    "email": "user@example.com",
    "roles": ["Guest"]
  }
  ```
- **Errors**:
  - `400 Bad Request`: Returned for invalid input (e.g., malformed email, weak password).
  - `409 Conflict`: Returned if the email address is already registered.
  - `500 Internal Server Error`: Returned for unexpected server-side issues.

## 5. Data Flow
1.  The `worker` receives a `POST` request to `/api/v1/auth/register`.
2.  The request is routed to the `auth` module's registration controller/handler within the worker.
3.  The handler validates the request body against the `RegisterUserRequestDto`. If validation fails, the handler returns a `400 Bad Request`.
4.  The handler extracts the source IP (e.g., from the `CF-Connecting-IP` header) and the proxied IP from the request details.
5.  The handler calls the `AuthService.register` method with the validated data and the extracted IP addresses.
6.  `AuthService` communicates with the `users` module's `UserService` to check if a user with the given email already exists.
7.  If the user exists, `AuthService` returns a failure `Result` object (e.g., `Result.fail(new EmailAlreadyExistsError())`).
8.  If the user does not exist, `AuthService` requests the creation of a new user from `UserService`, which adds an entry to the `users_users` table and returns the new user object.
9.  `AuthService` uses a secure hashing algorithm (e.g., bcrypt or Argon2) to hash the provided password.
10. `AuthService` inserts a new record into the `auth_user_credentials` table, linking the `user_id` to the `password_hash`.
11. `AuthService` assigns the default "Guest" role to the new user by creating an entry in the appropriate roles table (e.g., `auth_user_roles`).
12. `AuthService` calls the `AdminService.logAction` method to record the registration event. The payload should include `action_type: 'USER_REGISTRATION'`, `target_id: <new_user_id>`, and `details: { email: <user_email>, sourceIp: <source_ip>, proxiedIp: <proxied_ip> }`.
13. Upon successful creation, `AuthService` constructs a `RegisteredUserDto` and returns it within a success `Result` (e.g., `Result.ok(dto)`).
14. The handler receives the `Result` object. It inspects the result and translates it into the appropriate HTTP response:
    - On success, it sends a `201 Created` response with the DTO as the JSON payload.
    - On failure, it maps the domain error (e.g., `EmailAlreadyExistsError`) to the correct HTTP status (`409 Conflict`) and returns the response.

## 6. Security Considerations
- **Password Hashing**: Passwords must **never** be stored in plaintext. A strong, salted, one-way hashing algorithm like **Argon2** (preferred) or **bcrypt** must be used.
- **Input Validation**: All incoming data in the request body must be strictly validated to prevent injection attacks and ensure data integrity.
- **Rate Limiting**: Implement rate limiting on this endpoint to protect against brute-force account creation and denial-of-service attacks.
- **Error Messages**: Return clear but safe error messages. A `409 Conflict` is appropriate for existing emails, but other errors should not reveal unnecessary system details.

## 7. Performance Considerations
- The `email` column in the `users_users` table is constrained to be `UNIQUE`, which automatically creates an index. This ensures that checking for the existence of an email is a fast operation.
- The password hashing process is computationally intensive by design. This is a necessary security measure and not a performance bottleneck to be optimized away.

## 8. Implementation Steps
1.  **Common DTOs & Interfaces**:
    - Create `src/common/src/dto/auth.dto.ts` to define `RegisterUserRequestDto` and `RegisteredUserDto`.
    - Create an `IAdminService` interface in `src/common` with a `logAction` method. The method should accept a `details` object that can accommodate IP addresses.
    - Update `src/common/src/index.ts` to export all new types.
2.  **User Service**: In the `users` module, implement `findUserByEmail(email)` and `createUser(email)` methods within the `UserService`. `createUser` should return the newly created user object.
3.  **Admin Service**: In the `admin` module, create `src/admin/src/application/admin.service.ts` that implements `IAdminService`. The `logAction` method will handle inserting records into the `admin_audit_logs` table.
4.  **Auth Service**: In the `auth` module, create `src/auth/src/application/auth.service.ts`.
5.  **Implement `register` Method**:
    -   Update the method signature to accept `sourceIp` and `proxiedIp` strings.
    -   Inject `UserService`, `AdminService` (via interfaces), and the D1 database dependency.
    -   Implement the data flow logic described in section 5, returning a `Result` object.
    -   After creating the user, call `adminService.logAction`, passing the IPs in the `details` payload.
    -   Integrate a password hashing library (e.g., `bcryptjs`).
    -   Define custom domain errors (e.g., `EmailAlreadyExistsError`).
6.  **Worker Routing**: In `src/worker/index.ts`, add a route for `POST /api/v1/auth/register`.
7.  **Route Handler**:
    -   Instantiate all required services (`AuthService`, `UserService`, `AdminService`) and their dependencies.
    -   Extract source and proxied IP addresses from the request headers/properties.
    -   Implement request body validation, returning a `400 Bad Request` on failure.
    -   Call `authService.register`, passing the validated data and the IPs.
    -   Implement logic to map the returned `Result` object to an appropriate HTTP response (e.g., `201`, `409`, `500`).
8.  **Unit Tests**: 
    - Create unit tests for the `AuthService`, mocking all dependencies. Verify that `logAction` is called with the correct payload, including IP addresses.
    - Create unit tests for the `AdminService`.
9.  **Integration Tests**: Add integration tests that make a real HTTP request to the running worker and verify the endpoint returns the correct status codes and that an audit log with the correct IP information is created in the database.
