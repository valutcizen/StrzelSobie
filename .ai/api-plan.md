# REST API Plan

This document outlines the REST API for the Strzel Sobie application, designed based on the project's PRD, database schema, and tech stack.

## 1. Versioning

The API will be versioned using a URI path prefix. The current version is `v1`. All endpoints will be prefixed with `/api/v1`.

Example: `GET /api/v1/ranges`

## 2. Resources

-   **Users**: Represents user accounts. Corresponds to `users_users`.
-   **Roles**: Represents user roles. Corresponds to `users_roles`.
-   **Auth**: Handles authentication tasks like registration, login, and session management.
-   **Ranges**: Represents shooting ranges. Corresponds to `admin_shooting_ranges`.
-   **Propositions**: Represents user-created booking proposals. Corresponds to `reservations_propositions`.
-   **Reservations**: Represents confirmed bookings. Corresponds to `reservations_reservations`.
-   **Records**: Represents manually logged, off-system bookings. Corresponds to `reservations_records`.
-   **Events**: A composite resource for fetching calendar data (propositions and reservations).
-   **Audit Logs**: Represents the system audit trail. Corresponds to `admin_audit_logs`.

## 3. Endpoints

---

### Auth

#### `POST /api/v1/auth/register`

-   **Description**: Registers a new user with the "Guest" role.
-   **Request Payload**:
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123"
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "roles": ["Guest"]
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request` (Invalid email/password), `409 Conflict` (Email already exists).

#### `POST /api/v1/auth/login`

-   **Description**: Authenticates a user and starts a session.
-   **Request Payload**:
    ```json
    {
      "email": "user@example.com",
      "password": "strongpassword123"
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "message": "Login successful."
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `401 Unauthorized` (Invalid credentials).

#### `POST /api/v1/auth/logout`

-   **Description**: Terminates the user's session.
-   **Success Code**: `200 OK`
-   **Error Codes**: `401 Unauthorized`.

#### `GET /api/v1/auth/me`

-   **Description**: Retrieves the profile of the currently authenticated user.
-   **Response Payload (Success)**:
    ```json
    {
      "id": 1,
      "email": "user@example.com",
      "phoneNumber": "123456789",
      "roles": ["Member", "Coordinator"],
      "rangeRoles": {
        "dobczyce": ["Shooting Range Administrator"]
      }
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `401 Unauthorized`.

---

### Roles

#### `GET /api/v1/roles`

-   **Description**: Retrieves a list of all available roles with their IDs and scopes. (Club/Community Admin and Confirmator only).
-   **Response Payload (Success)**:
    ```json
    [
      { "id": 1, "name": "Guest", "scope": "global" },
      { "id": 2, "name": "Member", "scope": "global" },
      { "id": 3, "name": "Coordinator", "scope": "global" },
      { "id": 4, "name": "Confirmator", "scope": "global" },
      { "id": 5, "name": "Shooting Range Administrator", "scope": "range" },
      { "id": 6, "name": "Club/Community Administrator", "scope": "global" }
    ]
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`.

---

### Users & Roles (Club/Community Admin and Confirmator only)

#### `GET /api/v1/users`

-   **Description**: Retrieves a list of all users. (Admin access).
-   **Query Parameters**: `page`, `limit`, `sortBy`, `sortOrder`, `filter`.
-   **Response Payload (Success)**:
    ```json
    {
      "data": [
        {
          "id": 1,
          "email": "user@example.com",
          "isDeleted": 0,
          "createdAt": "2025-10-11T10:00:00Z"
        }
      ],
      "pagination": { "total": 1, "page": 1, "limit": 10 }
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`.

#### `POST /api/v1/users/{userId}/roles`

-   **Description**: Assigns a role to a user. (Club/Community Admin and Confirmator only).
-   **Request Payload**:
    ```json
    {
      "roleId": 2, // ID for "Member"
      "rangeId": null // or rangeId for range-specific roles
    }
    ```
-   **Success Code**: `204 No Content`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (User or Role).

#### `DELETE /api/v1/users/{userId}/roles/{roleId}`

-   **Description**: Removes a role from a user. (Club/Community Admin and Confirmator only).
-   **Query Parameters**: `rangeId` (optional, for range-specific roles).
-   **Success Code**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### Ranges

#### `GET /api/v1/ranges`

-   **Description**: Retrieves a list of all shooting ranges.
-   **Response Payload (Success)**:
    ```json
    [
      {
        "id": 1,
        "slug": "dobczyce",
        "displayName": "Strzelnica Dobczyce"
      }
    ]
    ```
-   **Success Code**: `200 OK`

#### `GET /api/v1/ranges/{rangeSlug}`

-   **Description**: Retrieves detailed information for a specific range.
-   **Response Payload (Success)**:
    ```json
    {
      "id": 1,
      "slug": "dobczyce",
      "displayName": "Strzelnica Dobczyce",
      "totalTracks": 10,
      "operatingHours": { "monday": { "open": "10:00", "close": "18:00" } }
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `404 Not Found`.

#### `PATCH /api/v1/ranges/{rangeSlug}`

-   **Description**: Updates settings for a shooting range. (Range Admin access).
-   **Request Payload**:
    ```json
    {
      "totalTracks": 12,
      "operatingHours": { "monday": { "open": "09:00", "close": "19:00" } }
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### Calendar Events

#### `GET /api/v1/ranges/{rangeSlug}/events`

-   **Description**: Retrieves all event types (propositions, reservations) for a given date range to display on the calendar. Visibility of details depends on user role.
-   **Query Parameters**: `startDate` (YYYY-MM-DD), `endDate` (YYYY-MM-DD).
-   **Response Payload (Success)**:
    ```json
    {
      "propositions": [
        {
          "id": 1,
          "userId": 2,
          "isMember": true, // Highlight for coordinators
          "eventDate": "2025-10-15",
          "startTime": "14:00",
          "endTime": "15:00",
          "tracksRequested": 2
        }
      ],
      "reservations": [
        {
          "id": 1,
          "eventDate": "2025-10-16",
          "startTime": "10:00",
          "endTime": "12:00",
          "tracksRequested": 5,
          "isPublic": true,
          "isJoinable": false,
          // Details are null/omitted for Guests if not public
          "details": {
             "coordinatorId": 5,
             "numParticipants": 10
          }
        }
      ]
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `404 Not Found` (Range).

---

### Propositions

#### `POST /api/v1/ranges/{rangeSlug}/propositions`

-   **Description**: Creates a new proposition for a shooting session. (Guest, Member access).
-   **Request Payload**:
    ```json
    {
      "eventDate": "2025-10-15",
      "startTime": "14:00",
      "endTime": "15:00",
      "numParticipants": 5,
      "tracksRequested": 2
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "id": 1,
      "userId": 2,
      "rangeId": 1,
      "status": "open",
      // ...other fields
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request` (e.g., time conflict, invalid data), `401 Unauthorized`, `403 Forbidden`.

#### `DELETE /api/v1/propositions/{propositionId}`

-   **Description**: Cancels a proposition. Can only be done by the user who created it, if it's still "open".
-   **Success Code**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### Reservations

#### `POST /api/v1/ranges/{rangeSlug}/reservations`

-   **Description**: Creates a new reservation. Can be done directly by a Coordinator, or by converting a proposition.
-   **Request Payload (Direct Creation)**:
    ```json
    {
      "eventDate": "2025-10-18",
      "startTime": "11:00",
      "endTime": "13:00",
      "numParticipants": 8,
      "tracksRequested": 4,
      "isPublic": true,
      "isJoinable": true
    }
    ```
-   **Request Payload (From Proposition, with modifications)**:
    ```json
    {
      "propositionId": 1,
      "startTime": "14:30", // Coordinator adjusted time
      "endTime": "15:30",
      "tracksRequested": 3 // and tracks
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "id": 2,
      "rangeId": 1,
      "coordinatorId": 5,
      // ...other fields
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request` (Overlap warning can be part of this, requiring a `force=true` confirmation), `401 Unauthorized`, `403 Forbidden`.

#### `DELETE /api/v1/reservations/{reservationId}`

-   **Description**: Cancels a confirmed reservation. (Coordinator access).
-   **Success Code**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### Records

#### `POST /api/v1/ranges/{rangeSlug}/records`

-   **Description**: Manually logs an off-system booking (a post-factum reservation) for metric tracking. (Range Admin access).
-   **Request Payload**:
    ```json
    {
      "eventDate": "2025-10-20",
      "startTime": "15:00",
      "endTime": "16:00",
      "numParticipants": 12
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`.

## 4. Authentication and Authorization

-   **Mechanism**: Session-based authentication. After a successful `POST /auth/login`, the server will issue a session token stored in an `HttpOnly`, `Secure` cookie. Subsequent requests must include this cookie.
-   **Session Store**: Cloudflare KV will be used as a distributed session cache, mapping session tokens to user IDs and roles.
-   **Authorization**: A middleware in the Cloudflare Worker will run on every protected endpoint. It will validate the session token, retrieve user roles from the cache, and verify if the user has the required permissions for the requested action. Role checks will be performed against a predefined access control list (e.g., only users with the "Coordinator" role can access reservation creation).

## 5. Validation and Business Logic

-   **Validation**: API input will be validated at the application layer before hitting the database. This includes:
    -   **Presence & Uniqueness**: `email` on registration, `slug` on range creation.
    -   **Data Types & Formats**: Ensuring numbers are numeric, dates are `YYYY-MM-DD`, and times are `HH:MM`.
    -   **Foreign Keys**: Verifying that `userId`, `rangeId`, etc., exist.
    -   **Business Rules**: Checking that `startTime` is before `endTime`.

-   **Business Logic Implementation**:
    -   **RBAC**: The authorization middleware is the primary enforcer of role-based permissions. The `GET /ranges/{rangeSlug}/events` endpoint will contain specific logic to filter the response based on the caller's role (Guest vs. Member).
    -   **Proposition Conversion**: The `POST /ranges/{rangeSlug}/reservations` endpoint will contain logic to handle both direct creation and conversion. If a `propositionId` is present, it will update the proposition's status to "converted" and copy its data into the new reservation, applying any modifications from the request payload.
    -   **Conflict Management**:
        -   The `POST /ranges/{rangeSlug}/propositions` endpoint will query existing reservations and propositions to check for time/track availability and return a `400 Bad Request` if a conflict exists.
        -   The `POST /ranges/{rangeSlug}/reservations` endpoint will perform a similar check. If an overlap is detected and the user is a Coordinator, it will return a `400 Bad Request` with a specific error message and code (e.g., `{"error": "OVERLAP_DETECTED"}`). The client can then re-submit the request with a `force=true` query parameter to bypass the warning.
    -   **Notifications**: After successfully processing requests that trigger notifications (e.g., proposition creation, reservation confirmation/cancellation), the API will call a separate `notifications` module to dispatch emails asynchronously.
