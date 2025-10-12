# API Endpoint Implementation Plan: POST /api/v1/auth/login

## 1. Endpoint Overview
This document outlines the implementation plan for the user authentication endpoint. Its purpose is to verify a user's credentials (email and password), and upon successful verification, create a secure session for them.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/auth/login`
- **Request Body**: The request body must be a JSON object with the following structure:
  ```json
  {
    "email": "user@example.com",
    "password": "strongpassword123"
  }
  ```

## 3. Used Types
The following DTO (Data Transfer Object) will be used for validating the request body. It will be defined in `src/common/src/dto/auth.dto.ts`.

- **`LoginUserDto`**:
  ```typescript
  import { z } from 'zod';

  export const LoginUserDtoSchema = z.object({
    email: z.string().email({ message: "Invalid email format." }),
    password: z.string().min(1, { message: "Password cannot be empty." }),
  });

  export type LoginUserDto = z.infer<typeof LoginUserDtoSchema>;
  ```

## 4. Response Details
- **Success (`200 OK`)**:
  - A session token will be generated and set in a secure, `HttpOnly` cookie named `session_token`.
  - The response body will be a JSON object:
    ```json
    {
      "message": "Login successful."
    }
    ```
- **Error (`4xx/5xx`)**:
  - Error responses will conform to a standardized JSON structure:
    ```json
    {
      "message": "Descriptive error message."
    }
    ```

## 5. Data Flow
1.  The **Cloudflare Worker** receives the `POST` request.
2.  The worker's routing layer uses `zod` and the `LoginUserDtoSchema` to validate the request body. If validation fails, it immediately returns a `400 Bad Request`.
3.  The worker invokes the `login` method on the `AuthService`, passing the validated `LoginUserDto`.
4.  The `AuthService` calls the `findByEmail` method on the `UserRepository` to retrieve the user from the `users_users` table.
5.  If a user is found and is not marked as deleted, the `AuthService` calls the `findCredentialsByUserId` method on the `AuthRepository` to get the `password_hash` from the `auth_user_credentials` table.
6.  The `AuthService` securely compares the provided password with the stored hash using a constant-time comparison function to prevent timing attacks.
7.  If the password is valid, the `AuthService` generates a cryptographically secure session token.
8.  The session token is stored in the **Cloudflare KV** cache, with the token as the key and the user ID as the value. A Time-to-Live (TTL) for the session will be set.
9.  The `AuthService` returns a success `Result` to the worker.
10. The worker receives the success result, sets the session token in an `HttpOnly`, `Secure`, and `SameSite=Strict` cookie, and returns a `200 OK` response.
11. If any step from 4-6 fails, the service returns an error `Result`, and the worker maps it to a `401 Unauthorized` response.

## 6. Security Considerations
- **Password Hashing**: A strong, modern hashing algorithm (e.g., Argon2 or bcrypt) compatible with Cloudflare Workers must be used for hashing and verification.
- **Session Management**: Session tokens will be stored in `HttpOnly`, `Secure`, and `SameSite=Strict` cookies to protect against XSS and CSRF attacks. Tokens will have a defined expiration time.
- **Rate Limiting**: The endpoint will be protected by Cloudflare's rate-limiting feature to prevent brute-force login attempts. A strict policy (e.g., 10 failed attempts per IP per 15 minutes) will be enforced.
- **Information Disclosure**: To prevent user enumeration, the error message for "user not found" and "incorrect password" will be identical: "Invalid email or password."

## 7. Error Handling
- **`400 Bad Request`**: Returned if the request body does not match the `LoginUserDtoSchema`.
- **`401 Unauthorized`**: Returned for any of the following reasons:
    - User with the provided email does not exist.
    - User account is soft-deleted.
    - Password does not match the stored hash.
- **`429 Too Many Requests`**: Returned by Cloudflare if the rate limit is exceeded.
- **`500 Internal Server Error`**: Returned for any unexpected server-side issues, such as failure to connect to the D1 database or Cloudflare KV.

## 8. Performance Considerations
- Database queries will be indexed on `users_users.email` and `auth_user_credentials.user_id` to ensure fast lookups.
- The session token generation and password hashing operations are CPU-intensive. Ensure the chosen libraries are performant within the Cloudflare Worker environment.

## 9. Implementation Steps
1.  **Common DTO**: Create `src/common/src/dto/auth.dto.ts` and define the `LoginUserDtoSchema`.
2.  **Repository Layer**:
    - In the `users` module, ensure the `UserRepository` has a `findByEmail` method.
    - In the `auth` module, create an `AuthRepository` with a `findCredentialsByUserId` method.
3.  **Service Layer (`auth` module)**:
    - Implement the `login(dto: LoginUserDto)` method in `AuthService` (`src/auth/src/application/auth.service.ts`).
    - Integrate a password-hashing library (e.g., `hono/bearer-auth` or a similar library for hashing).
    - Add logic to generate a session token and interact with a `SessionRepository` (which will abstract KV storage).
4.  **Session Storage**: Implement a `SessionRepository` that uses the Cloudflare KV binding to `put` and `get` session data.
5.  **Worker Endpoint (`worker` module)**:
    - Create a new file: `src/worker/src/endpoints/v1/auth.login.ts`.
    - Use `chanfana`'s `OpenAPIRoute` to define the endpoint, its schema (`LoginUserDtoSchema`), and metadata.
    - Implement the route handler that calls `AuthService.login`.
    - Add logic to handle the `Result` object from the service, setting the cookie on success and returning the appropriate error response on failure.
6.  **Configuration**:
    - Add the KV namespace binding for sessions to `wrangler.jsonc`.
    - Configure rate limiting for the `/api/v1/auth/login` route in the Cloudflare dashboard or via configuration files.
7.  **Testing**:
    - Write unit tests for the `AuthService` `login` method, mocking repository dependencies.
    - Write an end-to-end integration test for the login endpoint using `vitest` and `miniflare` to simulate the request/response flow.
