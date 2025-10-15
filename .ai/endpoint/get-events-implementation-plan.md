# API Endpoint Implementation Plan: GET /api/v1/ranges/{rangeSlug}/events

## 1. Endpoint Overview
This endpoint retrieves all calendar events, which include `propositions` and `reservations`, for a specific shooting range within a given date range. The visibility and level of detail of the returned events are determined by the role of the authenticated user (Guest, Member, Coordinator, or Admin), ensuring that sensitive information is protected.

## 2. Request Details
- **HTTP Method:** `GET`
- **URL Structure:** `/api/v1/ranges/{rangeSlug}/events`
- **Parameters:**
  - **Path:**
    - `rangeSlug` (string, required): The unique identifier for the shooting range.
  - **Query:**
    - `startDate` (string, required): The start of the date range in `YYYY-MM-DD` format.
    - `endDate` (string, required): The end of the date range in `YYYY-MM-DD` format.
- **Request Body:** None.

## 3. Used Types
The following new DTOs and Command Models will be created.

- **File:** `src/common/src/dto/calendar.dto.ts`
  - `PropositionEventDto`:
    ```typescript
    export type PropositionEventDto = {
      id: number;
      userId: number;
      isMember: boolean; // True if the user is a club member, for UI highlighting
      eventDate: string;
      startTime: string;
      endTime: string;
      tracksRequested: number;
    };
    ```
  - `ReservationEventDto`:
    ```typescript
    export type ReservationEventDto = {
      id: number;
      eventDate: string;
      startTime: string;
      endTime: string;
      tracksRequested: number;
      isPublic: boolean;
      isJoinable: boolean;
      details: {
         coordinatorId: number;
         numParticipants: number;
      } | null;
    };
    ```
  - `CalendarEventsDto`:
    ```typescript
    export type CalendarEventsDto = {
      propositions: PropositionEventDto[];
      reservations: ReservationEventDto[];
    };
    ```
- **Command Model (for Service Layer):**
  - `GetCalendarEventsQuery`:
    ```typescript
    export type GetCalendarEventsQuery = {
      rangeSlug: string;
      startDate: string;
      endDate: string;
      user: {
        id: string;
        roles: string[];
      };
    };
    ```

## 4. Response Details
- **Success (200 OK):**
  - Returns a `CalendarEventsDto` object containing arrays of propositions and reservations visible to the user.
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
        "isPublic": true,
        "isJoinable": false,
        "details": {
           "coordinatorId": 5,
           "numParticipants": 10
        }
      }
    ]
  }
  ```
- **Error:**
  - `400 Bad Request`: Invalid input for `rangeSlug`, `startDate`, or `endDate`.
  - `404 Not Found`: The specified `rangeSlug` does not exist.
  - `500 Internal Server Error`: For any unexpected server-side issues.

## 5. Data Flow
1.  The client sends a `GET` request to the `/api/v1/ranges/{rangeSlug}/events` endpoint.
2.  The `worker` receives the request. The `get-events.ts` endpoint handler validates the path and query parameters using a `zod` schema.
3.  The handler retrieves the `ReservationsService` and the user session object from the Hono context.
4.  It calls `reservationsService.getCalendarEvents()` with a `GetCalendarEventsQuery` object containing the validated parameters and user data.
5.  The `ReservationsService` first calls the `AdminRepository` to resolve the `rangeSlug` to a `range_id`. If not found, it returns a `NotFound` error.
6.  The service then calls the `ReservationsRepository` to fetch all propositions and reservations from the `reservations_propositions` and `reservations_reservations` tables that fall within the date range for the given `range_id`.
7.  The service processes the raw data, applying authorization rules based on the user's roles to filter the lists and shape the data into the `CalendarEventsDto` format. It omits or includes data (like reservation `details`) accordingly.
8.  The service returns a `Result.ok(calendarEventsDto)` on success or a `Result.err()` on failure.
9.  The `worker` endpoint handler receives the `Result`, maps it to the appropriate HTTP status code (`200`, `404`, `500`), and sends the JSON response to the client.

## 6. Security Considerations
- **Authentication:** Access to the endpoint will be managed by the global authentication middleware. While guests can access the endpoint, their view is restricted.
- **Authorization:** This is the most critical security aspect. The `ReservationsService` must enforce strict, role-based access control:
    - **Guest:** Can only view reservations where `is_public` is true. All `details` will be `null`. No propositions are returned.
    - **Member:** Can view public/joinable reservations and their own propositions. `details` are `null` unless they are the coordinator.
    - **Admin/Range Admin:** Can view all reservations and all propositions with full details.
- **Input Validation:** All incoming parameters (`rangeSlug`, `startDate`, `endDate`) will be rigorously validated in the worker using `zod` to prevent injection attacks and malformed queries.

## 7. Performance Considerations
- **Database Indexing:** To ensure fast query performance, indexes should be created on the `event_date` and `range_id` columns for both the `reservations_propositions` and `reservations_reservations` tables. A new database migration file should be created for this purpose.
- **Query Optimization:** Fetching propositions and reservations will be done in two separate, optimized queries rather than a complex join, to keep the database load minimal.

## 8. Implementation Steps
1.  **Common Types:** Create the file `src/common/src/dto/calendar.dto.ts` and define `PropositionEventDto`, `ReservationEventDto`, and `CalendarEventsDto`.
2.  **Service Interface:** Update `src/common/src/interfaces/reservations.service.interface.ts` to include the new method: `getCalendarEvents(query: GetCalendarEventsQuery): Promise<Result<CalendarEventsDto, Error>>;`.
3.  **Repository Logic:**
    - In `src/reservations/domain/reservations.repository.ts`, add method signatures for fetching propositions and reservations by date range and range ID.
    - Implement these methods in `src/reservations/infrastructure/reservations.db.repository.ts`.
4.  **Service Logic:**
    - Create the `ReservationsService` at `src/reservations/application/reservations.service.ts` if it doesn't exist.
    - Implement the `getCalendarEvents` method. This will involve:
        - Calling the `AdminRepository` to get the range ID.
        - Calling the new repository methods to fetch data.
        - Implementing the role-based filtering and data mapping logic.
5.  **Worker Endpoint:**
    - Create the file `src/worker/src/endpoints/v1/ranges/get-events.ts`.
    - Implement the `OpenAPIRoute` class.
    - Define the `zod` schema for request parameter validation, including a check that `endDate` >= `startDate`.
    - Implement the `handle` method to call the `ReservationsService` and return the HTTP response.
6.  **Routing:** Add the new endpoint route to the main router file in the `worker` module.
7.  **Testing:** Create an E2E test file `tests/reservations/get-events.e2e.test.ts` that covers:
    - Successful data retrieval for each user role (Guest, Member, Coordinator).
    - Correct data filtering and shaping for each role.
    - Error handling for invalid date formats.
    - Error handling for a non-existent `rangeSlug` (404).
