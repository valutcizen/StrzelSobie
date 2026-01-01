# REST API Plan - Events Module

This document outlines the REST API endpoints for the new Events module, based on the `events-prd.md`.

## 1. Resources

- **Events**: Represents an organized event, such as a competition or training.
- **Signups**: Represents a user's registration for a specific event.

## 2. Endpoints

All new endpoints will be versioned under `/api/v1`.

---

### Events

#### `POST /api/v1/ranges/{rangeSlug}/events`

-   **Description**: Creates a new event for a given range.
-   **Authorization**: `Shooting Range Administrator`, `Club/Community Administrator`. Also `Member` if the range's settings permit it.
-   **Request Payload**:
    ```json
    {
      "name": "Steel Challenge Practice",
      "publicDescription": "A practice session for the upcoming Steel Challenge competition. Open to all.",
      "memberDescription": "Club members, please remember to bring your membership cards.",
      "startTime": "2025-11-15T10:00:00Z",
      "endTime": "2025-11-15T14:00:00Z",
      "registrationType": "RegistrationRequired",
      "audience": "MembersOnly",
      "capacity": {
        "type": "Limited",
        "slots": 20,
        "waitlistSlots": 10
      },
      "guestPolicy": {
        "type": "GuestsAllowed"
      },
      "registrationDeadline": "2025-11-14T10:00:00Z"
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "id": 123,
      "name": "Steel Challenge Practice",
      "startTime": "2025-11-15T10:00:00Z"
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` (Range).
-   **Implementation Note**: Creating an event of type `RegistrationRequired` automatically creates a background reservation blocking all tracks for the event's duration.

#### `GET /api/v1/ranges/{rangeSlug}/events/{eventId}`

-   **Description**: Retrieves the full details for a single event on a specific range. The `participants` and `waitlist` arrays are only included if the requester is an authorized role (creator or admin).
-   **Response Payload (Success)**:
    ```json
    {
      "id": 123,
      "name": "Steel Challenge Practice",
      "publicDescription": "A practice session...",
      "memberDescription": "Visible only to members.",
      "startTime": "2025-11-15T10:00:00Z",
      "endTime": "2025-11-15T14:00:00Z",
      "registrationDeadline": "2025-11-14T10:00:00Z",
      "audience": "MembersOnly",
      "capacity": {
        "type": "Limited",
        "slots": 20,
        "remainingSlots": 5
      },
      "participants": [
        { "userId": 1, "name": "Jan Kowalski", "guests": 1, "signupTime": "2025-10-20T10:00:00Z" }
      ],
      "waitlist": [
        { "userId": 2, "name": "Anna Nowak", "guests": 0, "signupTime": "2025-10-21T11:00:00Z" }
      ]
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `404 Not Found`.

#### `PATCH /api/v1/ranges/{rangeSlug}/events/{eventId}`

-   **Description**: Updates the details of an existing event.
-   **Authorization**: Event Creator, `Shooting Range Administrator`, `Club/Community Administrator`.
-   **Request Payload**: A partial representation of the event object from the `POST` request.
-   **Success Code**: `200 OK`
-   **Error Codes**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

#### `DELETE /api/v1/ranges/{rangeSlug}/events/{eventId}`

-   **Description**: Cancels (soft-deletes) an event. This will trigger notifications to all registered participants.
-   **Authorization**: Event Creator, `Shooting Range Administrator`, `Club/Community Administrator`.
-   **Success Code**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `403 Forbidden`, `404 Not Found`.

---

### Calendar (Update to Existing Endpoint)

#### `GET /api/v1/ranges/{rangeSlug}/events`

-   **Description**: This existing endpoint will be updated to include `events` in its response, alongside `propositions` and `reservations`, to provide a complete view of the calendar. Propositions will no longer include any participant count field.
-   **Response Payload (Updated)**:
    ```json
    {
      "propositions": [
        {
          "id": 1,
          "userId": 2,
          "isMember": true,
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
          "details": {
             "coordinatorId": 5
          }
        }
      ],
      "events": [
        {
          "id": 123,
          "name": "Steel Challenge Practice",
          "startTime": "2025-11-15T10:00:00Z",
          "endTime": "2025-11-15T14:00:00Z",
          "audience": "MembersOnly"
        }
      ]
    }
    ```

---

### Signups

#### `POST /api/v1/ranges/{rangeSlug}/events/{eventId}/signups`

-   **Description**: Signs up the currently authenticated user for an event on a specific range.
-   **Request Payload**:
    ```json
    {
      "guests": 2 
    }
    ```
-   **Response Payload (Success)**:
    ```json
    {
      "signupId": 55,
      "status": "confirmed"
    }
    ```
-   **Success Code**: `201 Created`
-   **Error Codes**: `400 Bad Request` (Event is full, deadline passed), `403 Forbidden` (User does not meet audience criteria), `404 Not Found` (Event not found), `409 Conflict` (User already signed up).

#### `DELETE /api/v1/ranges/{rangeSlug}/events/{eventId}/signups/me`

-   **Description**: Cancels the current user's registration for an event on a specific range.
-   **Authorization**: Authenticated user who is signed up for the event.
-   **Success Code**: `204 No Content`
-   **Error Codes**: `401 Unauthorized`, `404 Not Found` (Event or user's signup not found).

#### `PATCH /api/v1/ranges/{rangeSlug}/events/{eventId}/signups/me`

-   **Description**: Updates the current user's registration for an event on a specific range (e.g., to change the number of guests).
-   **Authorization**: Authenticated user who is signed up for the event.
-   **Request Payload**:
    ```json
    {
      "guests": 1
    }
    ```
-   **Success Code**: `200 OK`
-   **Error Codes**: `400 Bad Request` (Not enough slots for additional guests), `401 Unauthorized`, `404 Not Found`.
