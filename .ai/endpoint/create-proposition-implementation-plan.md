# API Endpoint Implementation Plan: `POST /api/v1/ranges/{rangeSlug}/propositions`

## 1. Endpoint Overview
This endpoint allows authenticated users (Guest or Member) to create a new proposition for a shooting session at a specific range. The proposition includes the desired date, time, number of participants, and requested tracks. The system validates the request against business rules, such as time conflicts and range availability.

## 2. Request Details
- **HTTP Method**: `POST`
- **URL Structure**: `/api/v1/ranges/{rangeSlug}/propositions`
- **Parameters**:
  - **Required**:
    - `rangeSlug` (string, path): The unique slug identifying the shooting range.
- **Request Body**: The body must be a JSON object conforming to the `CreatePropositionCommand` structure.

  ```json
  {
    "eventDate": "2025-10-15",
    "startTime": "14:00",
    "endTime": "15:00",
    "numParticipants": 5,
    "tracksRequested": 2
  }
  ```

## 3. Used Types
- **Request Body DTO**: `CreatePropositionCommand` from `@strzel-sobie/common`.
- **Response Body DTO**: `CreatedPropositionDto` from `@strzel-sobie/common`.
- **Zod Schema**: A `zod` schema will be defined within the endpoint file in the `worker` module to validate the incoming request body and path parameters.

## 4. Response Details
- **Success**:
  - **Status Code**: `201 Created`
  - **Payload**: A JSON object representing the newly created proposition's basic details.
    ```json
    {
      "id": 1,
      "userId": 2,
      "rangeId": 1,
      "status": "open"
    }
    ```
- **Errors**:
  - **Status Code**: `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `500 Internal Server Error`.
  - **Payload**: A standardized error JSON object.

## 5. Data Flow
1.  The `worker` receives the `POST` request.
2.  Authentication middleware verifies the user's session from the request headers and retrieves user data (including `userId`) from the Cloudflare KV session store. If auth fails, it returns `401 Unauthorized`.
3.  The endpoint handler in the `worker` validates the `rangeSlug` path parameter and the request body against a `zod` schema. If validation fails, it returns a `400 Bad Request` error.
4.  The handler retrieves the `ReservationsService` and `AdminService` from the context.
5.  It calls the `AdminService` to fetch the `ShootingRange` details using the `rangeSlug` to get the `rangeId` and verify its existence and capacity.
6.  The handler calls the `reservationsService.createProposition` method, passing the validated `CreatePropositionCommand`, `userId`, and `rangeId`.
7.  The `ReservationsService` performs business logic validation:
    - Checks that `endTime` is after `startTime`.
    - Checks that the `eventDate` is not in the past.
    - Verifies that `tracksRequested` does not exceed the range's available tracks.
    - Checks for scheduling conflicts with existing reservations or propositions.
8.  If business validation passes, the service creates a `Proposition` domain entity.
9.  The service calls the `ReservationsRepository` to persist the new proposition entity into the `reservations_propositions` table. The initial `status` will be "open".
10. The repository maps the domain entity to a database model and executes the `INSERT` query.
11. The service receives the persisted data, maps it to the `CreatedPropositionDto`, and returns it inside a `Success` result object.
12. The `worker` endpoint handler receives the `Success` result, formats the `CreatedPropositionDto` into a JSON response, and sends it with a `201 Created` status.
13. If any step fails, the service returns an `Error` result, which the worker maps to an appropriate 4xx or 5xx HTTP response.

## 6. Security Considerations
- **Authentication**: The endpoint must be protected by authentication middleware. The user's identity (`userId`) must be securely retrieved from the session, not from the request body.
- **Authorization**: Any authenticated user (Guest, Member) is permitted to create a proposition. No special roles are required.
- **Input Validation**: Rigorous validation of the request body and `rangeSlug` using `zod` is mandatory to prevent invalid data, injection attacks, and other vulnerabilities.
- **Data Ownership**: The `userId` for the new proposition must be set to the ID of the currently authenticated user, ensuring users can only create propositions for themselves.

## 7. Error Handling
The endpoint will return the following HTTP status codes for specific error scenarios:
- **`400 Bad Request`**:
  - The request body fails `zod` validation (e.g., missing fields, incorrect data types).
  - The `rangeSlug` does not correspond to an existing shooting range.
  - Business logic validation fails (e.g., `eventDate` in the past, `startTime` after `endTime`, `tracksRequested` > range capacity, time slot conflict).
- **`401 Unauthorized`**:
  - The request lacks a valid authentication token or the session has expired.
- **`403 Forbidden`**:
  - (Future use) The user is authenticated but lacks the specific permissions to perform this action (e.g., a banned user).
- **`500 Internal Server Error`**:
  - An unexpected error occurs within the service or repository (e.g., database connection failure).

## 8. Performance Considerations
- Database queries should be optimized. The check for scheduling conflicts should be performed with an efficient query that filters by `range_id` and the relevant time window.
- The lookup of range details by `rangeSlug` should be indexed for fast retrieval.
- The overall latency should be low, as this is a standard transactional endpoint.

## 9. Implementation Steps
1.  **Worker (`src/worker`):**
    - Create the endpoint file at `src/worker/src/endpoints/v1/ranges/createProposition.ts`.
    - Implement the class `CreatePropositionRoute` extending `OpenAPIRoute`.
    - Define the `zod` schemas for the path parameters (`rangeSlug`) and the request body (`CreatePropositionCommand`).
    - Define the OpenAPI `schema` property with summary, description, tags, request, and response definitions.
    - Implement the `handle` method:
        - Add logic to parse and validate the request.
        - Get the `userId` from the context (provided by auth middleware).
        - Get `reservationsService` and `adminService` from the context.
        - Call the `adminService` to resolve `rangeSlug` to `rangeId`.
        - Call `reservationsService.createProposition` with the required arguments.
        - Handle the `Result` object, returning `c.json()` with the correct payload and status code (`201` for success, 4xx/5xx for errors).
2.  **Reservations Module (`src/reservations`):**
    - In `src/reservations/application/reservations.service.ts`, add the `createProposition` method.
    - This method will accept `CreatePropositionCommand`, `userId`, and `rangeId`.
    - Implement all business logic validations as described in the "Data Flow" section.
    - If validation succeeds, create and save the proposition via the repository.
    - Return a `Result<CreatedPropositionDto, Error>`.
3.  **Common Module (`src/common`):**
    - Verify that `CreatePropositionCommand` and `CreatedPropositionDto` in `src/common/src/dto/propositions.dto.ts` are correctly defined and sufficient. No changes are expected.
4.  **Testing (`/tests`):**
    - Create a new E2E test file `tests/reservations/create-proposition.e2e.test.ts`.
    - Add test cases for:
        - Successful proposition creation (returns `201`).
        - Failure when the request body is invalid (returns `400`).
        - Failure when unauthenticated (returns `401`).
        - Failure due to business logic (e.g., time conflict, range not found) (returns `400`).
