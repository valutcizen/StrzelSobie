# API Endpoint Implementation Plan: GET /api/v1/auth/me

## 1. Endpoint Overview
This document outlines the implementation plan for the `GET /api/v1/auth/me` endpoint. Its purpose is to retrieve the profile of the currently authenticated user by reading data stored directly within their session in the Cloudflare KV store.

**Design Note**: This approach prioritizes performance by avoiding database queries on this endpoint. The user's profile data is denormalized and stored in the session object upon creation (i.e., during login). The trade-off is that this data can become stale if the user's profile is updated in the D1 database. Changing user data will apply after re-login.

## 2. Request Details
- **HTTP Method**: `GET`
- **URL Structure**: `/api/v1/auth/me`
- **Parameters**:
  - **Required**: None.
  - **Optional**: None.
- **Headers**:
  - **Required**: A valid session identifier (e.g., a session cookie) must be present in the request to authenticate the user.
- **Request Body**: None.

## 3. Used Types
- **DTO**: `MeDto`
  - **Location**: `src/common/dto/auth.dto.ts`
  - **Structure**:
    ```typescript
    export interface MeDto {
      id: number;
      email: string;
      phoneNumber: string | null;
      roles: string[];
      rangeRoles: Record<string, string[]>;
    }
    ```
- **Session Data (in KV)**: The object stored in KV must contain the user profile.
    ```typescript
    // Example structure of the session object in KV
    interface SessionData {
      sessionId: string;
      userId: number;
      email: string;
      phoneNumber: string | null;
      roles: string[];
      rangeRoles: Record<string, string[]>;
      // ... other session metadata like expiry
    }
    ```

## 4. Response Details
- **Success Response**:
  - **Code**: `200 OK`
  - **Payload**: A JSON object of type `MeDto`.
- **Error Responses**:
  - **Code**: `401 Unauthorized`
    - **Reason**: The request lacks a valid session token, or the token is expired/invalid.
  - **Code**: `500 Internal Server Error`
    - **Reason**: An unexpected error occurred on the server, such as the KV store being unavailable or the session data being malformed.

## 5. Data Flow
1. The `worker` module receives a `GET` request to `/api/v1/auth/me`.
2. A middleware or route handler extracts the session token from the request's cookies. If no token is found, it returns a `401 Unauthorized` response.
3. The handler invokes the `authService.validateSession()` method with the token. This service interacts with the Cloudflare KV store to look up the session.
4. If the session is not found, is invalid, or has expired, `authService` returns an error, and the handler sends a `401 Unauthorized` response.
5. If the session is valid, `authService` returns the complete session object, which contains the user's profile data.
6. The handler maps the profile data from the session object directly to the `MeDto`.
7. The `worker` sends the `MeDto` object as a JSON payload with a `200 OK` status code.

## 6. Security Considerations
- **Authentication**: The endpoint is protected by the session token. The token must be managed securely (e.g., using `HttpOnly`, `Secure`, and `SameSite` cookie attributes).
- **Authorization**: The endpoint implicitly authorizes the user to view their own data. The data is sourced exclusively from the session tied to their token.
- **Data Staleness**: As noted, the session data is a snapshot. Sensitive operations should always re-validate permissions against the D1 database, not rely solely on roles stored in the session.

## 7. Performance Considerations
- **KV Store**: The endpoint's performance is excellent as it only requires a single, fast read from the Cloudflare KV store.
- **No Database Access**: This approach completely avoids hitting the D1 relational database, making the endpoint highly responsive and scalable.

## 8. Implementation Steps
1. **Define DTO**: Ensure the `MeDto` interface exists in `src/common/dto/auth.dto.ts`.
2. **Update Session Creation Logic**: The `createSession` method (likely part of the login flow) **must** be updated. It is now responsible for fetching the full user profile from the `userService` and storing all required fields (`id`, `email`, `phoneNumber`, `roles`, `rangeRoles`) within the session object in the KV store.
3. **Create Endpoint in Worker**: In the `src/worker` module, define the `GET /api/v1/auth/me` route using Hono and `OpenAPIRoute`.
4. **Add Authentication Middleware**: Implement or reuse a middleware that extracts the session token and passes it to the handler.
5. **Implement Route Handler**:
   - Instantiate `AuthService`.
   - Call `authService.validateSession(token)`.
   - Handle the `Result` object:
     - On failure, return a `401 Unauthorized` response.
     - On success, map the returned session data to a `MeDto` instance.
   - Return the `MeDto` with a `200 OK` status using `c.json()`.
6. **Dependency Injection**: Ensure `AuthService` is available to the route handler via the Hono context.
7. **Write Integration Tests**: In `tests/worker`, create/update tests for this endpoint:
   - Test the success case with a valid, mocked session containing the full user profile.
   - Test the failure case for a missing or invalid session token.
   - Test the failure case where the session object in KV is malformed or missing required fields, which should result in a `500` error.
