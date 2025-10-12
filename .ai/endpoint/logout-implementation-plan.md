# API Endpoint Implementation Plan: `POST /api/v1/auth/logout`

## 1. Endpoint Overview
This endpoint terminates an authenticated user's session. It does so by deleting the session identifier from the session store (Cloudflare KV) and clearing the session cookie on the client's browser. The endpoint is designed to be idempotent, meaning it will successfully complete even if the session token is already invalid or expired, ensuring the client is always returned to a logged-out state.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/auth/logout`
- **Parameters**:
  - **Cookie**:
    - `session_token` (Required): The session token issued during login. This should be sent as an `HttpOnly` cookie.
- **Request Body**: None.

## 3. Used Types
No DTOs or Command Models are required for this endpoint, as the request body is empty and the response body is minimal.

## 4. Response Details
- **Success Response**:
  - **Code**: `200 OK`
  - **Body**: `null`
  - **Headers**:
    - `Set-Cookie`: `session_token=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` - This header instructs the browser to immediately delete the session cookie.
- **Error Response**:
  - **Code**: `401 Unauthorized`
  - **Body**: `{ "error": "Unauthorized" }`
  - **Condition**: This response is returned if the `session_token` cookie is not present in the request.

## 5. Data Flow
1. The client sends a `POST` request to `/api/v1/auth/logout`. The browser automatically includes the `session_token` cookie.
2. The Cloudflare Worker (`src/worker`) receives the request and extracts the `session_token` from the request cookies.
3. If no token is found, the worker immediately responds with `401 Unauthorized`.
4. If a token is present, the worker invokes the `logout` method on the `AuthService` (from the `auth` module), passing the session token.
5. The `AuthService` calls the `deleteSession` method on the `SessionRepository`.
6. The `SessionKvRepository` implementation of the repository deletes the session record from the Cloudflare KV store, using the session token as the key.
7. The `AuthService` returns a success result to the worker.
8. The worker constructs a `200 OK` response, adding a `Set-Cookie` header to clear the cookie on the client side.
9. The client receives the response, and its session cookie is removed, effectively logging the user out.

## 6. Security Considerations
- **Authentication**: The presence of a valid `session_token` cookie is the authentication mechanism. If the cookie is missing, the request is considered unauthenticated.
- **CSRF Protection**: The `SameSite=Strict` attribute on the session cookie should be used to mitigate the risk of Cross-Site Request Forgery (CSRF) attacks.
- **Cookie Security**: The `Set-Cookie` header for clearing the cookie must include the `HttpOnly`, `Secure`, and `Path` attributes to match the original cookie's properties and ensure it is properly removed.

## 7. Error Handling
- **No Session Cookie**: If the request does not contain a `session_token` cookie, the endpoint will return a `401 Unauthorized` status with a JSON error message.
- **Invalid/Expired Token**: If the provided token does not correspond to an existing session in the KV store, the delete operation will fail silently. The endpoint will still proceed to clear the client-side cookie and return a `200 OK` response to ensure the client is in a consistent logged-out state.
- **Server-Side Errors**: Any unexpected errors during the KV store operation will be caught by the global error handler in the worker and result in a `500 Internal Server Error` response.

## 8. Performance Considerations
- The core operation is a single `delete` call to the Cloudflare KV store, which is a highly optimized, low-latency operation.
- This endpoint is not expected to have any performance bottlenecks.

## 9. Implementation Steps
1.  **`auth` Module (`src/auth`):**
    -   In `AuthService` (`application/auth.service.ts`), create a new public method: `async logout(sessionToken: string): Promise<Result<void, Error>>`.
    -   This method will call `this.sessionRepository.deleteSession(sessionToken)`.
    -   Wrap the call in a `try...catch` block and return a `Result.ok()` on success or `Result.err()` on failure.

2.  **`worker` Module (`src/worker`):**
    -   Create a new endpoint file: `src/endpoints/v1/auth/logout.ts`.
    -   Define a `hono` route for `POST /api/v1/auth/logout`.
    -   Use the `getCookie` helper from `hono/cookie` to extract the `session_token`.
    -   **If `session_token` is undefined**: Return `c.json({ error: 'Unauthorized' }, 401)`.
    -   **If `session_token` is present**:
        -   Call `await c.env.AuthService.logout(sessionToken)`.
        -   Use the `setCookie` helper from `hono/cookie` to clear the client cookie. Set the following options: `{ name: 'session_token', value: '', path: '/', httpOnly: true, secure: true, sameSite: 'Strict', maxAge: 0 }`.
        -   Return `c.json(null, 200)`.

3.  **`worker` Module (`src/worker/src/index.ts`):**
    -   Import the new logout route handler.
    -   Add the handler to the main Hono app instance under the `/api/v1/auth` route group.

4.  **Testing (`tests/worker`):**
    -   Create a new test file for the logout endpoint.
    -   **Test Case 1**: Verify that a request without a `session_token` cookie returns `401 Unauthorized`.
    -   **Test Case 2**: Verify that a request with a `session_token` cookie calls `AuthService.logout` with the correct token.
    -   **Test Case 3**: Verify that a successful logout returns `200 OK` and includes the correct `Set-Cookie` header to clear the cookie.
